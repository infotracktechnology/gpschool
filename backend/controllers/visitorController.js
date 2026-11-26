import { query } from '../config/database.js';

/**
 * Generate unique Pass Number: VP-YYYYMMDD-XXXX
 */
const generatePassNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `VP-${dateStr}-`;

  const [latest] = await query(
    `SELECT pass_number FROM visitor_passes
     WHERE pass_number LIKE ?
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (latest && latest.pass_number) {
    const parts = latest.pass_number.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

/**
 * Generate unique Appointment Number: APT-YYYYMMDD-XXXX
 */
const generateAppointmentNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `APT-${dateStr}-`;

  const [latest] = await query(
    `SELECT appointment_number FROM visitor_appointments
     WHERE appointment_number LIKE ?
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (latest && latest.appointment_number) {
    const parts = latest.appointment_number.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

/**
 * GET /api/visitors/dashboard
 * Live gate KPIs, active & overstayed visitors, upcoming appointments, and purpose breakdown
 */
export const getVisitorDashboard = async (_req, res, next) => {
  try {
    const [kpis] = await query(`
      SELECT
        COUNT(*) AS total_today,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_now,
        SUM(CASE WHEN status = 'checked_out' AND DATE(check_in_time) = CURDATE() THEN 1 ELSE 0 END) AS checked_out_today,
        SUM(CASE WHEN status = 'active' AND TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1 ELSE 0 END) AS overstayed_now
      FROM visitor_passes
      WHERE DATE(check_in_time) = CURDATE() OR status = 'active'
    `);

    const [aptStats] = await query(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_appointments,
        SUM(CASE WHEN appointment_date = CURDATE() AND status IN ('pending','approved') THEN 1 ELSE 0 END) AS today_appointments
      FROM visitor_appointments
    `);

    const activeVisitors = await query(`
      SELECT *,
        TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) AS elapsed_minutes,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1
          ELSE 0
        END AS is_overstayed
      FROM visitor_passes
      WHERE status = 'active'
      ORDER BY is_overstayed DESC, check_in_time DESC
      LIMIT 15
    `);

    const todayAppointments = await query(`
      SELECT * FROM visitor_appointments
      WHERE appointment_date >= CURDATE() AND status IN ('pending','approved')
      ORDER BY appointment_date ASC, appointment_time ASC
      LIMIT 10
    `);

    const purposeBreakdown = await query(`
      SELECT COALESCE(purpose, 'General') AS purpose, COUNT(*) AS count
      FROM visitor_passes
      WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY purpose
      ORDER BY count DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      kpis: {
        total_today: Number(kpis?.total_today || 0),
        active_now: Number(kpis?.active_now || 0),
        checked_out_today: Number(kpis?.checked_out_today || 0),
        overstayed_now: Number(kpis?.overstayed_now || 0),
        pending_appointments: Number(aptStats?.pending_appointments || 0),
        today_appointments: Number(aptStats?.today_appointments || 0),
      },
      activeVisitors,
      todayAppointments,
      purposeBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/lookup-returning?q=...
 * Lookup returning visitors by phone or name to prefill gate entry fields
 */
export const lookupReturningVisitor = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, visitors: [] });
    }
    const term = `%${q.trim()}%`;
    const visitors = await query(
      `SELECT v.*,
              (SELECT vp.vehicle_type FROM visitor_passes vp WHERE vp.visitor_phone = v.phone ORDER BY vp.id DESC LIMIT 1) AS last_vehicle_type,
              (SELECT vp.vehicle_number FROM visitor_passes vp WHERE vp.visitor_phone = v.phone ORDER BY vp.id DESC LIMIT 1) AS last_vehicle_number,
              (SELECT COUNT(*) FROM visitor_passes vp WHERE vp.visitor_phone = v.phone) AS total_visits
       FROM visitors v
       WHERE v.phone LIKE ? OR v.name LIKE ?
       ORDER BY v.updated_at DESC
       LIMIT 10`,
      [term, term]
    );
    res.json({ success: true, visitors });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/visitors/entry
 * Register a new visitor and generate visitor pass
 */
export const registerVisitorEntry = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      photo_url,
      visitor_type = 'Guest',
      address,
      id_proof_type,
      id_proof_number,
      badge_number,
      appointment_id,
      purpose,
      purpose_details,
      person_to_meet_id,
      person_to_meet_name,
      department,
      student_id,
      student_name,
      student_class_section,
      vehicle_type = 'None',
      vehicle_number,
      accompanying_count = 0,
      expected_duration_minutes = 60,
    } = req.body;

    if (!name || !phone || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Name, Phone Number, and Purpose of Visit are required.',
      });
    }

    // 1. Find or create master visitor
    let [visitor] = await query('SELECT id FROM visitors WHERE phone = ? LIMIT 1', [phone]);
    let visitorId;
    if (visitor) {
      visitorId = visitor.id;
      await query(
        `UPDATE visitors
         SET name = ?,
             email = COALESCE(?, email),
             photo_url = COALESCE(?, photo_url),
             address = COALESCE(?, address),
             visitor_type = ?,
             id_proof_type = COALESCE(?, id_proof_type),
             id_proof_number = COALESCE(?, id_proof_number)
         WHERE id = ?`,
        [
          name,
          email || null,
          photo_url || null,
          address || null,
          visitor_type,
          id_proof_type || null,
          id_proof_number || null,
          visitorId,
        ]
      );
    } else {
      const result = await query(
        `INSERT INTO visitors (name, phone, email, photo_url, visitor_type, address, id_proof_type, id_proof_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          phone,
          email || null,
          photo_url || null,
          visitor_type,
          address || null,
          id_proof_type || null,
          id_proof_number || null,
        ]
      );
      visitorId = result.insertId;
    }

    // 2. Generate pass number
    const passNumber = await generatePassNumber();

    // 3. Create visitor pass record
    const passInsert = await query(
      `INSERT INTO visitor_passes (
        pass_number, visitor_id, visitor_name, visitor_phone, photo_url,
        id_proof_type, id_proof_number, badge_number, appointment_id,
        purpose, purpose_details, person_to_meet_id, person_to_meet_name, department,
        student_id, student_name, student_class_section, vehicle_type, vehicle_number,
        accompanying_count, expected_duration_minutes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        passNumber,
        visitorId,
        name,
        phone,
        photo_url || null,
        id_proof_type || null,
        id_proof_number || null,
        badge_number || null,
        appointment_id || null,
        purpose,
        purpose_details || null,
        person_to_meet_id || null,
        person_to_meet_name || null,
        department || null,
        student_id || null,
        student_name || null,
        student_class_section || null,
        vehicle_type || 'None',
        vehicle_number || null,
        parseInt(accompanying_count, 10) || 0,
        parseInt(expected_duration_minutes, 10) || 60,
        req.user?.id || null,
      ]
    );

    // If converted from an appointment, mark appointment completed
    if (appointment_id) {
      await query(
        `UPDATE visitor_appointments SET status = 'completed' WHERE id = ?`,
        [appointment_id]
      );
    }

    const [createdPass] = await query(
      'SELECT * FROM visitor_passes WHERE id = ? LIMIT 1',
      [passInsert.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Visitor pass issued successfully',
      pass: createdPass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/visitors/passes/:id
 * Update an existing visitor pass & visitor contact profile
 */
export const updateVisitorPass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM visitor_passes WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Visitor pass not found' });
    }

    const {
      name,
      phone,
      email,
      photo_url,
      visitor_type,
      address,
      id_proof_type,
      id_proof_number,
      badge_number,
      purpose,
      purpose_details,
      person_to_meet_id,
      person_to_meet_name,
      department,
      student_id,
      student_name,
      student_class_section,
      vehicle_type,
      vehicle_number,
      accompanying_count,
      expected_duration_minutes,
      status,
      exit_remarks,
    } = req.body;

    if (!name || !phone || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Visitor Name, Phone Number, and Purpose are required.',
      });
    }

    if (existing.visitor_id) {
      await query(
        `UPDATE visitors
         SET name = ?, phone = ?, email = ?, photo_url = ?, visitor_type = ?, address = ?,
             id_proof_type = ?, id_proof_number = ?
         WHERE id = ?`,
        [
          name,
          phone,
          email || null,
          photo_url !== undefined ? photo_url || null : existing.photo_url,
          visitor_type || 'Guest',
          address || null,
          id_proof_type || null,
          id_proof_number || null,
          existing.visitor_id,
        ]
      );
    }

    await query(
      `UPDATE visitor_passes
       SET visitor_name = ?, visitor_phone = ?, photo_url = ?,
           id_proof_type = ?, id_proof_number = ?, badge_number = ?,
           purpose = ?, purpose_details = ?, person_to_meet_id = ?, person_to_meet_name = ?,
           department = ?, student_id = ?, student_name = ?, student_class_section = ?,
           vehicle_type = ?, vehicle_number = ?, accompanying_count = ?,
           expected_duration_minutes = ?, status = ?, exit_remarks = ?
       WHERE id = ?`,
      [
        name,
        phone,
        photo_url !== undefined ? photo_url || null : existing.photo_url,
        id_proof_type || null,
        id_proof_number || null,
        badge_number || null,
        purpose,
        purpose_details || null,
        person_to_meet_id || null,
        person_to_meet_name || null,
        department || null,
        student_id || null,
        student_name || null,
        student_class_section || null,
        vehicle_type || 'None',
        vehicle_number || null,
        parseInt(accompanying_count, 10) || 0,
        parseInt(expected_duration_minutes, 10) || 60,
        status || existing.status,
        exit_remarks !== undefined ? exit_remarks || null : existing.exit_remarks,
        id,
      ]
    );

    const [updatedPass] = await query('SELECT * FROM visitor_passes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Visitor pass updated successfully', pass: updatedPass });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/visitors/passes/:id
 * Delete a visitor pass record
 */
export const deleteVisitorPass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT id FROM visitor_passes WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Visitor pass not found' });
    }
    await query('DELETE FROM visitor_passes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Visitor pass deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/active
 * Get currently active visitors inside campus with overstay calculations
 */
export const getActiveVisitors = async (req, res, next) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT *,
        TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) AS elapsed_minutes,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1
          ELSE 0
        END AS is_overstayed
      FROM visitor_passes
      WHERE status = 'active'
    `;
    const params = [];

    if (search) {
      sql += ` AND (pass_number LIKE ? OR visitor_name LIKE ? OR visitor_phone LIKE ? OR person_to_meet_name LIKE ? OR badge_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY check_in_time DESC';

    const visitors = await query(sql, params);
    res.json({ success: true, count: visitors.length, visitors });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/visitors/exit/:identifier
 * Check out a visitor by pass number, pass ID, or phone
 */
export const checkOutVisitor = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const { exit_remarks } = req.body;

    const [pass] = await query(
      `SELECT * FROM visitor_passes
       WHERE (id = ? OR pass_number = ? OR visitor_phone = ?) AND status = 'active'
       ORDER BY id DESC LIMIT 1`,
      [identifier, identifier, identifier]
    );

    if (!pass) {
      return res.status(404).json({
        success: false,
        message: 'No active visitor pass found for the provided identifier.',
      });
    }

    await query(
      `UPDATE visitor_passes
       SET check_out_time = NOW(), status = 'checked_out', exit_remarks = ?
       WHERE id = ?`,
      [exit_remarks || null, pass.id]
    );

    const [updatedPass] = await query('SELECT * FROM visitor_passes WHERE id = ?', [pass.id]);

    res.json({
      success: true,
      message: `Visitor ${pass.visitor_name} checked out successfully.`,
      pass: updatedPass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/passes
 * List all passes with filtering
 */
export const getVisitorPasses = async (req, res, next) => {
  try {
    const { search, status, date, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let sql = `
      SELECT *,
        TIMESTAMPDIFF(MINUTE, check_in_time, COALESCE(check_out_time, NOW())) AS duration_minutes,
        CASE
          WHEN status = 'active' AND TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1
          ELSE 0
        END AS is_overstayed
      FROM visitor_passes
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND DATE(check_in_time) = ?';
      params.push(date);
    }

    if (search) {
      sql += ' AND (pass_number LIKE ? OR visitor_name LIKE ? OR visitor_phone LIKE ? OR person_to_meet_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY check_in_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const passes = await query(sql, params);

    let countSql = 'SELECT COUNT(*) AS total FROM visitor_passes WHERE 1=1';
    const countParams = [];
    if (status && status !== 'all') {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (date) {
      countSql += ' AND DATE(check_in_time) = ?';
      countParams.push(date);
    }
    if (search) {
      countSql += ' AND (pass_number LIKE ? OR visitor_name LIKE ? OR visitor_phone LIKE ? OR person_to_meet_name LIKE ?)';
      const term = `%${search}%`;
      countParams.push(term, term, term, term);
    }
    const [countResult] = await query(countSql, countParams);

    res.json({
      success: true,
      passes,
      total: countResult?.total || 0,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/passes/:idOrPassNumber
 * Get full pass details enriched with master visitor fields for Edit Page
 */
export const getPassDetails = async (req, res, next) => {
  try {
    const { idOrPassNumber } = req.params;
    const [pass] = await query(
      `SELECT vp.*,
        v.email, v.visitor_type, v.address,
        COALESCE(vp.id_proof_type, v.id_proof_type) AS id_proof_type,
        COALESCE(vp.id_proof_number, v.id_proof_number) AS id_proof_number,
        TIMESTAMPDIFF(MINUTE, vp.check_in_time, COALESCE(vp.check_out_time, NOW())) AS duration_minutes,
        CASE
          WHEN vp.status = 'active' AND TIMESTAMPDIFF(MINUTE, vp.check_in_time, NOW()) > vp.expected_duration_minutes THEN 1
          ELSE 0
        END AS is_overstayed
       FROM visitor_passes vp
       LEFT JOIN visitors v ON vp.visitor_id = v.id
       WHERE vp.id = ? OR vp.pass_number = ? LIMIT 1`,
      [idOrPassNumber, idOrPassNumber]
    );

    if (!pass) {
      return res.status(404).json({ success: false, message: 'Visitor pass not found' });
    }

    res.json({ success: true, pass });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/appointments
 * List appointments
 */
export const getAppointments = async (req, res, next) => {
  try {
    const { status, date, host_id, search } = req.query;

    let sql = 'SELECT * FROM visitor_appointments WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND appointment_date = ?';
      params.push(date);
    }

    if (host_id) {
      sql += ' AND person_to_meet_id = ?';
      params.push(host_id);
    }

    if (search) {
      sql += ' AND (appointment_number LIKE ? OR visitor_name LIKE ? OR visitor_phone LIKE ? OR person_to_meet_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY appointment_date DESC, appointment_time ASC';

    const appointments = await query(sql, params);
    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/appointments/:id
 * Fetch a single appointment by ID
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [appointment] = await query('SELECT * FROM visitor_appointments WHERE id = ? LIMIT 1', [id]);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/visitors/appointments
 * Create a new appointment
 */
export const createAppointment = async (req, res, next) => {
  try {
    const {
      visitor_name,
      visitor_phone,
      visitor_email,
      person_to_meet_id,
      person_to_meet_name,
      department,
      appointment_date,
      appointment_time,
      purpose,
      notes,
      status = 'pending',
    } = req.body;

    if (!visitor_name || !visitor_phone || !person_to_meet_name || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Visitor Name, Phone, Host Name, Appointment Date & Time are required.',
      });
    }

    const aptNumber = await generateAppointmentNumber();

    const insertResult = await query(
      `INSERT INTO visitor_appointments (
        appointment_number, visitor_name, visitor_phone, visitor_email,
        person_to_meet_id, person_to_meet_name, department, appointment_date,
        appointment_time, purpose, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        aptNumber,
        visitor_name,
        visitor_phone,
        visitor_email || null,
        person_to_meet_id || null,
        person_to_meet_name,
        department || null,
        appointment_date,
        appointment_time,
        purpose || 'General Meeting',
        notes || null,
        status,
        req.user?.id || null,
      ]
    );

    const [created] = await query('SELECT * FROM visitor_appointments WHERE id = ?', [
      insertResult.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      appointment: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/visitors/appointments/:id
 * Full update for an existing appointment
 */
export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM visitor_appointments WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const {
      visitor_name,
      visitor_phone,
      visitor_email,
      person_to_meet_id,
      person_to_meet_name,
      department,
      appointment_date,
      appointment_time,
      purpose,
      notes,
      status,
      staff_remarks,
    } = req.body;

    if (!visitor_name || !visitor_phone || !person_to_meet_name || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Visitor Name, Phone, Host Name, Appointment Date & Time are required.',
      });
    }

    await query(
      `UPDATE visitor_appointments
       SET visitor_name = ?, visitor_phone = ?, visitor_email = ?,
           person_to_meet_id = ?, person_to_meet_name = ?, department = ?,
           appointment_date = ?, appointment_time = ?, purpose = ?, notes = ?,
           status = ?, staff_remarks = ?
       WHERE id = ?`,
      [
        visitor_name,
        visitor_phone,
        visitor_email || null,
        person_to_meet_id || null,
        person_to_meet_name,
        department || null,
        appointment_date,
        appointment_time,
        purpose || 'General Meeting',
        notes || null,
        status || existing.status,
        staff_remarks !== undefined ? staff_remarks || null : existing.staff_remarks,
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM visitor_appointments WHERE id = ?', [id]);
    res.json({ success: true, message: 'Appointment updated successfully', appointment: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/visitors/appointments/:id
 * Delete an appointment
 */
export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT id FROM visitor_appointments WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    await query('DELETE FROM visitor_appointments WHERE id = ?', [id]);
    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/visitors/appointments/:id/status
 * Update appointment status (approve/reject/complete/cancel)
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, staff_remarks } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const [apt] = await query('SELECT * FROM visitor_appointments WHERE id = ?', [id]);
    if (!apt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    await query(
      `UPDATE visitor_appointments
       SET status = ?, staff_remarks = COALESCE(?, staff_remarks), approved_by = ?
       WHERE id = ?`,
      [status, staff_remarks || null, req.user?.id || null, id]
    );

    const [updated] = await query('SELECT * FROM visitor_appointments WHERE id = ?', [id]);
    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/hosts
 * Person to Meet lookup directory
 */
export const getHostsDirectory = async (req, res, next) => {
  try {
    const { department, search } = req.query;

    let sql = `
      SELECT
        sp.id AS staff_id,
        sp.emp_no,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS full_name,
        sp.designation,
        sp.department,
        sp.phone,
        sp.email,
        sp.avatar_url,
        COALESCE(vhe.cabin_room, 'Staff Room') AS cabin_room,
        COALESCE(vhe.intercom, '101') AS intercom,
        COALESCE(vhe.visiting_hours, '2:30 PM - 3:30 PM') AS visiting_hours,
        COALESCE(vhe.is_available, 1) AS is_available
      FROM staff_profiles sp
      LEFT JOIN visitor_host_extensions vhe ON sp.id = vhe.staff_id
      WHERE sp.status = 'active'
    `;
    const params = [];

    if (department && department !== 'all') {
      sql += ' AND sp.department = ?';
      params.push(department);
    }

    if (search) {
      sql += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.designation LIKE ? OR sp.department LIKE ? OR sp.emp_no LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY sp.department ASC, sp.first_name ASC';

    const hosts = await query(sql, params);
    const departments = [...new Set(hosts.map((h) => h.department).filter(Boolean))];

    res.json({ success: true, count: hosts.length, departments, hosts });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/hosts/:staffId
 * Fetch single host details & extension configuration
 */
export const getHostById = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const [host] = await query(
      `SELECT
        sp.id AS staff_id,
        sp.emp_no,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS full_name,
        sp.designation,
        sp.department,
        sp.phone,
        sp.email,
        sp.avatar_url,
        COALESCE(vhe.cabin_room, 'Staff Room') AS cabin_room,
        COALESCE(vhe.intercom, '101') AS intercom,
        COALESCE(vhe.visiting_hours, '2:30 PM - 3:30 PM') AS visiting_hours,
        COALESCE(vhe.is_available, 1) AS is_available
       FROM staff_profiles sp
       LEFT JOIN visitor_host_extensions vhe ON sp.id = vhe.staff_id
       WHERE sp.id = ? LIMIT 1`,
      [staffId]
    );
    if (!host) {
      return res.status(404).json({ success: false, message: 'Host staff profile not found' });
    }
    res.json({ success: true, host });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/visitors/hosts/:staffId/extension
 * Update host extension & cabin details
 */
export const updateHostExtension = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { cabin_room, intercom, visiting_hours, is_available } = req.body;

    await query(
      `INSERT INTO visitor_host_extensions (staff_id, cabin_room, intercom, visiting_hours, is_available)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       cabin_room = VALUES(cabin_room),
       intercom = VALUES(intercom),
       visiting_hours = VALUES(visiting_hours),
       is_available = VALUES(is_available)`,
      [
        staffId,
        cabin_room || 'Staff Room',
        intercom || '101',
        visiting_hours || '2:30 PM - 3:30 PM',
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
      ]
    );

    res.json({ success: true, message: 'Host details updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/history
 * Visitor history logs with multi-filters and analytics
 */
export const getVisitorHistory = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      status,
      purpose,
      department,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let sql = `
      SELECT *,
        TIMESTAMPDIFF(MINUTE, check_in_time, COALESCE(check_out_time, NOW())) AS duration_minutes,
        CASE
          WHEN status = 'active' AND TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1
          ELSE 0
        END AS is_overstayed
      FROM visitor_passes
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND DATE(check_in_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND DATE(check_in_time) <= ?';
      params.push(endDate);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (purpose && purpose !== 'all') {
      sql += ' AND purpose = ?';
      params.push(purpose);
    }
    if (department && department !== 'all') {
      sql += ' AND department = ?';
      params.push(department);
    }
    if (search) {
      sql += ' AND (pass_number LIKE ? OR visitor_name LIKE ? OR visitor_phone LIKE ? OR person_to_meet_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY check_in_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const history = await query(sql, params);

    const [kpis] = await query(`
      SELECT
        COUNT(*) AS total_visits,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS in_campus,
        SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) AS checked_out,
        SUM(CASE WHEN status = 'active' AND TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1 ELSE 0 END) AS overstayed,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, check_in_time, COALESCE(check_out_time, NOW()))), 0) AS avg_duration_minutes
      FROM visitor_passes
    `);

    res.json({
      success: true,
      kpis: {
        total_visits: kpis?.total_visits || 0,
        in_campus: kpis?.in_campus || 0,
        checked_out: kpis?.checked_out || 0,
        overstayed: kpis?.overstayed || 0,
        avg_duration_minutes: kpis?.avg_duration_minutes || 0,
      },
      history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visitors/students-search
 * Quick lookup for students when purpose is parent meeting or early pick-up
 */
export const searchStudents = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, students: [] });
    }

    const term = `%${q}%`;
    const students = await query(
      `SELECT s.id, s.admission_no, s.student_name, s.father_name, s.mother_name, s.father_phone,
              COALESCE(c.name, '') AS class_name,
              COALESCE(bcs.name, '') AS section_name,
              TRIM(CONCAT_WS(' - ', c.name, bcs.name)) AS class_section
       FROM students s
       LEFT JOIN student_enrollments se ON s.id = se.student_id AND (se.enrollment_status = 'current' OR se.enrollment_status = 'active')
       LEFT JOIN classes c ON se.class_id = c.id
       LEFT JOIN branch_class_sections bcs ON se.section_id = bcs.id
       WHERE s.student_name LIKE ? OR s.admission_no LIKE ? OR s.father_phone LIKE ?
       LIMIT 10`,
      [term, term, term]
    );

    res.json({ success: true, students });
  } catch (error) {
    next(error);
  }
};
