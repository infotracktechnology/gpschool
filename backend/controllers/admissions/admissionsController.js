import { pool, query } from '../../config/database.js';
import { getNextSequenceNumber } from '../../services/sequenceService.js';

export const getStudents = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      admission_category,
      enrollment_status,
      search,
    } = req.query;

    let sql = `
      SELECT adm.*,
             b.name AS branch_name,
             ay.name AS academic_year_name,
             c.name AS class_name,
             s.name AS section_name,
             app.application_no,
             enq.enquiry_no
      FROM admissions adm
      JOIN branches b ON adm.branch_id = b.id
      JOIN academic_years ay ON adm.academic_year_id = ay.id
      JOIN classes c ON adm.class_id = c.id
      JOIN branch_class_sections s ON adm.section_id = s.id
      LEFT JOIN applications app ON adm.application_id = app.id
      LEFT JOIN enquiries enq ON adm.enquiry_id = enq.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      sql += ' AND adm.branch_id = ?';
      params.push(Number(branch_id));
    }
    if (academic_year_id) {
      sql += ' AND adm.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (class_id) {
      sql += ' AND adm.class_id = ?';
      params.push(Number(class_id));
    }
    if (section_id) {
      sql += ' AND adm.section_id = ?';
      params.push(Number(section_id));
    }
    if (admission_category) {
      sql += ' AND adm.admission_category = ?';
      params.push(admission_category);
    }
    if (enrollment_status) {
      sql += ' AND adm.enrollment_status = ?';
      params.push(enrollment_status);
    }
    if (search) {
      sql += ` AND (
        adm.admission_no LIKE ? OR 
        adm.student_name LIKE ? OR 
        adm.parent_name LIKE ? OR 
        adm.primary_phone LIKE ? OR
        adm.roll_no LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    sql += ' ORDER BY adm.admission_date DESC, adm.id DESC';

    const admissions = await query(sql, params);
    res.json({ admissions });
  } catch (error) {
    next(error);
  }
};

export const directAdmissionWalkin = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      student_name,
      gender,
      dob,
      parent_name,
      primary_phone,
      address_street,
      city,
      admission_date = new Date().toISOString().split('T')[0],
      roll_no,
      admission_category = 'general',
      emergency_contact_name,
      emergency_contact_phone,
    } = req.body;

    if (!branch_id || !academic_year_id || !class_id || !section_id || !student_name || !gender || !dob || !parent_name || !primary_phone) {
      conn.release();
      return res.status(400).json({
        message: 'Required fields missing: branch, academic year, class, section, student name, gender, dob, parent name, and primary phone',
      });
    }

    // Check branch workflow setting
    const [workflowRows] = await conn.query(
      `SELECT allow_direct_walkin_admission FROM branch_admission_workflows WHERE branch_id = ?`,
      [branch_id]
    );
    if (workflowRows.length > 0 && !workflowRows[0].allow_direct_walkin_admission) {
      conn.release();
      return res.status(400).json({
        message: 'Direct walk-in admission without enquiry/application is disabled for this branch in workflow settings.',
      });
    }

    // Section capacity check
    const [secRows] = await conn.query(
      `SELECT s.id, s.name, s.capacity 
       FROM branch_class_sections s 
       WHERE s.id = ? AND s.branch_id = ?`,
      [section_id, branch_id]
    );
    if (secRows.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'Selected section does not belong to this branch' });
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
        message: `Section "${section.name}" is already at full capacity (${enrolled}/${section.capacity} seats).`,
        capacity_exceeded: true,
      });
    }

    await conn.beginTransaction();

    const admissionNo = await getNextSequenceNumber(branch_id, academic_year_id, 'admission', conn);

    const [admResult] = await conn.query(
      `INSERT INTO admissions
       (admission_no, application_id, enquiry_id, branch_id, academic_year_id, class_id, section_id,
        student_name, gender, dob, parent_name, primary_phone, address_street, city,
        admission_date, roll_no, admission_category, emergency_contact_name, emergency_contact_phone, enrollment_status)
       VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        admissionNo,
        Number(branch_id),
        Number(academic_year_id),
        Number(class_id),
        Number(section_id),
        student_name.trim(),
        gender,
        dob,
        parent_name.trim(),
        primary_phone.trim(),
        address_street || null,
        city || null,
        admission_date,
        roll_no || null,
        admission_category || 'general',
        emergency_contact_name || parent_name.trim(),
        emergency_contact_phone || primary_phone.trim(),
      ]
    );

    await conn.commit();

    const [created] = await query(
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
      message: 'Direct walk-in admission enrolled successfully',
      admission: created,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await query(
      `SELECT adm.*,
              b.name AS branch_name,
              b.code AS branch_code,
              ay.name AS academic_year_name,
              c.name AS class_name,
              s.name AS section_name,
              s.room_no,
              app.application_no,
              app.blood_group,
              app.aadhaar_no,
              app.religion,
              app.mother_tongue,
              app.father_occupation,
              app.mother_name,
              app.mother_phone,
              app.prev_school_name,
              enq.enquiry_no
       FROM admissions adm
       JOIN branches b ON adm.branch_id = b.id
       JOIN academic_years ay ON adm.academic_year_id = ay.id
       JOIN classes c ON adm.class_id = c.id
       JOIN branch_class_sections s ON adm.section_id = s.id
       LEFT JOIN applications app ON adm.application_id = app.id
       LEFT JOIN enquiries enq ON adm.enquiry_id = enq.id
       WHERE adm.id = ?`,
      [id]
    );

    if (!rows) {
      return res.status(404).json({ message: 'Admitted student not found' });
    }

    res.json({ admission: rows });
  } catch (error) {
    next(error);
  }
};
