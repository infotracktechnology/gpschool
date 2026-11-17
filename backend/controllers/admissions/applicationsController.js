import { pool, query } from '../../config/database.js';
import { getNextSequenceNumber } from '../../services/sequenceService.js';

export const getApplications = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, class_id, status, search } = req.query;

    let sql = `
      SELECT a.*,
             b.name AS branch_name,
             ay.name AS academic_year_name,
             c.name AS class_name,
             e.enquiry_no
      FROM applications a
      JOIN branches b ON a.branch_id = b.id
      JOIN academic_years ay ON a.academic_year_id = ay.id
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN enquiries e ON a.enquiry_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      sql += ' AND a.branch_id = ?';
      params.push(Number(branch_id));
    }
    if (academic_year_id) {
      sql += ' AND a.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (class_id) {
      sql += ' AND a.class_id = ?';
      params.push(Number(class_id));
    }
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ` AND (
        a.application_no LIKE ? OR 
        a.student_name LIKE ? OR 
        a.father_name LIKE ? OR 
        a.father_phone LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY a.created_at DESC';

    const applications = await query(sql, params);
    res.json({ applications });
  } catch (error) {
    next(error);
  }
};

export const createApplication = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      enquiry_id,
      student_name,
      gender,
      dob,
      blood_group,
      aadhaar_no,
      religion,
      mother_tongue,
      father_name,
      father_occupation,
      father_phone,
      mother_name,
      mother_phone,
      address_street,
      city,
      state,
      pincode,
      prev_school_name,
      prev_class_passed,
      prev_tc_no,
      status = 'submitted',
    } = req.body;

    if (
      !branch_id ||
      !academic_year_id ||
      !class_id ||
      !student_name ||
      !gender ||
      !dob ||
      !father_name ||
      !father_phone ||
      !address_street ||
      !city ||
      !state ||
      !pincode
    ) {
      conn.release();
      return res.status(400).json({
        message: 'Required fields missing: branch, academic year, class, student details, father details, and complete address',
      });
    }

    // Check branch workflow setting
    const [workflowRows] = await conn.query(
      `SELECT enable_application FROM branch_admission_workflows WHERE branch_id = ?`,
      [branch_id]
    );
    if (workflowRows.length > 0 && !workflowRows[0].enable_application) {
      conn.release();
      return res.status(400).json({
        message: 'Application processing is disabled for this branch in workflow settings.',
      });
    }

    await conn.beginTransaction();

    const applicationNo = await getNextSequenceNumber(branch_id, academic_year_id, 'application', conn);

    const [result] = await conn.query(
      `INSERT INTO applications
       (application_no, enquiry_id, branch_id, academic_year_id, class_id, student_name, gender, dob, blood_group,
        aadhaar_no, religion, mother_tongue, father_name, father_occupation, father_phone, mother_name, mother_phone,
        address_street, city, state, pincode, prev_school_name, prev_class_passed, prev_tc_no, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationNo,
        enquiry_id ? Number(enquiry_id) : null,
        Number(branch_id),
        Number(academic_year_id),
        Number(class_id),
        student_name.trim(),
        gender,
        dob,
        blood_group || null,
        aadhaar_no || null,
        religion || null,
        mother_tongue || null,
        father_name.trim(),
        father_occupation || null,
        father_phone.trim(),
        mother_name || null,
        mother_phone || null,
        address_street.trim(),
        city.trim(),
        state.trim(),
        pincode.trim(),
        prev_school_name || null,
        prev_class_passed || null,
        prev_tc_no || null,
        status,
      ]
    );

    // If linked to enquiry, update enquiry stage
    if (enquiry_id) {
      await conn.query(
        `UPDATE enquiries SET stage = 'application', status = 'converted', updated_at = NOW() WHERE id = ?`,
        [enquiry_id]
      );
    }

    await conn.commit();

    const [created] = await query(
      `SELECT a.*, b.name AS branch_name, ay.name AS academic_year_name, c.name AS class_name
       FROM applications a
       JOIN branches b ON a.branch_id = b.id
       JOIN academic_years ay ON a.academic_year_id = ay.id
       JOIN classes c ON a.class_id = c.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: created,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await query(
      `SELECT a.*, 
              b.name AS branch_name, 
              ay.name AS academic_year_name, 
              c.name AS class_name,
              e.enquiry_no,
              e.primary_phone AS enquiry_phone
       FROM applications a
       JOIN branches b ON a.branch_id = b.id
       JOIN academic_years ay ON a.academic_year_id = ay.id
       JOIN classes c ON a.class_id = c.id
       LEFT JOIN enquiries e ON a.enquiry_id = e.id
       WHERE a.id = ?`,
      [id]
    );

    if (!rows) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ application: rows });
  } catch (error) {
    next(error);
  }
};

export const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      class_id,
      student_name,
      gender,
      dob,
      blood_group,
      aadhaar_no,
      religion,
      mother_tongue,
      father_name,
      father_occupation,
      father_phone,
      mother_name,
      mother_phone,
      address_street,
      city,
      state,
      pincode,
      prev_school_name,
      prev_class_passed,
      prev_tc_no,
      status,
    } = req.body;

    const [existing] = await query(`SELECT id FROM applications WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    await query(
      `UPDATE applications
       SET class_id = COALESCE(?, class_id),
           student_name = COALESCE(?, student_name),
           gender = COALESCE(?, gender),
           dob = COALESCE(?, dob),
           blood_group = COALESCE(?, blood_group),
           aadhaar_no = COALESCE(?, aadhaar_no),
           religion = COALESCE(?, religion),
           mother_tongue = COALESCE(?, mother_tongue),
           father_name = COALESCE(?, father_name),
           father_occupation = COALESCE(?, father_occupation),
           father_phone = COALESCE(?, father_phone),
           mother_name = COALESCE(?, mother_name),
           mother_phone = COALESCE(?, mother_phone),
           address_street = COALESCE(?, address_street),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           pincode = COALESCE(?, pincode),
           prev_school_name = COALESCE(?, prev_school_name),
           prev_class_passed = COALESCE(?, prev_class_passed),
           prev_tc_no = COALESCE(?, prev_tc_no),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ?`,
      [
        class_id ? Number(class_id) : null,
        student_name ? student_name.trim() : null,
        gender || null,
        dob || null,
        blood_group !== undefined ? blood_group : null,
        aadhaar_no !== undefined ? aadhaar_no : null,
        religion !== undefined ? religion : null,
        mother_tongue !== undefined ? mother_tongue : null,
        father_name ? father_name.trim() : null,
        father_occupation !== undefined ? father_occupation : null,
        father_phone ? father_phone.trim() : null,
        mother_name !== undefined ? mother_name : null,
        mother_phone !== undefined ? mother_phone : null,
        address_street !== undefined ? address_street : null,
        city !== undefined ? city : null,
        state !== undefined ? state : null,
        pincode !== undefined ? pincode : null,
        prev_school_name !== undefined ? prev_school_name : null,
        prev_class_passed !== undefined ? prev_class_passed : null,
        prev_tc_no !== undefined ? prev_tc_no : null,
        status || null,
        id,
      ]
    );

    const [updated] = await query(
      `SELECT a.*, b.name AS branch_name, ay.name AS academic_year_name, c.name AS class_name
       FROM applications a
       JOIN branches b ON a.branch_id = b.id
       JOIN academic_years ay ON a.academic_year_id = ay.id
       JOIN classes c ON a.class_id = c.id
       WHERE a.id = ?`,
      [id]
    );

    res.json({
      message: 'Application updated successfully',
      application: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['submitted', 'verified', 'approved', 'admitted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const [existing] = await query(`SELECT * FROM applications WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Application not found' });
    }

    await query(`UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?`, [status, id]);

    const [updated] = await query(`SELECT * FROM applications WHERE id = ?`, [id]);
    res.json({
      message: `Application status updated to ${status}`,
      application: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const finalizeAdmission = async (req, res, next) => {
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
    } = req.body;

    if (!section_id) {
      conn.release();
      return res.status(400).json({ message: 'Section allocation is required to finalize admission' });
    }

    const [appRows] = await conn.query(`SELECT * FROM applications WHERE id = ?`, [id]);
    if (appRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Application not found' });
    }
    const app = appRows[0];

    if (app.status === 'admitted') {
      conn.release();
      return res.status(400).json({ message: 'This application has already been admitted.' });
    }

    // Capacity validation on Section
    const [secRows] = await conn.query(
      `SELECT s.id, s.name, s.capacity, s.class_id 
       FROM branch_class_sections s 
       WHERE s.id = ? AND s.branch_id = ?`,
      [section_id, app.branch_id]
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
        message: `Section "${section.name}" has reached maximum capacity (${enrolled}/${section.capacity} seats). Please choose another section.`,
        capacity_exceeded: true,
      });
    }

    await conn.beginTransaction();

    // Generate admission_no
    const admissionNo = await getNextSequenceNumber(app.branch_id, app.academic_year_id, 'admission', conn);

    const [admResult] = await conn.query(
      `INSERT INTO admissions
       (admission_no, application_id, enquiry_id, branch_id, academic_year_id, class_id, section_id,
        student_name, gender, dob, parent_name, primary_phone, address_street, city,
        admission_date, roll_no, admission_category, emergency_contact_name, emergency_contact_phone, enrollment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        admissionNo,
        app.id,
        app.enquiry_id || null,
        app.branch_id,
        app.academic_year_id,
        app.class_id,
        Number(section_id),
        app.student_name,
        app.gender,
        app.dob,
        app.father_name,
        app.father_phone,
        app.address_street,
        app.city,
        admission_date,
        roll_no || null,
        admission_category || 'general',
        emergency_contact_name || app.father_name,
        emergency_contact_phone || app.father_phone,
      ]
    );

    // Update application status
    await conn.query(
      `UPDATE applications SET status = 'admitted', updated_at = NOW() WHERE id = ?`,
      [app.id]
    );

    // If enquiry linked, mark it converted/admitted
    if (app.enquiry_id) {
      await conn.query(
        `UPDATE enquiries SET stage = 'admitted', status = 'converted', updated_at = NOW() WHERE id = ?`,
        [app.enquiry_id]
      );
      await conn.query(
        `INSERT INTO enquiry_followups
         (enquiry_id, followup_date, interaction_type, notes, response_status, handled_by)
         VALUES (?, NOW(), 'campus_visit', ?, 'interested', ?)`,
        [
          app.enquiry_id,
          `Application ${app.application_no} finalized to Admission: ${admissionNo}`,
          req.user?.id || null,
        ]
      );
    }

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
      message: 'Admission finalized successfully',
      admission: createdAdmission,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
