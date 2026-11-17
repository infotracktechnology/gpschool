import { pool, query } from '../../config/database.js';

export const previewPromotion = async (req, res, next) => {
  try {
    const {
      branch_id,
      source_academic_year_id,
      source_class_id,
      source_section_id,
      target_academic_year_id,
      target_class_id,
    } = req.query;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    if (!effectiveBranchId || !source_academic_year_id || !source_class_id) {
      return res.status(400).json({
        message: 'Required parameters: branch_id, source_academic_year_id, source_class_id',
      });
    }

    // 1. Fetch source students
    let studentSql = `
      SELECT s.id AS student_id,
             s.admission_no,
             s.student_name,
             s.gender,
             s.father_name,
             s.father_phone,
             se.id AS current_enrollment_id,
             se.roll_no AS current_roll_no,
             se.admission_category,
             c.id AS current_class_id,
             c.name AS current_class_name,
             sec.id AS current_section_id,
             sec.name AS current_section_name
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      JOIN classes c ON se.class_id = c.id
      JOIN branch_class_sections sec ON se.section_id = sec.id
      WHERE se.branch_id = ?
        AND se.academic_year_id = ?
        AND se.class_id = ?
        AND se.enrollment_status = 'current'
    `;
    const params = [Number(effectiveBranchId), Number(source_academic_year_id), Number(source_class_id)];

    if (source_section_id) {
      studentSql += ' AND se.section_id = ?';
      params.push(Number(source_section_id));
    }

    studentSql += ' ORDER BY sec.name ASC, CAST(se.roll_no AS UNSIGNED) ASC, s.student_name ASC';

    const students = await query(studentSql, params);

    // 2. Fetch target class sections and current capacities if target_class_id and target_academic_year_id are provided
    let targetSections = [];
    if (target_class_id && target_academic_year_id) {
      const [secRows] = await pool.query(
        `SELECT sec.id, sec.name, sec.capacity,
                (SELECT COUNT(*) 
                 FROM student_enrollments se2 
                 WHERE se2.section_id = sec.id 
                   AND se2.academic_year_id = ? 
                   AND se2.enrollment_status = 'current') AS current_enrolled
         FROM branch_class_sections sec
         WHERE sec.branch_id = ? AND sec.class_id = ?
         ORDER BY sec.name ASC`,
        [Number(target_academic_year_id), Number(effectiveBranchId), Number(target_class_id)]
      );
      targetSections = secRows;
    }

    // 3. Provide next class recommendation if not specified
    let nextClassRecommendation = null;
    if (!target_class_id) {
      const [srcClass] = await pool.query('SELECT display_order FROM classes WHERE id = ?', [
        source_class_id,
      ]);
      if (srcClass.length > 0) {
        const [nextClasses] = await pool.query(
          `SELECT id, name, code, display_order 
           FROM classes 
           WHERE (branch_id = ? OR branch_id IS NULL) 
             AND display_order > ? 
           ORDER BY display_order ASC LIMIT 1`,
          [Number(effectiveBranchId), srcClass[0].display_order]
        );
        if (nextClasses.length > 0) {
          nextClassRecommendation = nextClasses[0];
        }
      }
    }

    res.json({
      total_students: students.length,
      students,
      target_sections: targetSections,
      next_class_recommendation: nextClassRecommendation,
    });
  } catch (error) {
    next(error);
  }
};

export const executePromotion = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { promotions, target_academic_year_id, branch_id } = req.body;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    if (!effectiveBranchId || !target_academic_year_id) {
      conn.release();
      return res.status(400).json({ message: 'Target academic year and branch ID are required' });
    }

    if (!Array.isArray(promotions) || promotions.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'Promotions array is empty or invalid' });
    }

    await conn.beginTransaction();

    let promotedCount = 0;
    let detainedCount = 0;
    let leftCount = 0;

    for (const item of promotions) {
      const {
        student_id,
        action = 'promote', // 'promote' | 'detain' | 'leave'
        target_class_id,
        target_section_id,
        target_roll_no,
      } = item;

      if (!student_id) continue;

      // 1. Fetch current active enrollment
      const [currEnrRows] = await conn.query(
        `SELECT * FROM student_enrollments 
         WHERE student_id = ? AND enrollment_status = 'current'
         ORDER BY id DESC LIMIT 1`,
        [student_id]
      );

      const currEnr = currEnrRows[0] || null;

      if (action === 'leave') {
        // Mark previous enrollment
        if (currEnr) {
          await conn.query(
            `UPDATE student_enrollments SET enrollment_status = 'transferred', updated_at = NOW() WHERE id = ?`,
            [currEnr.id]
          );
        }
        await conn.query(
          `UPDATE students SET status = 'graduated', updated_at = NOW() WHERE id = ?`,
          [student_id]
        );
        leftCount++;
        continue;
      }

      // Action is 'promote' or 'detain'
      const statusToSet = action === 'promote' ? 'promoted' : 'detained';

      if (currEnr) {
        await conn.query(
          `UPDATE student_enrollments SET enrollment_status = ?, updated_at = NOW() WHERE id = ?`,
          [statusToSet, currEnr.id]
        );
      }

      const finalClassId = target_class_id || (currEnr ? currEnr.class_id : null);
      const finalSectionId = target_section_id || (currEnr ? currEnr.section_id : null);

      if (!finalClassId || !finalSectionId) {
        continue;
      }

      // Check if student already enrolled in target year
      const [existingTargetEnr] = await conn.query(
        `SELECT id FROM student_enrollments 
         WHERE student_id = ? AND academic_year_id = ?`,
        [student_id, Number(target_academic_year_id)]
      );

      if (existingTargetEnr.length > 0) {
        // Update existing record to current
        await conn.query(
          `UPDATE student_enrollments 
           SET class_id = ?, section_id = ?, roll_no = ?, enrollment_status = 'current', updated_at = NOW()
           WHERE id = ?`,
          [
            Number(finalClassId),
            Number(finalSectionId),
            target_roll_no ? String(target_roll_no) : (currEnr ? currEnr.roll_no : null),
            existingTargetEnr[0].id,
          ]
        );
      } else {
        // Insert new enrollment
        await conn.query(
          `INSERT INTO student_enrollments
           (student_id, branch_id, academic_year_id, class_id, section_id, roll_no, admission_category, academic_group_id, enrollment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'current')`,
          [
            student_id,
            Number(effectiveBranchId),
            Number(target_academic_year_id),
            Number(finalClassId),
            Number(finalSectionId),
            target_roll_no ? String(target_roll_no) : (currEnr ? currEnr.roll_no : null),
            currEnr ? currEnr.admission_category : 'general',
            currEnr ? currEnr.academic_group_id : null,
          ]
        );
      }

      if (action === 'promote') {
        promotedCount++;
      } else {
        detainedCount++;
      }
    }

    await conn.commit();

    res.json({
      message: `Promotion executed: ${promotedCount} promoted, ${detainedCount} detained, ${leftCount} marked leaving.`,
      promoted_count: promotedCount,
      detained_count: detainedCount,
      left_count: leftCount,
      total_processed: promotions.length,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const getPromotionReport = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, class_id } = req.query;

    const userBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : null;
    const effectiveBranchId = userBranchId || branch_id;

    let sql = `
      SELECT s.id AS student_id,
             s.admission_no,
             s.student_name,
             s.gender,
             old_enr.enrollment_status AS previous_action,
             old_c.name AS source_class_name,
             old_sec.name AS source_section_name,
             old_ay.name AS source_academic_year,
             new_c.name AS target_class_name,
             new_sec.name AS target_section_name,
             new_ay.name AS target_academic_year,
             new_enr.created_at AS transition_date
      FROM students s
      JOIN student_enrollments old_enr ON s.id = old_enr.student_id AND old_enr.enrollment_status IN ('promoted', 'detained', 'transferred')
      JOIN classes old_c ON old_enr.class_id = old_c.id
      JOIN branch_class_sections old_sec ON old_enr.section_id = old_sec.id
      JOIN academic_years old_ay ON old_enr.academic_year_id = old_ay.id
      LEFT JOIN student_enrollments new_enr ON s.id = new_enr.student_id AND new_enr.enrollment_status = 'current'
      LEFT JOIN classes new_c ON new_enr.class_id = new_c.id
      LEFT JOIN branch_class_sections new_sec ON new_enr.section_id = new_sec.id
      LEFT JOIN academic_years new_ay ON new_enr.academic_year_id = new_ay.id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveBranchId) {
      sql += ' AND old_enr.branch_id = ?';
      params.push(Number(effectiveBranchId));
    }

    if (academic_year_id) {
      sql += ' AND (old_enr.academic_year_id = ? OR new_enr.academic_year_id = ?)';
      params.push(Number(academic_year_id), Number(academic_year_id));
    }

    if (class_id) {
      sql += ' AND (old_enr.class_id = ? OR new_enr.class_id = ?)';
      params.push(Number(class_id), Number(class_id));
    }

    sql += ' ORDER BY new_enr.created_at DESC, s.student_name ASC LIMIT 200';

    const report = await query(sql, params);
    res.json({ report, count: report.length });
  } catch (error) {
    next(error);
  }
};
