import { pool, query } from '../../config/database.js';
import { getNextSequenceNumber } from '../../services/sequenceService.js';

export const getEnquiries = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      stage,
      status,
      alert,
      search,
    } = req.query;

    let sql = `
      SELECT e.*,
             b.name AS branch_name,
             ay.name AS academic_year_name,
             c.name AS class_name,
             ls.name AS lead_source_name,
             latest_f.next_followup_date,
             latest_f.interaction_type AS latest_interaction_type,
             latest_f.notes AS latest_followup_notes,
             latest_f.followup_date AS latest_followup_date
      FROM enquiries e
      JOIN branches b ON e.branch_id = b.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      JOIN classes c ON e.class_id = c.id
      LEFT JOIN lead_sources ls ON e.lead_source_id = ls.id
      LEFT JOIN (
        SELECT ef1.*
        FROM enquiry_followups ef1
        INNER JOIN (
          SELECT enquiry_id, MAX(id) AS max_id
          FROM enquiry_followups
          GROUP BY enquiry_id
        ) ef2 ON ef1.id = ef2.max_id
      ) latest_f ON e.id = latest_f.enquiry_id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      sql += ' AND e.branch_id = ?';
      params.push(Number(branch_id));
    }
    if (academic_year_id) {
      sql += ' AND e.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (class_id) {
      sql += ' AND e.class_id = ?';
      params.push(Number(class_id));
    }
    if (stage) {
      sql += ' AND e.stage = ?';
      params.push(stage);
    }
    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ` AND (
        e.enquiry_no LIKE ? OR 
        e.student_name LIKE ? OR 
        e.parent_name LIKE ? OR 
        e.primary_phone LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (alert === 'today') {
      sql += ` AND DATE(latest_f.next_followup_date) = CURDATE() AND e.stage NOT IN ('admitted', 'dropped')`;
    } else if (alert === 'overdue') {
      sql += ` AND DATE(latest_f.next_followup_date) < CURDATE() AND e.stage NOT IN ('admitted', 'dropped')`;
    } else if (alert === 'upcoming') {
      sql += ` AND DATE(latest_f.next_followup_date) > CURDATE() AND e.stage NOT IN ('admitted', 'dropped')`;
    }

    sql += ' ORDER BY e.created_at DESC';

    const enquiries = await query(sql, params);

    // Compute summary alert counts for active filters (branch_id / academic_year_id)
    let countSql = `
      SELECT 
        COUNT(CASE WHEN DATE(latest_f.next_followup_date) = CURDATE() AND e.stage NOT IN ('admitted', 'dropped') THEN 1 END) AS count_today,
        COUNT(CASE WHEN DATE(latest_f.next_followup_date) < CURDATE() AND e.stage NOT IN ('admitted', 'dropped') THEN 1 END) AS count_overdue,
        COUNT(CASE WHEN DATE(latest_f.next_followup_date) > CURDATE() AND e.stage NOT IN ('admitted', 'dropped') THEN 1 END) AS count_upcoming,
        COUNT(e.id) AS count_total
      FROM enquiries e
      LEFT JOIN (
        SELECT ef1.*
        FROM enquiry_followups ef1
        INNER JOIN (
          SELECT enquiry_id, MAX(id) AS max_id
          FROM enquiry_followups
          GROUP BY enquiry_id
        ) ef2 ON ef1.id = ef2.max_id
      ) latest_f ON e.id = latest_f.enquiry_id
      WHERE 1=1
    `;
    const countParams = [];
    if (branch_id) {
      countSql += ' AND e.branch_id = ?';
      countParams.push(Number(branch_id));
    }
    if (academic_year_id) {
      countSql += ' AND e.academic_year_id = ?';
      countParams.push(Number(academic_year_id));
    }

    const [alertCounts] = await query(countSql, countParams);

    res.json({
      enquiries,
      alertCounts: alertCounts || { count_today: 0, count_overdue: 0, count_upcoming: 0, count_total: 0 },
    });
  } catch (error) {
    next(error);
  }
};

export const createEnquiry = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      lead_source_id,
      student_name,
      gender,
      dob,
      parent_name,
      primary_phone,
      email,
      remarks,
      initial_followup,
    } = req.body;

    if (!branch_id || !academic_year_id || !class_id || !student_name || !gender || !parent_name || !primary_phone) {
      conn.release();
      return res.status(400).json({
        message: 'Required fields missing: branch, academic year, class, student name, gender, parent name, and primary phone',
      });
    }

    // Check branch workflow setting
    const [workflowRows] = await conn.query(
      `SELECT enable_enquiry FROM branch_admission_workflows WHERE branch_id = ?`,
      [branch_id]
    );
    if (workflowRows.length > 0 && !workflowRows[0].enable_enquiry) {
      conn.release();
      return res.status(400).json({
        message: 'Enquiry stage is disabled in the workflow configuration for this branch.',
      });
    }

    await conn.beginTransaction();

    // Generate enquiry_no atomically
    const enquiryNo = await getNextSequenceNumber(branch_id, academic_year_id, 'enquiry', conn);

    const [insertResult] = await conn.query(
      `INSERT INTO enquiries
       (enquiry_no, branch_id, academic_year_id, class_id, lead_source_id, student_name, gender, dob, parent_name, primary_phone, email, remarks, stage, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enquiry', 'open')`,
      [
        enquiryNo,
        Number(branch_id),
        Number(academic_year_id),
        Number(class_id),
        lead_source_id ? Number(lead_source_id) : null,
        student_name.trim(),
        gender,
        dob || null,
        parent_name.trim(),
        primary_phone.trim(),
        email ? email.trim() : null,
        remarks || null,
      ]
    );

    const enquiryId = insertResult.insertId;

    // Optional initial followup entry
    if (initial_followup && initial_followup.notes) {
      await conn.query(
        `INSERT INTO enquiry_followups
         (enquiry_id, followup_date, interaction_type, next_followup_date, notes, response_status, handled_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          enquiryId,
          initial_followup.followup_date || new Date(),
          initial_followup.interaction_type || 'phone_call',
          initial_followup.next_followup_date || null,
          initial_followup.notes,
          initial_followup.response_status || 'interested',
          req.user?.id || null,
        ]
      );
    }

    await conn.commit();

    const [created] = await query(
      `SELECT e.*, b.name AS branch_name, ay.name AS academic_year_name, c.name AS class_name, ls.name AS lead_source_name
       FROM enquiries e
       JOIN branches b ON e.branch_id = b.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       JOIN classes c ON e.class_id = c.id
       LEFT JOIN lead_sources ls ON e.lead_source_id = ls.id
       WHERE e.id = ?`,
      [enquiryId]
    );

    res.status(201).json({
      message: 'Enquiry created successfully',
      enquiry: created,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const getEnquiryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await query(
      `SELECT e.*, 
              b.name AS branch_name, 
              ay.name AS academic_year_name, 
              c.name AS class_name, 
              ls.name AS lead_source_name
       FROM enquiries e
       JOIN branches b ON e.branch_id = b.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       JOIN classes c ON e.class_id = c.id
       LEFT JOIN lead_sources ls ON e.lead_source_id = ls.id
       WHERE e.id = ?`,
      [id]
    );

    if (!rows) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    const followups = await query(
      `SELECT ef.*, u.name AS handled_by_name
       FROM enquiry_followups ef
       LEFT JOIN users u ON ef.handled_by = u.id
       WHERE ef.enquiry_id = ?
       ORDER BY ef.followup_date DESC, ef.id DESC`,
      [id]
    );

    res.json({
      enquiry: rows,
      followups,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      class_id,
      lead_source_id,
      student_name,
      gender,
      dob,
      parent_name,
      primary_phone,
      email,
      remarks,
      stage,
      status,
    } = req.body;

    const [existing] = await query(`SELECT * FROM enquiries WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    await query(
      `UPDATE enquiries
       SET class_id = COALESCE(?, class_id),
           lead_source_id = COALESCE(?, lead_source_id),
           student_name = COALESCE(?, student_name),
           gender = COALESCE(?, gender),
           dob = COALESCE(?, dob),
           parent_name = COALESCE(?, parent_name),
           primary_phone = COALESCE(?, primary_phone),
           email = COALESCE(?, email),
           remarks = COALESCE(?, remarks),
           stage = COALESCE(?, stage),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ?`,
      [
        class_id ? Number(class_id) : null,
        lead_source_id !== undefined ? (lead_source_id ? Number(lead_source_id) : null) : null,
        student_name ? student_name.trim() : null,
        gender || null,
        dob !== undefined ? (dob || null) : null,
        parent_name ? parent_name.trim() : null,
        primary_phone ? primary_phone.trim() : null,
        email !== undefined ? (email ? email.trim() : null) : null,
        remarks !== undefined ? remarks : null,
        stage || null,
        status || null,
        id,
      ]
    );

    const [updated] = await query(
      `SELECT e.*, b.name AS branch_name, ay.name AS academic_year_name, c.name AS class_name, ls.name AS lead_source_name
       FROM enquiries e
       JOIN branches b ON e.branch_id = b.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       JOIN classes c ON e.class_id = c.id
       LEFT JOIN lead_sources ls ON e.lead_source_id = ls.id
       WHERE e.id = ?`,
      [id]
    );

    res.json({
      message: 'Enquiry updated successfully',
      enquiry: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const addFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      followup_date,
      interaction_type = 'phone_call',
      next_followup_date,
      notes,
      response_status = 'interested',
      handled_by,
    } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: 'Follow-up interaction notes are required' });
    }

    const [enquiry] = await query(`SELECT * FROM enquiries WHERE id = ?`, [id]);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    const staffId = handled_by || req.user?.id || null;

    const result = await query(
      `INSERT INTO enquiry_followups
       (enquiry_id, followup_date, interaction_type, next_followup_date, notes, response_status, handled_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        followup_date || new Date(),
        interaction_type,
        next_followup_date || null,
        notes.trim(),
        response_status,
        staffId,
      ]
    );

    // Auto-update enquiry status and stage if dropped
    let newStatus = enquiry.status;
    let newStage = enquiry.stage;

    if (response_status === 'not_interested') {
      newStatus = 'dropped';
      newStage = 'dropped';
    } else if (response_status === 'callback_requested') {
      newStatus = 'callback_requested';
    } else if (response_status === 'interested' || response_status === 'form_issued') {
      newStatus = 'interested';
    }

    await query(
      `UPDATE enquiries SET status = ?, stage = ?, updated_at = NOW() WHERE id = ?`,
      [newStatus, newStage, id]
    );

    const [createdFollowup] = await query(
      `SELECT ef.*, u.name AS handled_by_name
       FROM enquiry_followups ef
       LEFT JOIN users u ON ef.handled_by = u.id
       WHERE ef.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Follow-up recorded successfully',
      followup: createdFollowup,
    });
  } catch (error) {
    next(error);
  }
};

export const convertToApplication = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      address_street = 'Main Street',
      city = 'Campus City',
      state = 'State',
      pincode = '100001',
      dob,
      blood_group,
      aadhaar_no,
      religion,
      mother_tongue,
      father_occupation,
      mother_name,
      mother_phone,
      prev_school_name,
      prev_class_passed,
      prev_tc_no,
    } = req.body;

    const [enqRows] = await conn.query(`SELECT * FROM enquiries WHERE id = ?`, [id]);
    if (enqRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Enquiry not found' });
    }
    const enq = enqRows[0];

    // Check branch workflow
    const [wfRows] = await conn.query(
      `SELECT enable_application FROM branch_admission_workflows WHERE branch_id = ?`,
      [enq.branch_id]
    );
    if (wfRows.length > 0 && !wfRows[0].enable_application) {
      conn.release();
      return res.status(400).json({
        message: 'Application processing is disabled for this branch in workflow settings.',
      });
    }

    if (enq.stage === 'admitted') {
      conn.release();
      return res.status(400).json({ message: 'Enquiry is already admitted.' });
    }

    await conn.beginTransaction();

    // Generate application_no
    const applicationNo = await getNextSequenceNumber(enq.branch_id, enq.academic_year_id, 'application', conn);

    const studentDob = dob || enq.dob || '2015-01-01';

    const [appResult] = await conn.query(
      `INSERT INTO applications
       (application_no, enquiry_id, branch_id, academic_year_id, class_id, student_name, gender, dob, blood_group,
        aadhaar_no, religion, mother_tongue, father_name, father_occupation, father_phone, mother_name, mother_phone,
        address_street, city, state, pincode, prev_school_name, prev_class_passed, prev_tc_no, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        applicationNo,
        enq.id,
        enq.branch_id,
        enq.academic_year_id,
        enq.class_id,
        enq.student_name,
        enq.gender,
        studentDob,
        blood_group || null,
        aadhaar_no || null,
        religion || null,
        mother_tongue || null,
        enq.parent_name,
        father_occupation || null,
        enq.primary_phone,
        mother_name || null,
        mother_phone || null,
        address_street,
        city,
        state,
        pincode,
        prev_school_name || null,
        prev_class_passed || null,
        prev_tc_no || null,
      ]
    );

    // Update enquiry
    await conn.query(
      `UPDATE enquiries SET stage = 'application', status = 'converted', updated_at = NOW() WHERE id = ?`,
      [enq.id]
    );

    // Add followup log
    await conn.query(
      `INSERT INTO enquiry_followups
       (enquiry_id, followup_date, interaction_type, notes, response_status, handled_by)
       VALUES (?, NOW(), 'campus_visit', ?, 'form_issued', ?)`,
      [
        enq.id,
        `Converted enquiry to Application: ${applicationNo}`,
        req.user?.id || null,
      ]
    );

    await conn.commit();

    const [createdApp] = await query(
      `SELECT a.*, b.name AS branch_name, ay.name AS academic_year_name, c.name AS class_name
       FROM applications a
       JOIN branches b ON a.branch_id = b.id
       JOIN academic_years ay ON a.academic_year_id = ay.id
       JOIN classes c ON a.class_id = c.id
       WHERE a.id = ?`,
      [appResult.insertId]
    );

    res.status(201).json({
      message: 'Enquiry converted to application successfully',
      application: createdApp,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const directAdmission = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      section_id,
      admission_date = new Date().toISOString().split('T')[0],
      roll_no,
      admission_category = 'general',
      emergency_contact_name,
      emergency_contact_phone,
      address_street,
      city,
      dob,
    } = req.body;

    if (!section_id) {
      conn.release();
      return res.status(400).json({ message: 'Class section allocation is required for admission' });
    }

    const [enqRows] = await conn.query(`SELECT * FROM enquiries WHERE id = ?`, [id]);
    if (enqRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Enquiry not found' });
    }
    const enq = enqRows[0];

    // Check branch workflow
    const [wfRows] = await conn.query(
      `SELECT allow_direct_enquiry_to_admission FROM branch_admission_workflows WHERE branch_id = ?`,
      [enq.branch_id]
    );
    if (wfRows.length > 0 && !wfRows[0].allow_direct_enquiry_to_admission) {
      conn.release();
      return res.status(400).json({
        message: 'Direct fast-track enquiry to admission is disabled in workflow settings for this branch.',
      });
    }

    // Capacity validation on Section
    const [secRows] = await conn.query(
      `SELECT s.id, s.name, s.capacity, s.class_id 
       FROM branch_class_sections s 
       WHERE s.id = ? AND s.branch_id = ?`,
      [section_id, enq.branch_id]
    );
    if (secRows.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'Selected section does not exist in this branch' });
    }

    const section = secRows[0];
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS enrolled 
       FROM admissions 
       WHERE section_id = ? AND enrollment_status = 'active'`,
      [section_id]
    );
    const enrolled = countRows[0].enrolled;
    if (enrolled >= section.capacity && !req.body.force_override) {
      conn.release();
      return res.status(400).json({
        message: `Section "${section.name}" has reached maximum capacity (${enrolled}/${section.capacity} seats). Please select another section or expand capacity.`,
        capacity_exceeded: true,
      });
    }

    await conn.beginTransaction();

    // Generate admission_no
    const admissionNo = await getNextSequenceNumber(enq.branch_id, enq.academic_year_id, 'admission', conn);
    const studentDob = dob || enq.dob || '2015-01-01';

    const [admResult] = await conn.query(
      `INSERT INTO admissions
       (admission_no, enquiry_id, branch_id, academic_year_id, class_id, section_id,
        student_name, gender, dob, parent_name, primary_phone, address_street, city,
        admission_date, roll_no, admission_category, emergency_contact_name, emergency_contact_phone, enrollment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        admissionNo,
        enq.id,
        enq.branch_id,
        enq.academic_year_id,
        enq.class_id,
        Number(section_id),
        enq.student_name,
        enq.gender,
        studentDob,
        enq.parent_name,
        enq.primary_phone,
        address_street || null,
        city || null,
        admission_date,
        roll_no || null,
        admission_category || 'general',
        emergency_contact_name || enq.parent_name,
        emergency_contact_phone || enq.primary_phone,
      ]
    );

    // Update enquiry
    await conn.query(
      `UPDATE enquiries SET stage = 'admitted', status = 'converted', updated_at = NOW() WHERE id = ?`,
      [enq.id]
    );

    // Followup log
    await conn.query(
      `INSERT INTO enquiry_followups
       (enquiry_id, followup_date, interaction_type, notes, response_status, handled_by)
       VALUES (?, NOW(), 'campus_visit', ?, 'interested', ?)`,
      [
        enq.id,
        `Fast-track direct admission confirmed: ${admissionNo} (Section: ${section.name})`,
        req.user?.id || null,
      ]
    );

    await conn.commit();

    const [createdAdmission] = await query(
      `SELECT adm.*, 
              b.name AS branch_name, 
              ay.name AS academic_year_name, 
              c.name AS class_name, 
              s.name AS section_name
       FROM admissions adm
       JOIN branches b ON adm.branch_id = b.id
       JOIN academic_years ay ON adm.academic_year_id = ay.id
       JOIN classes c ON adm.class_id = c.id
       JOIN branch_class_sections s ON adm.section_id = s.id
       WHERE adm.id = ?`,
      [admResult.insertId]
    );

    res.status(201).json({
      message: 'Direct admission confirmed successfully',
      admission: createdAdmission,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
