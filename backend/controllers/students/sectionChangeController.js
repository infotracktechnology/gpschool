import { pool } from '../../config/database.js';

export const changeSectionBatch = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { student_ids, target_section_id, auto_renumber = false } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'No students selected for section change' });
    }

    if (!target_section_id) {
      conn.release();
      return res.status(400).json({ message: 'Target section ID is required' });
    }

    // Verify target section
    const [sections] = await conn.query(
      `SELECT s.*, c.name AS class_name 
       FROM branch_class_sections s
       JOIN classes c ON s.class_id = c.id
       WHERE s.id = ?`,
      [Number(target_section_id)]
    );

    if (sections.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Target section not found' });
    }

    const targetSection = sections[0];

    // Branch authorization check
    if (req.user.role !== 'super_admin' && req.user.branch_id && req.user.branch_id !== targetSection.branch_id) {
      conn.release();
      return res.status(403).json({ message: 'Target section belongs to a different branch' });
    }

    await conn.beginTransaction();

    // Update section_id for active enrollments
    const [updateResult] = await conn.query(
      `UPDATE student_enrollments
       SET section_id = ?, updated_at = NOW()
       WHERE student_id IN (?) AND enrollment_status = 'current'`,
      [targetSection.id, student_ids]
    );

    let renumberedCount = 0;
    if (auto_renumber) {
      // Fetch all current students in the target section, sort alphabetically by student_name
      const [roster] = await conn.query(
        `SELECT se.id AS enrollment_id, s.id AS student_id, s.student_name
         FROM student_enrollments se
         JOIN students s ON se.student_id = s.id
         WHERE se.section_id = ? AND se.enrollment_status = 'current'
         ORDER BY s.student_name ASC`,
        [targetSection.id]
      );

      for (let i = 0; i < roster.length; i++) {
        const newRoll = String(i + 1);
        await conn.query(
          `UPDATE student_enrollments SET roll_no = ?, updated_at = NOW() WHERE id = ?`,
          [newRoll, roster[i].enrollment_id]
        );
      }
      renumberedCount = roster.length;
    }

    await conn.commit();

    res.json({
      message: `Successfully transferred ${updateResult.affectedRows} student(s) to Section "${targetSection.name}" (${targetSection.class_name})`,
      transferred_count: updateResult.affectedRows,
      auto_renumbered: auto_renumber,
      roster_size: renumberedCount,
      target_section: {
        id: targetSection.id,
        name: targetSection.name,
        class_id: targetSection.class_id,
        class_name: targetSection.class_name,
      },
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
