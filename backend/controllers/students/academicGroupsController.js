import { pool, query } from '../../config/database.js';

export const getAcademicGroups = async (req, res, next) => {
  try {
    const { branch_id, class_id, status } = req.query;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    let sql = `
      SELECT ag.*,
             c.name AS class_name,
             c.code AS class_code,
             b.name AS branch_name
      FROM academic_groups ag
      JOIN classes c ON ag.class_id = c.id
      JOIN branches b ON ag.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveBranchId) {
      sql += ' AND ag.branch_id = ?';
      params.push(Number(effectiveBranchId));
    }
    if (class_id) {
      sql += ' AND ag.class_id = ?';
      params.push(Number(class_id));
    }
    if (status) {
      sql += ' AND ag.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY ag.name ASC';

    const groups = await query(sql, params);

    // Fetch subjects for each group
    for (const group of groups) {
      const [subjects] = await pool.query(
        `SELECT s.id, s.name, s.code, s.type
         FROM academic_group_subjects ags
         JOIN subjects s ON ags.subject_id = s.id
         WHERE ags.group_id = ?
         ORDER BY s.name ASC`,
        [group.id]
      );
      group.subjects = subjects;
      group.subject_ids = subjects.map((s) => s.id);
    }

    res.json({ groups });
  } catch (error) {
    next(error);
  }
};

export const getAcademicGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT ag.*, c.name AS class_name, b.name AS branch_name
       FROM academic_groups ag
       JOIN classes c ON ag.class_id = c.id
       JOIN branches b ON ag.branch_id = b.id
       WHERE ag.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Academic group not found' });
    }

    const group = rows[0];
    const [subjects] = await pool.query(
      `SELECT s.id, s.name, s.code, s.type
       FROM academic_group_subjects ags
       JOIN subjects s ON ags.subject_id = s.id
       WHERE ags.group_id = ?
       ORDER BY s.name ASC`,
      [group.id]
    );

    group.subjects = subjects;
    group.subject_ids = subjects.map((s) => s.id);

    res.json({ group });
  } catch (error) {
    next(error);
  }
};

export const createAcademicGroup = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { branch_id, class_id, name, code, description, subject_ids = [] } = req.body;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    if (!effectiveBranchId || !class_id || !name || !code) {
      conn.release();
      return res.status(400).json({
        message: 'branch_id, class_id, name, and code are required',
      });
    }

    await conn.beginTransaction();

    const [groupResult] = await conn.query(
      `INSERT INTO academic_groups (branch_id, class_id, name, code, description, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [Number(effectiveBranchId), Number(class_id), name.trim(), code.trim(), description || null]
    );

    const groupId = groupResult.insertId;

    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      for (const subjId of subject_ids) {
        await conn.query(
          `INSERT IGNORE INTO academic_group_subjects (group_id, subject_id) VALUES (?, ?)`,
          [groupId, Number(subjId)]
        );
      }
    }

    await conn.commit();

    res.status(201).json({
      message: 'Academic group created successfully',
      group_id: groupId,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const updateAcademicGroup = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { name, code, description, status, subject_ids } = req.body;

    const [existing] = await conn.query('SELECT * FROM academic_groups WHERE id = ?', [id]);
    if (existing.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Academic group not found' });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE academic_groups SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        updated_at = NOW()
       WHERE id = ?`,
      [name ? name.trim() : null, code ? code.trim() : null, description !== undefined ? description : null, status || null, id]
    );

    if (Array.isArray(subject_ids)) {
      await conn.query('DELETE FROM academic_group_subjects WHERE group_id = ?', [id]);
      for (const subjId of subject_ids) {
        await conn.query(
          `INSERT IGNORE INTO academic_group_subjects (group_id, subject_id) VALUES (?, ?)`,
          [id, Number(subjId)]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Academic group updated successfully' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const deleteAcademicGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if enrolled students are using this group
    const [enrolled] = await pool.query(
      'SELECT COUNT(*) as count FROM student_enrollments WHERE academic_group_id = ?',
      [id]
    );

    if (enrolled[0].count > 0) {
      // Soft-delete by marking inactive
      await pool.query("UPDATE academic_groups SET status = 'inactive' WHERE id = ?", [id]);
      return res.json({
        message: 'Academic group marked inactive as students are currently enrolled in it',
      });
    }

    await pool.query('DELETE FROM academic_groups WHERE id = ?', [id]);
    res.json({ message: 'Academic group deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getSubjectMappingMatrix = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, class_id, section_id } = req.query;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    if (!class_id) {
      return res.status(400).json({ message: 'class_id is required' });
    }

    // 1. Fetch available subjects
    const [subjects] = await pool.query(
      `SELECT id, name, code, type 
       FROM subjects 
       WHERE (branch_id = ? OR branch_id IS NULL) AND status = 'active'
       ORDER BY name ASC`,
      [effectiveBranchId ? Number(effectiveBranchId) : null]
    );

    // 2. Fetch students enrolled in class/section
    let studentSql = `
      SELECT s.id AS student_id,
             s.admission_no,
             s.student_name,
             se.id AS enrollment_id,
             se.roll_no,
             se.academic_group_id,
             ag.name AS academic_group_name,
             sec.id AS section_id,
             sec.name AS section_name
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      JOIN branch_class_sections sec ON se.section_id = sec.id
      LEFT JOIN academic_groups ag ON se.academic_group_id = ag.id
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

    // 3. Fetch all current subject mappings for these enrollments
    if (students.length > 0) {
      const enrollmentIds = students.map((s) => s.enrollment_id);
      const [mappings] = await pool.query(
        `SELECT ssm.enrollment_id, ssm.subject_id, ssm.is_elective, ssm.status
         FROM student_subject_mappings ssm
         WHERE ssm.enrollment_id IN (?)`,
        [enrollmentIds]
      );

      const mappingMap = {};
      for (const m of mappings) {
        if (!mappingMap[m.enrollment_id]) {
          mappingMap[m.enrollment_id] = {};
        }
        mappingMap[m.enrollment_id][m.subject_id] = {
          is_elective: !!m.is_elective,
          status: m.status,
        };
      }

      for (const stu of students) {
        stu.mapped_subjects = mappingMap[stu.enrollment_id] || {};
      }
    }

    res.json({
      subjects,
      students,
    });
  } catch (error) {
    next(error);
  }
};

export const saveSubjectMappings = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'Mappings array is required' });
    }

    await conn.beginTransaction();

    let count = 0;
    for (const item of mappings) {
      // Format A: { student_id, subject_ids: [...] }
      if (item.student_id && Array.isArray(item.subject_ids)) {
        let enrollmentId = item.enrollment_id;
        if (!enrollmentId) {
          const [enrRows] = await conn.query(
            `SELECT id FROM student_enrollments WHERE student_id = ? ORDER BY id DESC LIMIT 1`,
            [item.student_id]
          );
          if (enrRows.length > 0) {
            enrollmentId = enrRows[0].id;
          }
        }

        if (!enrollmentId) continue;

        const targetSubjectIds = item.subject_ids.map(Number).filter(Boolean);

        // Remove subjects no longer assigned
        if (targetSubjectIds.length > 0) {
          await conn.query(
            `DELETE FROM student_subject_mappings 
             WHERE enrollment_id = ? AND subject_id NOT IN (?)`,
            [enrollmentId, targetSubjectIds]
          );
        } else {
          await conn.query(
            `DELETE FROM student_subject_mappings WHERE enrollment_id = ?`,
            [enrollmentId]
          );
        }

        // Insert new subjects
        for (const subId of targetSubjectIds) {
          await conn.query(
            `INSERT INTO student_subject_mappings (student_id, enrollment_id, subject_id, is_elective, status)
             VALUES (?, ?, ?, 1, 'active')
             ON DUPLICATE KEY UPDATE status = 'active', updated_at = NOW()`,
            [item.student_id, enrollmentId, subId]
          );
          count++;
        }
        continue;
      }

      // Format B: Individual mapping item { enrollment_id, student_id, subject_id, is_elective, status }
      const { enrollment_id, student_id, subject_id, is_elective = false, status = 'active' } = item;

      let resolvedEnrollmentId = enrollment_id;
      let resolvedStudentId = student_id;

      if (!resolvedEnrollmentId && resolvedStudentId) {
        const [enrRows] = await conn.query(
          `SELECT id FROM student_enrollments WHERE student_id = ? ORDER BY id DESC LIMIT 1`,
          [resolvedStudentId]
        );
        if (enrRows.length > 0) {
          resolvedEnrollmentId = enrRows[0].id;
        }
      } else if (!resolvedStudentId && resolvedEnrollmentId) {
        const [enrRows] = await conn.query(
          'SELECT student_id FROM student_enrollments WHERE id = ?',
          [resolvedEnrollmentId]
        );
        if (enrRows.length > 0) {
          resolvedStudentId = enrRows[0].student_id;
        }
      }

      if (!resolvedEnrollmentId || !subject_id || !resolvedStudentId) continue;

      if (status === 'dropped') {
        await conn.query(
          `DELETE FROM student_subject_mappings 
           WHERE enrollment_id = ? AND subject_id = ?`,
          [resolvedEnrollmentId, subject_id]
        );
      } else {
        await conn.query(
          `INSERT INTO student_subject_mappings (student_id, enrollment_id, subject_id, is_elective, status)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE is_elective = VALUES(is_elective), status = VALUES(status), updated_at = NOW()`,
          [resolvedStudentId, resolvedEnrollmentId, subject_id, is_elective ? 1 : 0, status]
        );
      }
      count++;
    }

    await conn.commit();
    res.json({ message: `Successfully updated ${count} subject mapping(s)` });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
