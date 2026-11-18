import { pool, query } from '../../config/database.js';
import { getNextSequenceNumber } from '../../services/sequenceService.js';

export const getStudents = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      status,
      enrollment_status,
      academic_group_id,
      admission_category,
      search,
      page,
      limit,
    } = req.query;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    let sql = `
      SELECT s.*,
             se.id AS enrollment_id,
             se.roll_no,
             se.admission_category,
             se.academic_group_id,
             se.enrollment_status,
             se.created_at AS enrolled_at,
             c.id AS class_id,
             c.name AS class_name,
             c.code AS class_code,
             sec.id AS section_id,
             sec.name AS section_name,
             b.id AS branch_id,
             b.name AS branch_name,
             b.code AS branch_code,
             ay.id AS academic_year_id,
             ay.name AS academic_year_name,
             ag.name AS academic_group_name
      FROM students s
      JOIN student_enrollments se ON se.student_id = s.id
      JOIN classes c ON se.class_id = c.id
      JOIN branch_class_sections sec ON se.section_id = sec.id
      JOIN branches b ON se.branch_id = b.id
      JOIN academic_years ay ON se.academic_year_id = ay.id
      LEFT JOIN academic_groups ag ON se.academic_group_id = ag.id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveBranchId) {
      sql += ' AND se.branch_id = ?';
      params.push(Number(effectiveBranchId));
    }

    if (academic_year_id) {
      sql += ' AND se.academic_year_id = ?';
      params.push(Number(academic_year_id));
    } else {
      // Default to current enrollments if no academic year specified
      if (!enrollment_status) {
        sql += " AND se.enrollment_status = 'current'";
      }
    }

    if (class_id) {
      sql += ' AND se.class_id = ?';
      params.push(Number(class_id));
    }

    if (section_id) {
      sql += ' AND se.section_id = ?';
      params.push(Number(section_id));
    }

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    if (enrollment_status) {
      sql += ' AND se.enrollment_status = ?';
      params.push(enrollment_status);
    }

    if (academic_group_id) {
      sql += ' AND se.academic_group_id = ?';
      params.push(Number(academic_group_id));
    }

    if (admission_category) {
      sql += ' AND se.admission_category = ?';
      params.push(admission_category);
    }

    if (search) {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        s.admission_no LIKE ? OR
        s.student_name LIKE ? OR
        s.father_name LIKE ? OR
        s.father_phone LIKE ? OR
        s.mother_phone LIKE ? OR
        s.aadhaar_no LIKE ? OR
        se.roll_no LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term);
    }

    sql += ' ORDER BY c.display_order ASC, sec.name ASC, CAST(se.roll_no AS UNSIGNED) ASC, s.student_name ASC';

    if (limit) {
      const l = parseInt(limit, 10) || 50;
      const p = parseInt(page, 10) || 1;
      const offset = (p - 1) * l;
      sql += ' LIMIT ? OFFSET ?';
      params.push(l, offset);
    }

    const students = await query(sql, params);
    res.json({ students, total: students.length });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [students] = await pool.query(
      'SELECT * FROM students WHERE id = ? OR admission_no = ?',
      [id, id]
    );

    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = students[0];

    // Fetch all enrollments
    const [enrollments] = await pool.query(
      `SELECT se.*,
              c.name AS class_name,
              c.code AS class_code,
              sec.name AS section_name,
              sec.room_no,
              b.name AS branch_name,
              b.code AS branch_code,
              ay.name AS academic_year_name,
              ag.name AS academic_group_name
       FROM student_enrollments se
       JOIN classes c ON se.class_id = c.id
       JOIN branch_class_sections sec ON se.section_id = sec.id
       JOIN branches b ON se.branch_id = b.id
       JOIN academic_years ay ON se.academic_year_id = ay.id
       LEFT JOIN academic_groups ag ON se.academic_group_id = ag.id
       WHERE se.student_id = ?
       ORDER BY se.id DESC`,
      [student.id]
    );

    const currentEnrollment =
      enrollments.find((e) => e.enrollment_status === 'current') || enrollments[0] || null;

    if (currentEnrollment) {
      student.branch_id = currentEnrollment.branch_id;
      student.branch_name = currentEnrollment.branch_name;
      student.academic_year_id = currentEnrollment.academic_year_id;
      student.academic_year_name = currentEnrollment.academic_year_name;
      student.class_id = currentEnrollment.class_id;
      student.class_name = currentEnrollment.class_name;
      student.section_id = currentEnrollment.section_id;
      student.section_name = currentEnrollment.section_name;
      student.roll_no = currentEnrollment.roll_no || student.roll_no || '';
      student.admission_category = currentEnrollment.admission_category || student.admission_category || 'General';
      student.academic_group_id = currentEnrollment.academic_group_id;
    }

    // Fetch subject mappings
    let subjects = [];
    if (currentEnrollment) {
      const [subjRows] = await pool.query(
        `SELECT ssm.*, sub.name AS subject_name, sub.code AS subject_code
         FROM student_subject_mappings ssm
         JOIN subjects sub ON ssm.subject_id = sub.id
         WHERE ssm.student_id = ? AND ssm.enrollment_id = ?
         ORDER BY sub.name ASC`,
        [student.id, currentEnrollment.id]
      );
      subjects = subjRows;
    }

    // Fetch transfer certificates
    const [tcs] = await pool.query(
      `SELECT tc.*, b.name AS branch_name, u.name AS created_by_name
       FROM transfer_certificates tc
       JOIN branches b ON tc.branch_id = b.id
       LEFT JOIN users u ON tc.created_by = u.id
       WHERE tc.student_id = ?
       ORDER BY tc.id DESC`,
      [student.id]
    );

    // Fetch linked user account if any
    let linkedUser = null;
    try {
      const [users] = await pool.query(
        `SELECT id, name, username, role, phone, status
         FROM users 
         WHERE username = ? OR username = ? OR phone = ?`,
        [student.admission_no, student.father_email || '', student.father_phone || '']
      );
      if (users.length > 0) {
        linkedUser = {
          ...users[0],
          email: users[0].username,
        };
      }
    } catch (_uErr) {
      // Non-fatal if users table has no matching row
    }

    res.json({
      student,
      current_enrollment: currentEnrollment,
      enrollments,
      subjects,
      transfer_certificates: tcs,
      user_account: linkedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req, res, next) => {
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
      admission_no,
      roll_no,
      admission_category = 'general',
      academic_group_id = null,
      blood_group,
      aadhaar_no,
      religion,
      caste_category,
      nationality = 'Indian',
      mother_tongue,
      avatar_url,
      father_name,
      father_phone,
      father_email,
      father_occupation,
      mother_name,
      mother_phone,
      guardian_name,
      guardian_phone,
      street_address,
      city,
      state,
      pincode,
      emergency_contact_name,
      emergency_contact_phone,
      medical_notes,
      bus_stop,
      previous_school,
      previous_class,
      previous_board,
      previous_tc_no,
      previous_tc_date,
      previous_school_address,
      previous_result,
      previous_reason_for_leaving,
      status = 'active',
    } = req.body;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    if (!effectiveBranchId || !academic_year_id || !class_id || !section_id || !student_name || !gender || !dob) {
      conn.release();
      return res.status(400).json({
        message: 'Required fields missing: branch, academic year, class, section, student name, gender, dob',
      });
    }

    await conn.beginTransaction();

    // Generate admission_no if not supplied
    let finalAdmissionNo = admission_no ? admission_no.trim() : null;
    if (!finalAdmissionNo) {
      finalAdmissionNo = await getNextSequenceNumber(
        effectiveBranchId,
        academic_year_id,
        'admission',
        conn
      );
    }

    // Check unique admission_no
    const [existing] = await conn.query('SELECT id FROM students WHERE admission_no = ?', [
      finalAdmissionNo,
    ]);
    if (existing.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        message: `Student with admission number "${finalAdmissionNo}" already exists.`,
      });
    }

    // Insert into students
    const [studentResult] = await conn.query(
      `INSERT INTO students
       (admission_no, student_name, gender, dob, blood_group, aadhaar_no, religion,
        caste_category, nationality, mother_tongue, avatar_url, father_name, father_phone,
        father_email, father_occupation, mother_name, mother_phone, guardian_name,
        guardian_phone, street_address, city, state, pincode, emergency_contact_name,
        emergency_contact_phone, medical_notes, bus_stop, previous_school,
        previous_class, previous_board, previous_tc_no, previous_tc_date,
        previous_school_address, previous_result, previous_reason_for_leaving, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalAdmissionNo,
        student_name.trim(),
        gender,
        dob,
        blood_group || null,
        aadhaar_no || null,
        religion || null,
        caste_category || null,
        nationality || 'Indian',
        mother_tongue || null,
        avatar_url || null,
        father_name || null,
        father_phone || null,
        father_email || null,
        father_occupation || null,
        mother_name || null,
        mother_phone || null,
        guardian_name || null,
        guardian_phone || null,
        street_address || null,
        city || null,
        state || null,
        pincode || null,
        emergency_contact_name || father_name || null,
        emergency_contact_phone || father_phone || null,
        medical_notes || null,
        bus_stop || null,
        previous_school || null,
        previous_class || null,
        previous_board || null,
        previous_tc_no || null,
        previous_tc_date || null,
        previous_school_address || null,
        previous_result || null,
        previous_reason_for_leaving || null,
        status || 'active',
      ]
    );

    const studentId = studentResult.insertId;

    // Insert into student_enrollments
    const [enrollResult] = await conn.query(
      `INSERT INTO student_enrollments
       (student_id, branch_id, academic_year_id, class_id, section_id, roll_no, admission_category, academic_group_id, enrollment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'current')`,
      [
        studentId,
        Number(effectiveBranchId),
        Number(academic_year_id),
        Number(class_id),
        Number(section_id),
        roll_no || null,
        admission_category || 'general',
        academic_group_id || null,
      ]
    );

    // Also populate admissions table for compatibility
    try {
      await conn.query(
        `INSERT INTO admissions
         (admission_no, application_id, enquiry_id, branch_id, academic_year_id, class_id, section_id,
          student_name, gender, dob, parent_name, primary_phone, address_street, city,
          admission_date, roll_no, admission_category, emergency_contact_name, emergency_contact_phone, enrollment_status)
         VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, 'active')`,
        [
          finalAdmissionNo,
          Number(effectiveBranchId),
          Number(academic_year_id),
          Number(class_id),
          Number(section_id),
          student_name.trim(),
          gender,
          dob,
          father_name || guardian_name || 'Parent',
          father_phone || guardian_phone || '',
          street_address || null,
          city || null,
          roll_no || null,
          admission_category || 'general',
          emergency_contact_name || father_name || null,
          emergency_contact_phone || father_phone || null,
        ]
      );
    } catch (_admErr) {
      // Non-fatal if admissions has duplicate or constraint
    }

    // Auto-create student portal credentials in users table:
    // Username = admission_no, Password = DOB in DDMMYYYY format, Plain-text ("password hash vendam")
    let studentPassword = 'Student@123';
    if (dob) {
      const dobStr = typeof dob === 'string' ? dob.split('T')[0] : new Date(dob).toISOString().split('T')[0];
      const parts = dobStr.split('-');
      if (parts.length === 3) {
        studentPassword = `${parts[2]}${parts[1]}${parts[0]}`; // DDMMYYYY
      }
    } else if (finalAdmissionNo) {
      studentPassword = finalAdmissionNo.replace(/[^a-zA-Z0-9]/g, '');
    }

    try {
      await conn.query(
        `INSERT INTO users (name, username, password, role, branch_id, phone, status)
         VALUES (?, ?, ?, 'student', ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           password = VALUES(password),
           branch_id = VALUES(branch_id),
           phone = VALUES(phone),
           status = 'active'`,
        [
          student_name.trim(),
          finalAdmissionNo,
          studentPassword,
          Number(effectiveBranchId),
          father_phone || guardian_phone || null,
        ]
      );
    } catch (_userErr) {
      console.error('Failed to auto-create user account for student:', _userErr);
    }

    await conn.commit();

    res.status(201).json({
      message: 'Student enrolled successfully',
      student_id: studentId,
      enrollment_id: enrollResult.insertId,
      admission_no: finalAdmissionNo,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const updateStudent = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      student_name,
      gender,
      dob,
      blood_group,
      aadhaar_no,
      religion,
      caste_category,
      nationality,
      mother_tongue,
      avatar_url,
      father_name,
      father_phone,
      father_email,
      father_occupation,
      mother_name,
      mother_phone,
      guardian_name,
      guardian_phone,
      street_address,
      city,
      state,
      pincode,
      emergency_contact_name,
      emergency_contact_phone,
      medical_notes,
      bus_stop,
      previous_school,
      previous_class,
      previous_board,
      previous_tc_no,
      previous_tc_date,
      previous_school_address,
      previous_result,
      previous_reason_for_leaving,
      status,
      // Enrollment updates
      roll_no,
      section_id,
      class_id,
      branch_id,
      academic_year_id,
      academic_group_id,
      admission_category,
      enrollment_status,
    } = req.body;

    const [existing] = await conn.query('SELECT * FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Student not found' });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE students SET
        student_name = COALESCE(?, student_name),
        gender = COALESCE(?, gender),
        dob = COALESCE(?, dob),
        blood_group = COALESCE(?, blood_group),
        aadhaar_no = COALESCE(?, aadhaar_no),
        religion = COALESCE(?, religion),
        caste_category = COALESCE(?, caste_category),
        nationality = COALESCE(?, nationality),
        mother_tongue = COALESCE(?, mother_tongue),
        avatar_url = COALESCE(?, avatar_url),
        father_name = COALESCE(?, father_name),
        father_phone = COALESCE(?, father_phone),
        father_email = COALESCE(?, father_email),
        father_occupation = COALESCE(?, father_occupation),
        mother_name = COALESCE(?, mother_name),
        mother_phone = COALESCE(?, mother_phone),
        guardian_name = COALESCE(?, guardian_name),
        guardian_phone = COALESCE(?, guardian_phone),
        street_address = COALESCE(?, street_address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        medical_notes = COALESCE(?, medical_notes),
        bus_stop = COALESCE(?, bus_stop),
        previous_school = COALESCE(?, previous_school),
        previous_class = COALESCE(?, previous_class),
        previous_board = COALESCE(?, previous_board),
        previous_tc_no = COALESCE(?, previous_tc_no),
        previous_tc_date = COALESCE(?, previous_tc_date),
        previous_school_address = COALESCE(?, previous_school_address),
        previous_result = COALESCE(?, previous_result),
        previous_reason_for_leaving = COALESCE(?, previous_reason_for_leaving),
        status = COALESCE(?, status),
        updated_at = NOW()
       WHERE id = ?`,
      [
        student_name !== undefined ? student_name.trim() : null,
        gender || null,
        dob || null,
        blood_group || null,
        aadhaar_no || null,
        religion || null,
        caste_category || null,
        nationality || null,
        mother_tongue || null,
        avatar_url || null,
        father_name || null,
        father_phone || null,
        father_email || null,
        father_occupation || null,
        mother_name || null,
        mother_phone || null,
        guardian_name || null,
        guardian_phone || null,
        street_address || null,
        city || null,
        state || null,
        pincode || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        medical_notes || null,
        bus_stop || null,
        previous_school || null,
        previous_class || null,
        previous_board || null,
        previous_tc_no || null,
        previous_tc_date || null,
        previous_school_address || null,
        previous_result || null,
        previous_reason_for_leaving || null,
        status || null,
        id,
      ]
    );

    // Update current enrollment if enrollment fields are passed
    if (
      roll_no !== undefined ||
      section_id !== undefined ||
      class_id !== undefined ||
      branch_id !== undefined ||
      academic_year_id !== undefined ||
      academic_group_id !== undefined ||
      admission_category !== undefined ||
      enrollment_status !== undefined
    ) {
      await conn.query(
        `UPDATE student_enrollments SET
          roll_no = COALESCE(?, roll_no),
          section_id = COALESCE(?, section_id),
          class_id = COALESCE(?, class_id),
          branch_id = COALESCE(?, branch_id),
          academic_year_id = COALESCE(?, academic_year_id),
          academic_group_id = COALESCE(?, academic_group_id),
          admission_category = COALESCE(?, admission_category),
          enrollment_status = COALESCE(?, enrollment_status),
          updated_at = NOW()
         WHERE student_id = ? AND enrollment_status = 'current'`,
        [
          roll_no !== undefined ? roll_no : null,
          section_id ? Number(section_id) : null,
          class_id ? Number(class_id) : null,
          branch_id ? Number(branch_id) : null,
          academic_year_id ? Number(academic_year_id) : null,
          academic_group_id ? Number(academic_group_id) : null,
          admission_category || null,
          enrollment_status || null,
          id,
        ]
      );
    }

    await conn.commit();
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const bulkUpdateStudents = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const updates = req.body.updates || req.body.students || [];

    if (!Array.isArray(updates) || updates.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'Array of student updates required' });
    }

    await conn.beginTransaction();

    for (const item of updates) {
      const studentId = item.id || item.student_id;
      if (!studentId) continue;

      // Update student fields
      await conn.query(
        `UPDATE students SET
          student_name = COALESCE(?, student_name),
          gender = COALESCE(?, gender),
          dob = COALESCE(?, dob),
          blood_group = COALESCE(?, blood_group),
          aadhaar_no = COALESCE(?, aadhaar_no),
          religion = COALESCE(?, religion),
          caste_category = COALESCE(?, caste_category),
          nationality = COALESCE(?, nationality),
          mother_tongue = COALESCE(?, mother_tongue),
          medical_notes = COALESCE(?, medical_notes),
          father_name = COALESCE(?, father_name),
          father_phone = COALESCE(?, father_phone),
          father_email = COALESCE(?, father_email),
          father_occupation = COALESCE(?, father_occupation),
          mother_name = COALESCE(?, mother_name),
          mother_phone = COALESCE(?, mother_phone),
          mother_email = COALESCE(?, mother_email),
          mother_occupation = COALESCE(?, mother_occupation),
          guardian_name = COALESCE(?, guardian_name),
          guardian_phone = COALESCE(?, guardian_phone),
          street_address = COALESCE(?, street_address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode),
          bus_stop = COALESCE(?, bus_stop),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          previous_school = COALESCE(?, previous_school),
          previous_class = COALESCE(?, previous_class),
          previous_board = COALESCE(?, previous_board),
          previous_tc_no = COALESCE(?, previous_tc_no),
          previous_tc_date = COALESCE(?, previous_tc_date),
          previous_school_address = COALESCE(?, previous_school_address),
          previous_result = COALESCE(?, previous_result),
          previous_reason_for_leaving = COALESCE(?, previous_reason_for_leaving),
          status = COALESCE(?, status),
          updated_at = NOW()
         WHERE id = ?`,
        [
          item.student_name !== undefined ? item.student_name.trim() : null,
          item.gender || null,
          item.dob || null,
          item.blood_group || null,
          item.aadhaar_no || null,
          item.religion || null,
          item.caste_category || null,
          item.nationality || null,
          item.mother_tongue || null,
          item.medical_notes || null,
          item.father_name || null,
          item.father_phone || item.phone || item.primary_phone || null,
          item.father_email || null,
          item.father_occupation || null,
          item.mother_name || null,
          item.mother_phone || null,
          item.mother_email || null,
          item.mother_occupation || null,
          item.guardian_name || null,
          item.guardian_phone || null,
          item.street_address || null,
          item.city || null,
          item.state || null,
          item.pincode || null,
          item.bus_stop || null,
          item.emergency_contact_phone || null,
          item.previous_school || null,
          item.previous_class || null,
          item.previous_board || null,
          item.previous_tc_no || null,
          item.previous_tc_date || null,
          item.previous_school_address || null,
          item.previous_result || null,
          item.previous_reason_for_leaving || null,
          item.status || null,
          studentId,
        ]
      );

      // Update enrollment fields
      if (
        item.roll_no !== undefined ||
        item.section_id !== undefined ||
        item.admission_category !== undefined ||
        item.academic_group_id !== undefined ||
        item.enrollment_status !== undefined
      ) {
        await conn.query(
          `UPDATE student_enrollments SET
            roll_no = COALESCE(?, roll_no),
            section_id = COALESCE(?, section_id),
            admission_category = COALESCE(?, admission_category),
            academic_group_id = COALESCE(?, academic_group_id),
            enrollment_status = COALESCE(?, enrollment_status),
            updated_at = NOW()
           WHERE student_id = ? AND enrollment_status = 'current'`,
          [
            item.roll_no !== undefined ? String(item.roll_no) : null,
            item.section_id ? Number(item.section_id) : null,
            item.admission_category || null,
            item.academic_group_id ? Number(item.academic_group_id) : null,
            item.enrollment_status || null,
            studentId,
          ]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Bulk update applied successfully', updated_count: updates.length });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const importStudentsCSV = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      branch_id,
      academic_year_id,
      students: rawStudents,
    } = req.body;

    const list = Array.isArray(rawStudents) ? rawStudents : req.body;
    if (!Array.isArray(list) || list.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'No student records provided for import' });
    }

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const defaultBranchId = userBranchId || branch_id;

    await conn.beginTransaction();

    let importedCount = 0;
    const errors = [];

    // Pre-cache classes and sections for lookup
    const [classes] = await conn.query('SELECT id, name, code FROM classes');
    const [sections] = await conn.query('SELECT id, branch_id, class_id, name FROM branch_class_sections');

    for (let index = 0; index < list.length; index++) {
      const row = list[index];
      const targetBranchId = Number(row.branch_id || defaultBranchId);
      const targetYearId = Number(row.academic_year_id || academic_year_id);

      if (!targetBranchId || !targetYearId) {
        errors.push({ index, row, error: 'Branch ID and Academic Year ID required' });
        continue;
      }

      if (!row.student_name || !row.gender) {
        errors.push({ index, row, error: 'Student Name and Gender required' });
        continue;
      }

      // Resolve class_id
      let resolvedClassId = row.class_id ? Number(row.class_id) : null;
      if (!resolvedClassId && row.class_name) {
        const found = classes.find(
          (c) => c.name.toLowerCase() === String(row.class_name).trim().toLowerCase()
        );
        if (found) resolvedClassId = found.id;
      }

      // Resolve section_id
      let resolvedSectionId = row.section_id ? Number(row.section_id) : null;
      if (!resolvedSectionId && (row.section_name || row.section)) {
        const secName = String(row.section_name || row.section).trim().toLowerCase();
        const foundSec = sections.find(
          (s) =>
            s.branch_id === targetBranchId &&
            (!resolvedClassId || s.class_id === resolvedClassId) &&
            s.name.toLowerCase() === secName
        );
        if (foundSec) resolvedSectionId = foundSec.id;
      }

      if (!resolvedClassId || !resolvedSectionId) {
        errors.push({
          index,
          row,
          error: `Could not resolve Class (${row.class_name || row.class_id}) or Section (${row.section_name || row.section_id})`,
        });
        continue;
      }

      // Generate admission_no if needed
      let admNo = row.admission_no ? String(row.admission_no).trim() : null;
      if (!admNo) {
        admNo = await getNextSequenceNumber(targetBranchId, targetYearId, 'admission', conn);
      }

      // Check unique
      const [existing] = await conn.query('SELECT id FROM students WHERE admission_no = ?', [admNo]);
      let studentId;

      if (existing.length > 0) {
        studentId = existing[0].id;
      } else {
        const [insRes] = await conn.query(
          `INSERT INTO students
           (admission_no, student_name, gender, dob, blood_group, aadhaar_no, religion,
            caste_category, nationality, mother_tongue, father_name, father_phone,
            father_email, mother_name, mother_phone, street_address, city, state, pincode,
            emergency_contact_name, emergency_contact_phone, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            admNo,
            row.student_name.trim(),
            row.gender.toLowerCase() === 'female' ? 'female' : row.gender.toLowerCase() === 'male' ? 'male' : 'other',
            row.dob || '2015-01-01',
            row.blood_group || null,
            row.aadhaar_no || null,
            row.religion || null,
            row.caste_category || null,
            row.nationality || 'Indian',
            row.mother_tongue || null,
            row.father_name || row.parent_name || null,
            row.father_phone || row.phone || null,
            row.father_email || row.email || null,
            row.mother_name || null,
            row.mother_phone || null,
            row.street_address || row.address || null,
            row.city || null,
            row.state || null,
            row.pincode || null,
            row.emergency_contact_name || row.father_name || null,
            row.emergency_contact_phone || row.father_phone || null,
          ]
        );
        studentId = insRes.insertId;
      }

      // Create enrollment if not already enrolled for this year
      const [existingEnr] = await conn.query(
        'SELECT id FROM student_enrollments WHERE student_id = ? AND academic_year_id = ?',
        [studentId, targetYearId]
      );

      if (existingEnr.length === 0) {
        await conn.query(
          `INSERT INTO student_enrollments
           (student_id, branch_id, academic_year_id, class_id, section_id, roll_no, admission_category, enrollment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'current')`,
          [
            studentId,
            targetBranchId,
            targetYearId,
            resolvedClassId,
            resolvedSectionId,
            row.roll_no ? String(row.roll_no) : null,
            row.admission_category || 'general',
          ]
        );
      }

      importedCount++;
    }

    await conn.commit();
    res.json({
      message: `Import processed: ${importedCount} succeeded, ${errors.length} failed`,
      imported_count: importedCount,
      failed_count: errors.length,
      errors,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await pool.query("UPDATE students SET status = 'inactive', updated_at = NOW() WHERE id = ?", [id]);
    await pool.query(
      "UPDATE student_enrollments SET enrollment_status = 'inactive', updated_at = NOW() WHERE student_id = ? AND enrollment_status = 'current'",
      [id]
    );

    res.json({ message: 'Student record deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

