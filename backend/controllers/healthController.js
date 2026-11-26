import { query } from '../config/database.js';

/**
 * Generate sequential daily document code: PREFIX-YYYYMMDD-XXXX
 */
const generateDailyCode = async (prefixName, table, column) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `${prefixName}-${dateStr}-`;

  const [latest] = await query(
    `SELECT \`${column}\` AS code FROM \`${table}\`
     WHERE \`${column}\` LIKE ?
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (latest && latest.code) {
    const parts = latest.code.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

/**
 * Derive inventory status from quantity, reorder threshold, and expiry date
 */
const computeInventoryStatus = (quantity, reorderLevel = 10, expiryDate = null) => {
  if (expiryDate) {
    const exp = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(exp.getTime()) && exp < today) return 'expired';
  }
  const qty = Number(quantity) || 0;
  if (qty <= 0) return 'out_of_stock';
  if (qty <= (Number(reorderLevel) || 10)) return 'low_stock';
  return 'in_stock';
};

/**
 * GET /api/health/dashboard
 * Campus Infirmary Analytics, Live Resting Bay, Stock Alerts & Follow-Ups
 */
export const getHealthDashboard = async (_req, res, next) => {
  try {
    const [visitStats] = await query(`
      SELECT
        SUM(CASE WHEN visit_date = CURDATE() THEN 1 ELSE 0 END) AS today_visits,
        SUM(CASE WHEN disposition = 'resting_in_bay' THEN 1 ELSE 0 END) AS in_bay_now,
        SUM(CASE WHEN visit_date = CURDATE() AND disposition = 'sent_home' THEN 1 ELSE 0 END) AS sent_home_today,
        SUM(CASE WHEN visit_date = CURDATE() AND disposition = 'sent_back_to_class' THEN 1 ELSE 0 END) AS back_to_class_today
      FROM infirmary_visits
    `);

    const [flagStats] = await query(`
      SELECT
        SUM(CASE WHEN known_allergies IS NOT NULL AND TRIM(known_allergies) <> '' AND LOWER(known_allergies) <> 'none' THEN 1 ELSE 0 END) AS allergy_flags,
        SUM(CASE WHEN chronic_conditions IS NOT NULL AND TRIM(chronic_conditions) <> '' AND LOWER(chronic_conditions) <> 'none' THEN 1 ELSE 0 END) AS chronic_flags,
        COUNT(*) AS total_dossiers
      FROM health_profiles
    `);

    const activeBays = await query(`
      SELECT * FROM infirmary_visits
      WHERE disposition = 'resting_in_bay'
      ORDER BY id DESC
      LIMIT 12
    `);

    const recentVisits = await query(`
      SELECT * FROM infirmary_visits
      ORDER BY visit_date DESC, id DESC
      LIMIT 8
    `);

    const visitTypeBreakdown = await query(`
      SELECT visit_type, COUNT(*) AS count
      FROM infirmary_visits
      WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY visit_type
      ORDER BY count DESC
    `);

    const inventoryAlerts = await query(`
      SELECT * FROM infirmary_medicine_inventory
      WHERE status IN ('low_stock', 'out_of_stock', 'expired')
         OR quantity_available <= reorder_level
         OR (expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY))
      ORDER BY status DESC, quantity_available ASC
      LIMIT 10
    `);

    const upcomingFollowUps = await query(`
      SELECT * FROM doctor_consultations
      WHERE follow_up_date IS NOT NULL AND follow_up_date >= CURDATE()
      ORDER BY follow_up_date ASC
      LIMIT 8
    `);

    const recentNotifications = await query(`
      SELECT * FROM parent_health_notifications
      ORDER BY notified_at DESC, id DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      kpis: {
        today_visits: Number(visitStats?.today_visits || 0),
        in_bay_now: Number(visitStats?.in_bay_now || 0),
        sent_home_today: Number(visitStats?.sent_home_today || 0),
        back_to_class_today: Number(visitStats?.back_to_class_today || 0),
        allergy_flags: Number(flagStats?.allergy_flags || 0),
        chronic_flags: Number(flagStats?.chronic_flags || 0),
        total_dossiers: Number(flagStats?.total_dossiers || 0),
        inventory_alerts_count: inventoryAlerts.length,
        upcoming_followups_count: upcomingFollowUps.length,
      },
      activeBays,
      recentVisits,
      visitTypeBreakdown,
      inventoryAlerts,
      upcomingFollowUps,
      recentNotifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/visits
 */
export const getInfirmaryVisits = async (req, res, next) => {
  try {
    const { date, disposition, visit_type, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let sql = 'SELECT * FROM infirmary_visits WHERE 1=1';
    const params = [];

    if (date) {
      sql += ' AND visit_date = ?';
      params.push(date);
    }
    if (disposition && disposition !== 'all') {
      sql += ' AND disposition = ?';
      params.push(disposition);
    }
    if (visit_type && visit_type !== 'all') {
      sql += ' AND visit_type = ?';
      params.push(visit_type);
    }
    if (search) {
      sql += ' AND (visit_number LIKE ? OR patient_name LIKE ? OR chief_complaint LIKE ? OR class_section LIKE ? OR department LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const visits = await query(sql, params);

    const [counts] = await query(`
      SELECT
        COUNT(*) AS total_visits,
        SUM(CASE WHEN disposition = 'resting_in_bay' THEN 1 ELSE 0 END) AS in_bay,
        SUM(CASE WHEN disposition = 'sent_back_to_class' THEN 1 ELSE 0 END) AS back_to_class,
        SUM(CASE WHEN disposition = 'sent_home' THEN 1 ELSE 0 END) AS sent_home
      FROM infirmary_visits
      WHERE visit_date = CURDATE()
    `);

    const activeBays = await query(`
      SELECT id, visit_number, patient_name, patient_type, class_section, department, bed_number, chief_complaint, visit_time
      FROM infirmary_visits
      WHERE disposition = 'resting_in_bay'
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      visits,
      activeBays,
      todaySummary: {
        total: counts?.total_visits || 0,
        in_bay: counts?.in_bay || 0,
        back_to_class: counts?.back_to_class || 0,
        sent_home: counts?.sent_home || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/visits/:id
 */
export const getInfirmaryVisitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [visit] = await query(
      `SELECT iv.*,
              s.admission_no, s.father_name, s.father_phone, s.mother_phone,
              sp.emp_no,
              COALESCE(hp_s.blood_group, s.blood_group, hp_st.blood_group, sp.blood_group, '—') AS blood_group,
              COALESCE(hp_s.known_allergies, hp_st.known_allergies) AS known_allergies,
              COALESCE(hp_s.emergency_contact_phone, s.emergency_contact_phone, s.father_phone, sp.phone) AS emergency_contact_phone
       FROM infirmary_visits iv
       LEFT JOIN students s ON iv.student_id = s.id
       LEFT JOIN staff_profiles sp ON iv.staff_id = sp.id
       LEFT JOIN health_profiles hp_s ON iv.student_id = hp_s.student_id
       LEFT JOIN health_profiles hp_st ON iv.staff_id = hp_st.staff_id
       WHERE iv.id = ? LIMIT 1`,
      [id]
    );
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Infirmary visit not found' });
    }
    res.json({ success: true, visit });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/health/visits
 */
export const createInfirmaryVisit = async (req, res, next) => {
  try {
    const {
      patient_type = 'student',
      student_id,
      staff_id,
      patient_name,
      class_section,
      department,
      visit_date,
      visit_time,
      visit_type = 'illness',
      chief_complaint,
      treatment_given,
      temperature_f,
      pulse_bpm,
      disposition = 'sent_back_to_class',
      bed_number,
      attended_by = 'School Nurse',
      remarks,
    } = req.body;

    if (!patient_name || !chief_complaint) {
      return res.status(400).json({
        success: false,
        message: 'Patient Name and Chief Complaint are required.',
      });
    }

    const visitNumber = await generateDailyCode('INF', 'infirmary_visits', 'visit_number');
    const vDate = visit_date || new Date().toISOString().slice(0, 10);
    const vTime =
      visit_time ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const insertRes = await query(
      `INSERT INTO infirmary_visits (
        visit_number, patient_type, student_id, staff_id, patient_name,
        class_section, department, visit_date, visit_time, visit_type,
        chief_complaint, treatment_given, temperature_f, pulse_bpm,
        disposition, bed_number, attended_by, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visitNumber,
        patient_type,
        student_id || null,
        staff_id || null,
        patient_name,
        class_section || null,
        department || null,
        vDate,
        vTime,
        visit_type,
        chief_complaint,
        treatment_given || 'Rest and observation',
        temperature_f || null,
        pulse_bpm || null,
        disposition,
        bed_number || null,
        attended_by,
        remarks || null,
      ]
    );

    const [created] = await query('SELECT * FROM infirmary_visits WHERE id = ?', [
      insertRes.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: 'Infirmary visit recorded successfully',
      visit: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/health/visits/:id
 * Full update for an infirmary visit record
 */
export const updateInfirmaryVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM infirmary_visits WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Infirmary visit not found' });
    }

    const {
      patient_type,
      student_id,
      staff_id,
      patient_name,
      class_section,
      department,
      visit_date,
      visit_time,
      visit_type,
      chief_complaint,
      treatment_given,
      temperature_f,
      pulse_bpm,
      disposition,
      bed_number,
      attended_by,
      remarks,
    } = req.body;

    if (!patient_name || !chief_complaint) {
      return res.status(400).json({
        success: false,
        message: 'Patient Name and Chief Complaint are required.',
      });
    }

    await query(
      `UPDATE infirmary_visits
       SET patient_type = ?, student_id = ?, staff_id = ?, patient_name = ?,
           class_section = ?, department = ?, visit_date = ?, visit_time = ?, visit_type = ?,
           chief_complaint = ?, treatment_given = ?, temperature_f = ?, pulse_bpm = ?,
           disposition = ?, bed_number = ?, attended_by = ?, remarks = ?
       WHERE id = ?`,
      [
        patient_type || existing.patient_type,
        student_id !== undefined ? (student_id || null) : existing.student_id,
        staff_id !== undefined ? (staff_id || null) : existing.staff_id,
        patient_name,
        class_section || null,
        department || null,
        visit_date || existing.visit_date,
        visit_time || existing.visit_time,
        visit_type || existing.visit_type,
        chief_complaint,
        treatment_given || 'Rest and observation',
        temperature_f || null,
        pulse_bpm || null,
        disposition || existing.disposition,
        bed_number || null,
        attended_by || existing.attended_by,
        remarks || null,
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM infirmary_visits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Infirmary visit updated successfully', visit: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/health/visits/:id
 */
export const deleteInfirmaryVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT id FROM infirmary_visits WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Infirmary visit not found' });
    }
    await query('DELETE FROM infirmary_visits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Infirmary visit deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/health/visits/:id/disposition
 */
export const updateVisitDisposition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { disposition, remarks, bed_number } = req.body;

    await query(
      `UPDATE infirmary_visits
       SET disposition = ?, remarks = COALESCE(?, remarks), bed_number = COALESCE(?, bed_number)
       WHERE id = ?`,
      [disposition, remarks || null, bed_number || null, id]
    );

    const [updated] = await query('SELECT * FROM infirmary_visits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Disposition updated successfully', visit: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/profiles
 */
export const getHealthProfiles = async (req, res, next) => {
  try {
    const { type = 'student', search } = req.query;

    let sql = '';
    const params = [];

    if (type === 'student') {
      sql = `
        SELECT
          s.id AS student_id,
          s.admission_no,
          s.student_name,
          c.name AS class_name,
          bcs.name AS section_name,
          hp.id AS profile_id,
          COALESCE(hp.blood_group, s.blood_group, 'Unknown') AS blood_group,
          hp.height_cm,
          hp.weight_kg,
          hp.bmi,
          hp.known_allergies,
          hp.chronic_conditions,
          hp.medical_notes,
          hp.identification_mark,
          hp.doctor_name,
          hp.doctor_phone,
          hp.emergency_contact_relation,
          COALESCE(hp.emergency_contact_name, s.emergency_contact_name, s.father_name, 'Parent') AS emergency_contact_name,
          COALESCE(hp.emergency_contact_phone, s.emergency_contact_phone, s.father_phone) AS emergency_contact_phone
        FROM students s
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.enrollment_status = 'current'
        LEFT JOIN classes c ON se.class_id = c.id
        LEFT JOIN branch_class_sections bcs ON se.section_id = bcs.id
        LEFT JOIN health_profiles hp ON s.id = hp.student_id
        WHERE s.status = 'active'
      `;
      if (search) {
        sql += ' AND (s.student_name LIKE ? OR s.admission_no LIKE ? OR c.name LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }
      sql += ' ORDER BY s.student_name ASC LIMIT 150';
    } else {
      sql = `
        SELECT
          sp.id AS staff_id,
          sp.emp_no,
          TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS staff_name,
          sp.department,
          sp.designation,
          hp.id AS profile_id,
          COALESCE(hp.blood_group, sp.blood_group, 'Unknown') AS blood_group,
          hp.height_cm,
          hp.weight_kg,
          hp.bmi,
          hp.known_allergies,
          hp.chronic_conditions,
          hp.medical_notes,
          hp.identification_mark,
          hp.doctor_name,
          hp.doctor_phone,
          hp.emergency_contact_relation,
          COALESCE(hp.emergency_contact_name, sp.emergency_contact_name, 'Family') AS emergency_contact_name,
          COALESCE(hp.emergency_contact_phone, sp.emergency_contact_phone, sp.phone) AS emergency_contact_phone
        FROM staff_profiles sp
        LEFT JOIN health_profiles hp ON sp.id = hp.staff_id
        WHERE sp.status = 'active'
      `;
      if (search) {
        sql += ' AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.emp_no LIKE ? OR sp.department LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term, term);
      }
      sql += ' ORDER BY sp.first_name ASC LIMIT 150';
    }

    const profiles = await query(sql, params);
    res.json({ success: true, count: profiles.length, profiles });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/profiles/:type/:id
 * Full medical dossier + combined timeline (visits, checkups, medicines, consultations, notifications)
 */
export const getHealthProfileDetail = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const isStudent = type === 'student';

    let profile = null;
    if (isStudent) {
      const [row] = await query(
        `SELECT s.id AS entity_id, s.id AS student_id, s.admission_no, s.student_name AS full_name,
                c.name AS class_name, bcs.name AS section_name,
                TRIM(CONCAT_WS(' - ', c.name, bcs.name)) AS class_or_dept,
                hp.id AS profile_id,
                COALESCE(hp.blood_group, s.blood_group, 'Unknown') AS blood_group,
                hp.height_cm, hp.weight_kg, hp.bmi, hp.known_allergies, hp.chronic_conditions,
                hp.medical_notes, hp.identification_mark, hp.doctor_name, hp.doctor_phone,
                hp.emergency_contact_relation,
                COALESCE(hp.emergency_contact_name, s.emergency_contact_name, s.father_name, 'Parent') AS emergency_contact_name,
                COALESCE(hp.emergency_contact_phone, s.emergency_contact_phone, s.father_phone) AS emergency_contact_phone,
                s.father_name, s.father_phone, s.mother_name, s.mother_phone
         FROM students s
         LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.enrollment_status = 'current'
         LEFT JOIN classes c ON se.class_id = c.id
         LEFT JOIN branch_class_sections bcs ON se.section_id = bcs.id
         LEFT JOIN health_profiles hp ON s.id = hp.student_id
         WHERE s.id = ? LIMIT 1`,
        [id]
      );
      profile = row;
    } else {
      const [row] = await query(
        `SELECT sp.id AS entity_id, sp.id AS staff_id, sp.emp_no,
                TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS full_name,
                sp.department, sp.designation,
                COALESCE(sp.department, 'General Staff') AS class_or_dept,
                hp.id AS profile_id,
                COALESCE(hp.blood_group, sp.blood_group, 'Unknown') AS blood_group,
                hp.height_cm, hp.weight_kg, hp.bmi, hp.known_allergies, hp.chronic_conditions,
                hp.medical_notes, hp.identification_mark, hp.doctor_name, hp.doctor_phone,
                hp.emergency_contact_relation,
                COALESCE(hp.emergency_contact_name, sp.emergency_contact_name, 'Family') AS emergency_contact_name,
                COALESCE(hp.emergency_contact_phone, sp.emergency_contact_phone, sp.phone) AS emergency_contact_phone
         FROM staff_profiles sp
         LEFT JOIN health_profiles hp ON sp.id = hp.staff_id
         WHERE sp.id = ? LIMIT 1`,
        [id]
      );
      profile = row;
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Health profile not found' });
    }

    const idCol = isStudent ? 'student_id' : 'staff_id';
    const visits = await query(
      `SELECT * FROM infirmary_visits WHERE ${idCol} = ? ORDER BY visit_date DESC, id DESC LIMIT 30`,
      [id]
    );
    const checkups = isStudent
      ? await query(
          `SELECT * FROM health_checkups WHERE student_id = ? ORDER BY checkup_date DESC, id DESC LIMIT 20`,
          [id]
        )
      : [];
    const consultations = await query(
      `SELECT * FROM doctor_consultations WHERE ${idCol} = ? ORDER BY consultation_date DESC, id DESC LIMIT 20`,
      [id]
    );
    const medicines = await query(
      `SELECT * FROM medicine_dispensing_logs WHERE patient_type = ? AND patient_name = ? ORDER BY dispensed_at DESC LIMIT 20`,
      [type, profile.full_name]
    );
    const notifications = isStudent
      ? await query(
          `SELECT * FROM parent_health_notifications WHERE student_id = ? ORDER BY notified_at DESC, id DESC LIMIT 20`,
          [id]
        )
      : [];

    res.json({
      success: true,
      type,
      profile,
      visits,
      checkups,
      consultations,
      medicines,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/health/profiles/:type/:id
 */
export const updateHealthProfile = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const {
      blood_group,
      height_cm,
      weight_kg,
      known_allergies,
      chronic_conditions,
      medical_notes,
      identification_mark,
      doctor_name,
      doctor_phone,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
    } = req.body;

    let bmi = null;
    if (height_cm && weight_kg && height_cm > 0) {
      bmi = (weight_kg / Math.pow(height_cm / 100, 2)).toFixed(1);
    }

    const isStudent = type === 'student';

    await query(
      `INSERT INTO health_profiles (
        user_type, student_id, staff_id, blood_group, height_cm, weight_kg, bmi,
        known_allergies, chronic_conditions, medical_notes, identification_mark,
        doctor_name, doctor_phone, emergency_contact_name, emergency_contact_phone,
        emergency_contact_relation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      blood_group = VALUES(blood_group),
      height_cm = VALUES(height_cm),
      weight_kg = VALUES(weight_kg),
      bmi = VALUES(bmi),
      known_allergies = VALUES(known_allergies),
      chronic_conditions = VALUES(chronic_conditions),
      medical_notes = VALUES(medical_notes),
      identification_mark = VALUES(identification_mark),
      doctor_name = VALUES(doctor_name),
      doctor_phone = VALUES(doctor_phone),
      emergency_contact_name = VALUES(emergency_contact_name),
      emergency_contact_phone = VALUES(emergency_contact_phone),
      emergency_contact_relation = VALUES(emergency_contact_relation)`,
      [
        type,
        isStudent ? id : null,
        !isStudent ? id : null,
        blood_group || null,
        height_cm || null,
        weight_kg || null,
        bmi,
        known_allergies || null,
        chronic_conditions || null,
        medical_notes || null,
        identification_mark || null,
        doctor_name || null,
        doctor_phone || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        emergency_contact_relation || null,
      ]
    );

    res.json({ success: true, message: 'Health profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/health/profiles/:type/:id
 * Remove custom medical dossier entry from health_profiles
 */
export const deleteHealthProfile = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const isStudent = type === 'student';
    const col = isStudent ? 'student_id' : 'staff_id';
    await query(`DELETE FROM health_profiles WHERE \`${col}\` = ?`, [id]);
    res.json({ success: true, message: 'Custom medical profile cleared successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/checkups
 */
export const getHealthCheckups = async (req, res, next) => {
  try {
    const { student_id, search, date } = req.query;

    let sql = `
      SELECT hc.*,
             s.admission_no,
             COALESCE(hp.blood_group, s.blood_group, '—') AS blood_group,
             hp.known_allergies
      FROM health_checkups hc
      LEFT JOIN students s ON hc.student_id = s.id
      LEFT JOIN health_profiles hp ON hc.student_id = hp.student_id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      sql += ' AND hc.student_id = ?';
      params.push(student_id);
    }
    if (date) {
      sql += ' AND hc.checkup_date = ?';
      params.push(date);
    }
    if (search) {
      sql += ' AND (hc.student_name LIKE ? OR hc.class_section LIKE ? OR hc.examiner_name LIKE ? OR s.admission_no LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY hc.checkup_date DESC, hc.id DESC';

    const checkups = await query(sql, params);
    res.json({ success: true, count: checkups.length, checkups });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/checkups/:id
 */
export const getHealthCheckupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [checkup] = await query(
      `SELECT hc.*,
              s.admission_no,
              COALESCE(hp.blood_group, s.blood_group, '—') AS blood_group,
              hp.known_allergies
       FROM health_checkups hc
       LEFT JOIN students s ON hc.student_id = s.id
       LEFT JOIN health_profiles hp ON hc.student_id = hp.student_id
       WHERE hc.id = ? LIMIT 1`,
      [id]
    );
    if (!checkup) {
      return res.status(404).json({ success: false, message: 'Health checkup record not found' });
    }
    res.json({ success: true, checkup });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/health/checkups
 */
export const createHealthCheckup = async (req, res, next) => {
  try {
    const {
      student_id,
      student_name,
      class_section,
      checkup_date,
      height_cm,
      weight_kg,
      vision_left = '6/6',
      vision_right = '6/6',
      dental_status = 'Healthy',
      ent_status = 'Normal',
      general_fitness = 'Fit',
      doctor_remarks,
      examiner_name = 'Campus Medical Officer',
    } = req.body;

    if (!student_name) {
      return res.status(400).json({ success: false, message: 'Student Name is required.' });
    }

    const cDate = checkup_date || new Date().toISOString().slice(0, 10);

    const insertRes = await query(
      `INSERT INTO health_checkups (
        student_id, student_name, class_section, checkup_date, height_cm, weight_kg,
        vision_left, vision_right, dental_status, ent_status, general_fitness,
        doctor_remarks, examiner_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id || null,
        student_name,
        class_section || null,
        cDate,
        height_cm || null,
        weight_kg || null,
        vision_left,
        vision_right,
        dental_status,
        ent_status,
        general_fitness,
        doctor_remarks || null,
        examiner_name,
      ]
    );

    const [created] = await query('SELECT * FROM health_checkups WHERE id = ?', [
      insertRes.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: 'Health checkup recorded successfully',
      checkup: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/health/checkups/:id
 */
export const updateHealthCheckup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM health_checkups WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Health checkup record not found' });
    }

    const {
      student_id,
      student_name,
      class_section,
      checkup_date,
      height_cm,
      weight_kg,
      vision_left,
      vision_right,
      dental_status,
      ent_status,
      general_fitness,
      doctor_remarks,
      examiner_name,
    } = req.body;

    if (!student_name) {
      return res.status(400).json({ success: false, message: 'Student Name is required.' });
    }

    await query(
      `UPDATE health_checkups
       SET student_id = ?, student_name = ?, class_section = ?, checkup_date = ?,
           height_cm = ?, weight_kg = ?, vision_left = ?, vision_right = ?,
           dental_status = ?, ent_status = ?, general_fitness = ?, doctor_remarks = ?, examiner_name = ?
       WHERE id = ?`,
      [
        student_id !== undefined ? (student_id || null) : existing.student_id,
        student_name,
        class_section || null,
        checkup_date || existing.checkup_date,
        height_cm || null,
        weight_kg || null,
        vision_left || '6/6',
        vision_right || '6/6',
        dental_status || 'Healthy',
        ent_status || 'Normal',
        general_fitness || 'Fit',
        doctor_remarks || null,
        examiner_name || 'Campus Medical Officer',
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM health_checkups WHERE id = ?', [id]);
    res.json({ success: true, message: 'Health checkup updated successfully', checkup: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/health/checkups/:id
 */
export const deleteHealthCheckup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT id FROM health_checkups WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Health checkup record not found' });
    }
    await query('DELETE FROM health_checkups WHERE id = ?', [id]);
    res.json({ success: true, message: 'Health checkup deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/medicines
 */
export const getMedicineLogs = async (req, res, next) => {
  try {
    const { search, date } = req.query;

    let sql = 'SELECT * FROM medicine_dispensing_logs WHERE 1=1';
    const params = [];

    if (date) {
      sql += ' AND DATE(dispensed_at) = ?';
      params.push(date);
    }
    if (search) {
      sql += ' AND (patient_name LIKE ? OR medicine_name LIKE ? OR class_or_dept LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY dispensed_at DESC, id DESC';

    const logs = await query(sql, params);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/medicines/:id
 */
export const getMedicineLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [log] = await query('SELECT * FROM medicine_dispensing_logs WHERE id = ? LIMIT 1', [id]);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Medicine log not found' });
    }
    res.json({ success: true, log });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/health/medicines
 */
export const createMedicineLog = async (req, res, next) => {
  try {
    const {
      patient_type = 'student',
      patient_name,
      class_or_dept,
      medicine_name,
      dosage_qty,
      reason,
      dispensed_by = 'School Nurse',
      inventory_id,
      quantity_units = 1,
    } = req.body;

    if (!patient_name || !medicine_name || !dosage_qty) {
      return res.status(400).json({
        success: false,
        message: 'Patient Name, Medicine Name, and Dosage are required.',
      });
    }

    const unitsUsed = Math.max(1, parseInt(quantity_units, 10) || 1);

    const insertRes = await query(
      `INSERT INTO medicine_dispensing_logs (
        patient_type, patient_name, class_or_dept, medicine_name, dosage_qty,
        reason, dispensed_by, inventory_id, quantity_units
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_type,
        patient_name,
        class_or_dept || null,
        medicine_name,
        dosage_qty,
        reason || null,
        dispensed_by,
        inventory_id || null,
        unitsUsed,
      ]
    );

    // Deduct from inventory stock if linked to an inventory item
    if (inventory_id) {
      const [inv] = await query('SELECT * FROM infirmary_medicine_inventory WHERE id = ? LIMIT 1', [
        inventory_id,
      ]);
      if (inv) {
        const nextQty = Math.max(0, (Number(inv.quantity_available) || 0) - unitsUsed);
        const nextStatus = computeInventoryStatus(nextQty, inv.reorder_level, inv.expiry_date);
        await query(
          'UPDATE infirmary_medicine_inventory SET quantity_available = ?, status = ? WHERE id = ?',
          [nextQty, nextStatus, inventory_id]
        );
      }
    }

    const [created] = await query('SELECT * FROM medicine_dispensing_logs WHERE id = ?', [
      insertRes.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: 'Medicine dispensing recorded successfully',
      log: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/health/medicines/:id
 */
export const updateMedicineLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM medicine_dispensing_logs WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine log not found' });
    }

    const {
      patient_type,
      patient_name,
      class_or_dept,
      medicine_name,
      dosage_qty,
      reason,
      dispensed_by,
      quantity_units,
    } = req.body;

    if (!patient_name || !medicine_name || !dosage_qty) {
      return res.status(400).json({
        success: false,
        message: 'Patient Name, Medicine Name, and Dosage are required.',
      });
    }

    await query(
      `UPDATE medicine_dispensing_logs
       SET patient_type = ?, patient_name = ?, class_or_dept = ?,
           medicine_name = ?, dosage_qty = ?, reason = ?, dispensed_by = ?, quantity_units = ?
       WHERE id = ?`,
      [
        patient_type || existing.patient_type,
        patient_name,
        class_or_dept || null,
        medicine_name,
        dosage_qty,
        reason || null,
        dispensed_by || 'School Nurse',
        parseInt(quantity_units, 10) || existing.quantity_units || 1,
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM medicine_dispensing_logs WHERE id = ?', [id]);
    res.json({ success: true, message: 'Medicine log updated successfully', log: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/health/medicines/:id
 */
export const deleteMedicineLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT id FROM medicine_dispensing_logs WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine log not found' });
    }
    await query('DELETE FROM medicine_dispensing_logs WHERE id = ?', [id]);
    res.json({ success: true, message: 'Medicine dispensing log deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Medicine Inventory Stock CRUD (/api/health/inventory)
 */
export const getMedicineInventory = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let sql = 'SELECT * FROM infirmary_medicine_inventory WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (medicine_name LIKE ? OR category LIKE ? OR batch_no LIKE ? OR supplier_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    sql += ' ORDER BY medicine_name ASC';

    const items = await query(sql, params);
    res.json({ success: true, count: items.length, items });
  } catch (error) {
    next(error);
  }
};

export const getMedicineInventoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [item] = await query('SELECT * FROM infirmary_medicine_inventory WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

export const createMedicineInventory = async (req, res, next) => {
  try {
    const {
      medicine_name,
      category = 'General',
      batch_no,
      unit = 'Tablets',
      quantity_available = 0,
      reorder_level = 10,
      expiry_date,
      storage_location = 'Infirmary Cabinet A',
      supplier_name,
      notes,
    } = req.body;

    if (!medicine_name) {
      return res.status(400).json({ success: false, message: 'Medicine Name is required.' });
    }

    const status = computeInventoryStatus(quantity_available, reorder_level, expiry_date);

    const insertRes = await query(
      `INSERT INTO infirmary_medicine_inventory (
        medicine_name, category, batch_no, unit, quantity_available, reorder_level,
        expiry_date, storage_location, supplier_name, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        medicine_name,
        category,
        batch_no || null,
        unit,
        parseInt(quantity_available, 10) || 0,
        parseInt(reorder_level, 10) || 10,
        expiry_date || null,
        storage_location,
        supplier_name || null,
        status,
        notes || null,
      ]
    );

    const [created] = await query('SELECT * FROM infirmary_medicine_inventory WHERE id = ?', [
      insertRes.insertId,
    ]);
    res.status(201).json({
      success: true,
      message: 'Medicine stock item added successfully',
      item: created,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedicineInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM infirmary_medicine_inventory WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const {
      medicine_name,
      category,
      batch_no,
      unit,
      quantity_available,
      reorder_level,
      expiry_date,
      storage_location,
      supplier_name,
      notes,
    } = req.body;

    if (!medicine_name) {
      return res.status(400).json({ success: false, message: 'Medicine Name is required.' });
    }

    const qty = quantity_available !== undefined ? parseInt(quantity_available, 10) || 0 : existing.quantity_available;
    const reorder = reorder_level !== undefined ? parseInt(reorder_level, 10) || 10 : existing.reorder_level;
    const exp = expiry_date !== undefined ? (expiry_date || null) : existing.expiry_date;
    const status = computeInventoryStatus(qty, reorder, exp);

    await query(
      `UPDATE infirmary_medicine_inventory
       SET medicine_name = ?, category = ?, batch_no = ?, unit = ?,
           quantity_available = ?, reorder_level = ?, expiry_date = ?,
           storage_location = ?, supplier_name = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        medicine_name,
        category || 'General',
        batch_no || null,
        unit || 'Tablets',
        qty,
        reorder,
        exp,
        storage_location || 'Infirmary Cabinet A',
        supplier_name || null,
        status,
        notes || null,
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM infirmary_medicine_inventory WHERE id = ?', [id]);
    res.json({ success: true, message: 'Medicine stock updated successfully', item: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteMedicineInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT id FROM infirmary_medicine_inventory WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }
    await query('DELETE FROM infirmary_medicine_inventory WHERE id = ?', [id]);
    res.json({ success: true, message: 'Medicine inventory item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/consultations
 */
export const getDoctorConsultations = async (req, res, next) => {
  try {
    const { search, date } = req.query;

    let sql = `
      SELECT dc.*,
             s.admission_no,
             sp.emp_no,
             COALESCE(hp_s.blood_group, s.blood_group, hp_st.blood_group, sp.blood_group, '—') AS blood_group,
             COALESCE(hp_s.known_allergies, hp_st.known_allergies) AS known_allergies
      FROM doctor_consultations dc
      LEFT JOIN students s ON dc.student_id = s.id
      LEFT JOIN staff_profiles sp ON dc.staff_id = sp.id
      LEFT JOIN health_profiles hp_s ON dc.student_id = hp_s.student_id
      LEFT JOIN health_profiles hp_st ON dc.staff_id = hp_st.staff_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      sql += ' AND dc.consultation_date = ?';
      params.push(date);
    }
    if (search) {
      sql += ' AND (dc.consultation_number LIKE ? OR dc.patient_name LIKE ? OR dc.doctor_name LIKE ? OR dc.diagnosis LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY dc.consultation_date DESC, dc.id DESC';

    const consultations = await query(sql, params);
    res.json({ success: true, count: consultations.length, consultations });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/consultations/:id
 */
export const getDoctorConsultationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [consultation] = await query(
      `SELECT dc.*,
              s.admission_no,
              sp.emp_no,
              COALESCE(hp_s.blood_group, s.blood_group, hp_st.blood_group, sp.blood_group, '—') AS blood_group,
              COALESCE(hp_s.known_allergies, hp_st.known_allergies) AS known_allergies
       FROM doctor_consultations dc
       LEFT JOIN students s ON dc.student_id = s.id
       LEFT JOIN staff_profiles sp ON dc.staff_id = sp.id
       LEFT JOIN health_profiles hp_s ON dc.student_id = hp_s.student_id
       LEFT JOIN health_profiles hp_st ON dc.staff_id = hp_st.staff_id
       WHERE dc.id = ? LIMIT 1`,
      [id]
    );
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Doctor consultation not found' });
    }
    res.json({ success: true, consultation });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/health/consultations
 */
export const createDoctorConsultation = async (req, res, next) => {
  try {
    const {
      doctor_name,
      doctor_reg_no,
      patient_type = 'student',
      student_id,
      staff_id,
      patient_name,
      class_or_dept,
      consultation_date,
      symptoms,
      diagnosis,
      prescription,
      advice_and_rest,
      follow_up_date,
    } = req.body;

    if (!doctor_name || !patient_name || !symptoms || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Doctor Name, Patient Name, Symptoms, and Diagnosis are required.',
      });
    }

    const consultNumber = await generateDailyCode('DOC', 'doctor_consultations', 'consultation_number');
    const cDate = consultation_date || new Date().toISOString().slice(0, 10);

    const insertRes = await query(
      `INSERT INTO doctor_consultations (
        consultation_number, doctor_name, doctor_reg_no, patient_type, student_id,
        staff_id, patient_name, class_or_dept, consultation_date, symptoms,
        diagnosis, prescription, advice_and_rest, follow_up_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        consultNumber,
        doctor_name,
        doctor_reg_no || null,
        patient_type,
        student_id || null,
        staff_id || null,
        patient_name,
        class_or_dept || null,
        cDate,
        symptoms,
        diagnosis,
        prescription || null,
        advice_and_rest || null,
        follow_up_date || null,
      ]
    );

    const [created] = await query('SELECT * FROM doctor_consultations WHERE id = ?', [
      insertRes.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: 'Doctor consultation recorded successfully',
      consultation: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/health/consultations/:id
 */
export const updateDoctorConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM doctor_consultations WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Doctor consultation not found' });
    }

    const {
      doctor_name,
      doctor_reg_no,
      patient_type,
      student_id,
      staff_id,
      patient_name,
      class_or_dept,
      consultation_date,
      symptoms,
      diagnosis,
      prescription,
      advice_and_rest,
      follow_up_date,
    } = req.body;

    if (!doctor_name || !patient_name || !symptoms || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Doctor Name, Patient Name, Symptoms, and Diagnosis are required.',
      });
    }

    await query(
      `UPDATE doctor_consultations
       SET doctor_name = ?, doctor_reg_no = ?, patient_type = ?, student_id = ?, staff_id = ?,
           patient_name = ?, class_or_dept = ?, consultation_date = ?, symptoms = ?,
           diagnosis = ?, prescription = ?, advice_and_rest = ?, follow_up_date = ?
       WHERE id = ?`,
      [
        doctor_name,
        doctor_reg_no || null,
        patient_type || existing.patient_type,
        student_id !== undefined ? (student_id || null) : existing.student_id,
        staff_id !== undefined ? (staff_id || null) : existing.staff_id,
        patient_name,
        class_or_dept || null,
        consultation_date || existing.consultation_date,
        symptoms,
        diagnosis,
        prescription || null,
        advice_and_rest || null,
        follow_up_date || null,
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM doctor_consultations WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Doctor consultation updated successfully',
      consultation: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/health/consultations/:id
 */
export const deleteDoctorConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT id FROM doctor_consultations WHERE id = ? LIMIT 1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Doctor consultation not found' });
    }
    await query('DELETE FROM doctor_consultations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Doctor consultation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Parent Emergency / Health Notifications CRUD (/api/health/notifications)
 */
export const getParentNotifications = async (req, res, next) => {
  try {
    const { search, urgency, response_status } = req.query;
    let sql = 'SELECT * FROM parent_health_notifications WHERE 1=1';
    const params = [];

    if (urgency && urgency !== 'all') {
      sql += ' AND urgency = ?';
      params.push(urgency);
    }
    if (response_status && response_status !== 'all') {
      sql += ' AND response_status = ?';
      params.push(response_status);
    }
    if (search) {
      sql += ' AND (notification_number LIKE ? OR student_name LIKE ? OR parent_name LIKE ? OR parent_phone LIKE ? OR message_summary LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }
    sql += ' ORDER BY notified_at DESC, id DESC';

    const notifications = await query(sql, params);
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
};

export const getParentNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [notification] = await query(
      'SELECT * FROM parent_health_notifications WHERE id = ? LIMIT 1',
      [id]
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification log not found' });
    }
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

export const createParentNotification = async (req, res, next) => {
  try {
    const {
      student_id,
      student_name,
      class_section,
      visit_id,
      parent_name,
      parent_phone,
      channel = 'Phone Call',
      urgency = 'Routine',
      message_summary,
      response_status = 'Notified',
      notified_by = 'School Nurse',
    } = req.body;

    if (!student_name || !message_summary) {
      return res.status(400).json({
        success: false,
        message: 'Student Name and Notification Summary are required.',
      });
    }

    const notifNo = await generateDailyCode('PN', 'parent_health_notifications', 'notification_number');

    const insertRes = await query(
      `INSERT INTO parent_health_notifications (
        notification_number, student_id, student_name, class_section, visit_id,
        parent_name, parent_phone, channel, urgency, message_summary,
        response_status, notified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notifNo,
        student_id || null,
        student_name,
        class_section || null,
        visit_id || null,
        parent_name || null,
        parent_phone || null,
        channel,
        urgency,
        message_summary,
        response_status,
        notified_by,
      ]
    );

    const [created] = await query('SELECT * FROM parent_health_notifications WHERE id = ?', [
      insertRes.insertId,
    ]);
    res.status(201).json({
      success: true,
      message: 'Parent notification logged successfully',
      notification: created,
    });
  } catch (error) {
    next(error);
  }
};

export const updateParentNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query(
      'SELECT * FROM parent_health_notifications WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Notification log not found' });
    }

    const {
      student_id,
      student_name,
      class_section,
      visit_id,
      parent_name,
      parent_phone,
      channel,
      urgency,
      message_summary,
      response_status,
      notified_by,
    } = req.body;

    if (!student_name || !message_summary) {
      return res.status(400).json({
        success: false,
        message: 'Student Name and Notification Summary are required.',
      });
    }

    await query(
      `UPDATE parent_health_notifications
       SET student_id = ?, student_name = ?, class_section = ?, visit_id = ?,
           parent_name = ?, parent_phone = ?, channel = ?, urgency = ?,
           message_summary = ?, response_status = ?, notified_by = ?
       WHERE id = ?`,
      [
        student_id !== undefined ? (student_id || null) : existing.student_id,
        student_name,
        class_section || null,
        visit_id !== undefined ? (visit_id || null) : existing.visit_id,
        parent_name || null,
        parent_phone || null,
        channel || existing.channel,
        urgency || existing.urgency,
        message_summary,
        response_status || existing.response_status,
        notified_by || existing.notified_by,
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM parent_health_notifications WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Parent notification updated successfully',
      notification: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteParentNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await query(
      'SELECT id FROM parent_health_notifications WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Notification log not found' });
    }
    await query('DELETE FROM parent_health_notifications WHERE id = ?', [id]);
    res.json({ success: true, message: 'Notification log deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/emergency-directory
 */
export const getEmergencyDirectory = async (req, res, next) => {
  try {
    const { class_id, search } = req.query;

    let sql = `
      SELECT
        s.id AS student_id,
        s.admission_no,
        s.student_name,
        c.name AS class_name,
        bcs.name AS section_name,
        TRIM(CONCAT_WS(' - ', c.name, bcs.name)) AS class_section,
        s.father_name,
        s.father_phone,
        s.mother_name,
        s.mother_phone,
        s.emergency_contact_name,
        s.emergency_contact_phone,
        COALESCE(hp.blood_group, s.blood_group, 'Unknown') AS blood_group,
        hp.known_allergies,
        hp.chronic_conditions
      FROM students s
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.enrollment_status = 'current'
      LEFT JOIN classes c ON se.class_id = c.id
      LEFT JOIN branch_class_sections bcs ON se.section_id = bcs.id
      LEFT JOIN health_profiles hp ON s.id = hp.student_id
      WHERE s.status = 'active'
    `;
    const params = [];

    if (class_id) {
      sql += ' AND se.class_id = ?';
      params.push(class_id);
    }

    if (search) {
      sql += ' AND (s.student_name LIKE ? OR s.admission_no LIKE ? OR s.father_phone LIKE ? OR s.mother_phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY c.name ASC, bcs.name ASC, s.student_name ASC';

    const directory = await query(sql, params);
    res.json({ success: true, count: directory.length, directory });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/student-dossier/:studentId
 */
export const getStudentHealthDossier = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Students may only view their own health dossier
    if (req.user?.role === 'student') {
      const ownRows = await query(
        `SELECT id FROM students WHERE LOWER(admission_no) = ? LIMIT 1`,
        [String(req.user.username || '').toLowerCase()]
      );
      const ownId = ownRows.length > 0 ? Number(ownRows[0].id) : null;
      if (!ownId || Number(studentId) !== ownId) {
        return res.status(403).json({ success: false, message: 'Access denied: you can only view your own health dossier' });
      }
    }

    const [profile] = await query(
      `SELECT s.id, s.admission_no, s.student_name, COALESCE(hp.blood_group, s.blood_group, 'O+') AS blood_group,
              hp.height_cm, hp.weight_kg, hp.bmi, hp.known_allergies, hp.chronic_conditions,
              hp.medical_notes, hp.identification_mark, hp.doctor_name, hp.doctor_phone,
              hp.emergency_contact_name, hp.emergency_contact_phone, hp.emergency_contact_relation
       FROM students s
       LEFT JOIN health_profiles hp ON s.id = hp.student_id
       WHERE s.id = ? LIMIT 1`,
      [studentId]
    );

    const visits = await query(
      `SELECT * FROM infirmary_visits WHERE student_id = ? ORDER BY visit_date DESC LIMIT 20`,
      [studentId]
    );

    const checkups = await query(
      `SELECT * FROM health_checkups WHERE student_id = ? ORDER BY checkup_date DESC LIMIT 10`,
      [studentId]
    );

    res.json({ success: true, profile: profile || {}, visits, checkups });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/health/refer-from-portal
 */
export const referStudentFromClass = async (req, res, next) => {
  try {
    const { student_id, student_name, class_section, reason, temperature_f } = req.body;
    const visitNumber = await generateDailyCode('INF', 'infirmary_visits', 'visit_number');
    const vDate = new Date().toISOString().slice(0, 10);
    const vTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const insertRes = await query(
      `INSERT INTO infirmary_visits (
        visit_number, patient_type, student_id, patient_name, class_section,
        visit_date, visit_time, visit_type, chief_complaint, treatment_given,
        temperature_f, disposition, attended_by, remarks
      ) VALUES (?, 'student', ?, ?, ?, ?, ?, 'illness', ?, 'Awaiting infirmary triage', ?, 'resting_in_bay', 'Infirmary Desk', ?)`,
      [
        visitNumber,
        student_id || null,
        student_name,
        class_section || null,
        vDate,
        vTime,
        reason || 'Referred from classroom by teacher',
        temperature_f || null,
        'Referred by class faculty',
      ]
    );

    const [created] = await query('SELECT * FROM infirmary_visits WHERE id = ?', [
      insertRes.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: 'Student referral sent to Infirmary Desk',
      visit: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/health/search-students?q=...
 */
export const searchHealthStudents = async (req, res, next) => {
  try {
    const { q } = req.query;
    let sql = `
      SELECT s.id, s.admission_no, s.student_name, s.blood_group,
             s.father_name, s.father_phone, s.mother_name, s.mother_phone, s.emergency_contact_phone,
             COALESCE(c.name, '') AS class_name,
             COALESCE(bcs.name, '') AS section_name,
             TRIM(CONCAT_WS(' - ', c.name, bcs.name)) AS class_section,
             hp.known_allergies, hp.chronic_conditions, hp.height_cm, hp.weight_kg, hp.bmi
      FROM students s
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND (se.enrollment_status = 'current' OR se.enrollment_status = 'active')
      LEFT JOIN classes c ON se.class_id = c.id
      LEFT JOIN branch_class_sections bcs ON se.section_id = bcs.id
      LEFT JOIN health_profiles hp ON s.id = hp.student_id
      WHERE s.status = 'active'
    `;
    const params = [];
    if (q && q.trim().length > 0) {
      sql += ' AND (s.student_name LIKE ? OR s.admission_no LIKE ? OR c.name LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }
    sql += ' ORDER BY s.student_name ASC LIMIT 25';
    const students = await query(sql, params);
    res.json({ success: true, students });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/health/search-staff?q=...
 */
export const searchHealthStaff = async (req, res, next) => {
  try {
    const { q } = req.query;
    let sql = `
      SELECT sp.id, sp.emp_no,
             TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS full_name,
             sp.department, sp.designation, sp.phone, sp.email,
             hp.blood_group, hp.known_allergies, hp.chronic_conditions
      FROM staff_profiles sp
      LEFT JOIN health_profiles hp ON sp.id = hp.staff_id
      WHERE sp.status = 'active'
    `;
    const params = [];
    if (q && q.trim().length > 0) {
      sql += ' AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.emp_no LIKE ? OR sp.department LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }
    sql += ' ORDER BY sp.first_name ASC LIMIT 25';
    const staff = await query(sql, params);
    res.json({ success: true, staff });
  } catch (err) {
    next(err);
  }
};
