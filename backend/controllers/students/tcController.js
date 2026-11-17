import { pool, query } from '../../config/database.js';

export const issueTC = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      student_id,
      enrollment_id,
      branch_id,
      issue_date = new Date().toISOString().split('T')[0],
      leaving_date = new Date().toISOString().split('T')[0],
      reason_for_leaving,
      conduct = 'Good',
      dues_cleared = true,
      last_class_studied,
      promoted_to_class,
      remarks,
    } = req.body;

    if (!student_id) {
      conn.release();
      return res.status(400).json({ message: 'student_id is required' });
    }

    // Verify student
    const [students] = await conn.query('SELECT * FROM students WHERE id = ?', [student_id]);
    if (students.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Student not found' });
    }
    const student = students[0];

    // Get current enrollment
    let targetEnrollmentId = enrollment_id;
    let targetBranchId = branch_id;
    let autoClassStudied = last_class_studied;

    if (!targetEnrollmentId || !targetBranchId || !autoClassStudied) {
      const [enrRows] = await conn.query(
        `SELECT se.*, c.name AS class_name 
         FROM student_enrollments se
         JOIN classes c ON se.class_id = c.id
         WHERE se.student_id = ?
         ORDER BY (se.enrollment_status = 'current') DESC, se.id DESC LIMIT 1`,
        [student_id]
      );
      if (enrRows.length > 0) {
        targetEnrollmentId = targetEnrollmentId || enrRows[0].id;
        targetBranchId = targetBranchId || enrRows[0].branch_id;
        autoClassStudied = autoClassStudied || enrRows[0].class_name;
      }
    }

    if (!targetEnrollmentId || !targetBranchId) {
      conn.release();
      return res.status(400).json({ message: 'Could not resolve active enrollment or branch for student' });
    }

    await conn.beginTransaction();

    // Generate unique TC number
    const [branchRows] = await conn.query('SELECT code, name FROM branches WHERE id = ?', [targetBranchId]);
    const branchCode = branchRows.length > 0 && branchRows[0].code ? branchRows[0].code : `B${targetBranchId}`;
    const yearPart = new Date(issue_date).getFullYear();

    const [tcCountRows] = await conn.query(
      `SELECT COUNT(*) AS total FROM transfer_certificates WHERE branch_id = ?`,
      [targetBranchId]
    );
    const seq = String(tcCountRows[0].total + 1).padStart(4, '0');
    const tcNo = `TC/${branchCode}/${yearPart}/${seq}`;

    // Insert TC
    const [tcResult] = await conn.query(
      `INSERT INTO transfer_certificates
       (tc_no, student_id, enrollment_id, branch_id, issue_date, leaving_date,
        reason_for_leaving, conduct, dues_cleared, last_class_studied, promoted_to_class, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tcNo,
        student_id,
        targetEnrollmentId,
        targetBranchId,
        issue_date,
        leaving_date,
        reason_for_leaving || 'Parent request',
        conduct || 'Good',
        dues_cleared ? 1 : 0,
        autoClassStudied || 'N/A',
        promoted_to_class || null,
        remarks || null,
        req.user ? req.user.id : null,
      ]
    );

    // Update student status to 'transferred'
    await conn.query(`UPDATE students SET status = 'transferred', updated_at = NOW() WHERE id = ?`, [
      student_id,
    ]);

    // Update enrollment status to 'transferred'
    await conn.query(
      `UPDATE student_enrollments SET enrollment_status = 'transferred', updated_at = NOW() WHERE id = ?`,
      [targetEnrollmentId]
    );

    await conn.commit();

    const [createdTC] = await query(
      `SELECT tc.*, s.student_name, s.admission_no, b.name AS branch_name
       FROM transfer_certificates tc
       JOIN students s ON tc.student_id = s.id
       JOIN branches b ON tc.branch_id = b.id
       WHERE tc.id = ?`,
      [tcResult.insertId]
    );

    res.status(201).json({
      message: 'Transfer Certificate generated successfully',
      transfer_certificate: createdTC,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const getTCList = async (req, res, next) => {
  try {
    const { branch_id, search, limit, page } = req.query;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    let sql = `
      SELECT tc.*,
             s.admission_no,
             s.student_name,
             s.gender,
             s.dob,
             s.father_name,
             s.father_phone,
             b.name AS branch_name,
             b.code AS branch_code,
             u.name AS created_by_name
      FROM transfer_certificates tc
      JOIN students s ON tc.student_id = s.id
      JOIN branches b ON tc.branch_id = b.id
      LEFT JOIN users u ON tc.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveBranchId) {
      sql += ' AND tc.branch_id = ?';
      params.push(Number(effectiveBranchId));
    }

    if (search) {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        tc.tc_no LIKE ? OR
        s.admission_no LIKE ? OR
        s.student_name LIKE ? OR
        s.father_name LIKE ?
      )`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY tc.issue_date DESC, tc.id DESC';

    if (limit) {
      const l = parseInt(limit, 10) || 50;
      const p = parseInt(page, 10) || 1;
      const offset = (p - 1) * l;
      sql += ' LIMIT ? OFFSET ?';
      params.push(l, offset);
    }

    const certificates = await query(sql, params);
    res.json({ certificates, total: certificates.length });
  } catch (error) {
    next(error);
  }
};

export const getTCById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT tc.*,
              s.admission_no,
              s.student_name,
              s.gender,
              s.dob,
              s.nationality,
              s.religion,
              s.caste_category,
              s.mother_tongue,
              s.father_name,
              s.mother_name,
              s.guardian_name,
              s.street_address,
              s.city,
              s.state,
              s.pincode,
              b.name AS branch_name,
              b.code AS branch_code,
              c.name AS class_name,
              sec.name AS section_name,
              ay.name AS academic_year_name,
              u.name AS created_by_name
       FROM transfer_certificates tc
       JOIN students s ON tc.student_id = s.id
       JOIN branches b ON tc.branch_id = b.id
       JOIN student_enrollments se ON tc.enrollment_id = se.id
       JOIN classes c ON se.class_id = c.id
       JOIN branch_class_sections sec ON se.section_id = sec.id
       JOIN academic_years ay ON se.academic_year_id = ay.id
       LEFT JOIN users u ON tc.created_by = u.id
       WHERE tc.id = ? OR tc.tc_no = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Transfer Certificate not found' });
    }

    res.json({ certificate: rows[0] });
  } catch (error) {
    next(error);
  }
};
