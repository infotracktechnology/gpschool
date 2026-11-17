import bcrypt from 'bcryptjs';
import { pool, query } from '../../config/database.js';

export const previewCredentials = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      username_rule = 'admission_no', // 'admission_no' | 'name_roll' | 'roll_no' | 'email'
      password_rule = 'default', // 'default' | 'dob_ddmmyyyy' | 'admission_no'
      default_password = 'Password@123',
    } = req.body;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    if (!class_id) {
      return res.status(400).json({ message: 'class_id is required' });
    }

    let studentSql = `
      SELECT s.id AS student_id,
             s.admission_no,
             s.student_name,
             s.dob,
             s.father_email,
             s.father_phone,
             se.roll_no,
             se.branch_id,
             c.name AS class_name,
             sec.name AS section_name
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      JOIN classes c ON se.class_id = c.id
      JOIN branch_class_sections sec ON se.section_id = sec.id
      WHERE se.class_id = ? AND se.enrollment_status = 'current'
    `;
    const params = [Number(class_id)];

    if (effectiveBranchId) {
      studentSql += ' AND se.branch_id = ?';
      params.push(Number(effectiveBranchId));
    }
    if (academic_year_id) {
      studentSql += ' AND se.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (section_id) {
      studentSql += ' AND se.section_id = ?';
      params.push(Number(section_id));
    }

    studentSql += ' ORDER BY sec.name ASC, CAST(se.roll_no AS UNSIGNED) ASC, s.student_name ASC';

    const students = await query(studentSql, params);

    // Fetch existing student users in this branch
    const [existingUsers] = await pool.query(
      "SELECT id, email, phone FROM users WHERE role = 'student'"
    );
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const previewList = students.map((stu) => {
      // 1. Generate username
      let username = '';
      const cleanAdm = stu.admission_no.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const cleanName = stu.student_name.trim().toLowerCase().split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
      const roll = stu.roll_no || '00';

      if (username_rule === 'name_roll') {
        username = `${cleanName}_${roll}`;
      } else if (username_rule === 'roll_no') {
        username = `roll_${roll}`;
      } else if (username_rule === 'email' && stu.father_email) {
        username = stu.father_email;
      } else {
        username = cleanAdm || `stu_${stu.student_id}`;
      }

      // Ensure valid email for user record login
      const loginEmail = username.includes('@') ? username : `${username}@student.school`;

      // 2. Generate password
      let generatedPassword = default_password;
      if (password_rule === 'dob_ddmmyyyy' && stu.dob) {
        const d = new Date(stu.dob);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          generatedPassword = `${day}${month}${year}`;
        }
      } else if (password_rule === 'admission_no') {
        generatedPassword = stu.admission_no.replace(/[^a-zA-Z0-9]/g, '') || default_password;
      }

      const accountExists = existingEmails.has(loginEmail.toLowerCase());

      return {
        student_id: stu.student_id,
        admission_no: stu.admission_no,
        student_name: stu.student_name,
        class_name: stu.class_name,
        section_name: stu.section_name,
        roll_no: stu.roll_no,
        username,
        email: loginEmail,
        password: generatedPassword,
        account_exists: accountExists,
      };
    });

    res.json({
      total: previewList.length,
      credentials: previewList,
    });
  } catch (error) {
    next(error);
  }
};

export const generateCredentialsBatch = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { credentials, branch_id } = req.body;

    if (!Array.isArray(credentials) || credentials.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'Credentials array is required' });
    }

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    await conn.beginTransaction();

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of credentials) {
      const { student_id, student_name, username, email, password } = item;
      const targetEmail = email || (username && username.includes('@') ? username : `${username}@student.school`);

      if (!targetEmail || !password) continue;

      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if user already exists
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [targetEmail]);

      if (existing.length > 0) {
        // Update password
        await conn.query(
          `UPDATE users SET password = ?, status = 'active', updated_at = NOW() WHERE id = ?`,
          [hashedPassword, existing[0].id]
        );
        updatedCount++;
      } else {
        // Fetch student name & branch if not provided
        let displayName = student_name;
        let stuBranchId = effectiveBranchId;

        if (student_id && (!displayName || !stuBranchId)) {
          const [stuRows] = await conn.query(
            `SELECT s.student_name, se.branch_id 
             FROM students s 
             JOIN student_enrollments se ON s.id = se.student_id 
             WHERE s.id = ? LIMIT 1`,
            [student_id]
          );
          if (stuRows.length > 0) {
            displayName = displayName || stuRows[0].student_name;
            stuBranchId = stuBranchId || stuRows[0].branch_id;
          }
        }

        await conn.query(
          `INSERT INTO users (name, email, password, role, branch_id, status)
           VALUES (?, ?, ?, 'student', ?, 'active')`,
          [displayName || 'Student', targetEmail, hashedPassword, stuBranchId ? Number(stuBranchId) : null]
        );
        createdCount++;
      }
    }

    await conn.commit();

    res.json({
      message: `Credentials generated: ${createdCount} new accounts created, ${updatedCount} existing updated.`,
      created_count: createdCount,
      updated_count: updatedCount,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
