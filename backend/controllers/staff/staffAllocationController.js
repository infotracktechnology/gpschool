import { query } from '../../config/database.js';

/**
 * GET /api/staff/allocations/class-teachers
 * List class sections with primary & co-class teacher allocations
 */
export const getClassTeacherAllocations = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id } = req.query;

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    let sql = `
      SELECT
        bcs.id AS section_id,
        bcs.id AS branch_class_section_id,
        bcs.branch_id,
        b.name AS branch_name,
        b.code AS branch_code,
        bcs.class_id,
        c.name AS class_name,
        c.code AS class_code,
        c.stage AS class_stage,
        bcs.name AS section_name,
        bcs.capacity,
        bcs.room_no,
        bcs.status AS section_status,
        bcs.class_teacher_id,
        ct.emp_no AS class_teacher_emp_no,
        TRIM(CONCAT(COALESCE(ct.first_name, ''), ' ', COALESCE(ct.last_name, ''))) AS ct_profile_name,
        u_ct.name AS ct_user_name,
        ct.designation AS class_teacher_designation,
        ct.phone AS class_teacher_phone,
        u_ct.username AS class_teacher_email,
        bcs.co_class_teacher_id,
        cct.emp_no AS co_class_teacher_emp_no,
        TRIM(CONCAT(COALESCE(cct.first_name, ''), ' ', COALESCE(cct.last_name, ''))) AS cct_profile_name,
        u_cct.name AS cct_user_name,
        cct.designation AS co_class_teacher_designation,
        cct.phone AS co_class_teacher_phone
      FROM branch_class_sections bcs
      JOIN classes c ON bcs.class_id = c.id
      JOIN branches b ON bcs.branch_id = b.id
      LEFT JOIN staff_profiles ct ON bcs.class_teacher_id = ct.id
      LEFT JOIN users u_ct ON ct.user_id = u_ct.id
      LEFT JOIN staff_profiles cct ON bcs.co_class_teacher_id = cct.id
      LEFT JOIN users u_cct ON cct.user_id = u_cct.id
      WHERE bcs.status = 'active'
    `;
    const params = [];

    if (targetBranchId) {
      sql += ' AND bcs.branch_id = ?';
      params.push(Number(targetBranchId));
    }

    sql += ' ORDER BY c.display_order ASC, c.name ASC, bcs.name ASC';

    const rawRows = await query(sql, params);

    const allocations = rawRows.map(row => ({
      ...row,
      class_teacher_name: (row.ct_profile_name && row.ct_profile_name.trim() !== '') ? row.ct_profile_name.trim() : (row.ct_user_name || null),
      co_class_teacher_name: (row.cct_profile_name && row.cct_profile_name.trim() !== '') ? row.cct_profile_name.trim() : (row.cct_user_name || null),
    }));

    res.json({ allocations });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/allocations/class-teachers/report
 * Branch-wide summary metrics, detailed class teacher list (for printable docket & CSV export)
 */
export const getClassTeachersReport = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id } = req.query;

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    let sql = `
      SELECT
        bcs.id AS section_id,
        bcs.branch_id,
        b.name AS branch_name,
        b.code AS branch_code,
        bcs.class_id,
        c.name AS class_name,
        c.code AS class_code,
        c.stage AS class_stage,
        bcs.name AS section_name,
        bcs.capacity,
        bcs.room_no,
        bcs.class_teacher_id,
        ct.emp_no AS class_teacher_emp_no,
        TRIM(CONCAT(COALESCE(ct.first_name, ''), ' ', COALESCE(ct.last_name, ''))) AS ct_profile_name,
        u_ct.name AS ct_user_name,
        ct.designation AS class_teacher_designation,
        ct.phone AS class_teacher_phone,
        u_ct.username AS class_teacher_email,
        bcs.co_class_teacher_id,
        cct.emp_no AS co_class_teacher_emp_no,
        TRIM(CONCAT(COALESCE(cct.first_name, ''), ' ', COALESCE(cct.last_name, ''))) AS cct_profile_name,
        u_cct.name AS cct_user_name,
        cct.designation AS co_class_teacher_designation,
        cct.phone AS co_class_teacher_phone
      FROM branch_class_sections bcs
      JOIN classes c ON bcs.class_id = c.id
      JOIN branches b ON bcs.branch_id = b.id
      LEFT JOIN staff_profiles ct ON bcs.class_teacher_id = ct.id
      LEFT JOIN users u_ct ON ct.user_id = u_ct.id
      LEFT JOIN staff_profiles cct ON bcs.co_class_teacher_id = cct.id
      LEFT JOIN users u_cct ON cct.user_id = u_cct.id
      WHERE bcs.status = 'active'
    `;
    const params = [];

    if (targetBranchId) {
      sql += ' AND bcs.branch_id = ?';
      params.push(Number(targetBranchId));
    }

    sql += ' ORDER BY c.display_order ASC, c.name ASC, bcs.name ASC';

    const rawRows = await query(sql, params);

    const sections = rawRows.map(row => ({
      ...row,
      class_teacher_name: (row.ct_profile_name && row.ct_profile_name.trim() !== '') ? row.ct_profile_name.trim() : (row.ct_user_name || null),
      co_class_teacher_name: (row.cct_profile_name && row.cct_profile_name.trim() !== '') ? row.cct_profile_name.trim() : (row.cct_user_name || null),
    }));

    const totalSections = sections.length;
    const assignedCount = sections.filter(s => s.class_teacher_id !== null).length;
    const unassignedCount = totalSections - assignedCount;
    const coTeacherCount = sections.filter(s => s.co_class_teacher_id !== null).length;

    res.json({
      metrics: {
        total_sections: totalSections,
        assigned_class_teachers: assignedCount,
        unassigned_sections: unassignedCount,
        total_co_class_teachers: coTeacherCount,
      },
      sections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/allocations/class-teachers/check-conflict
 * Check if teacher is already assigned to another section
 */
export const checkClassTeacherConflict = async (req, res, next) => {
  try {
    const { teacher_id, current_section_id, branch_id } = req.query;

    if (!teacher_id) {
      return res.status(400).json({ message: 'teacher_id is required' });
    }

    let sql = `
      SELECT bcs.id AS section_id, c.name AS class_name, bcs.name AS section_name, b.name AS branch_name,
             CASE
               WHEN bcs.class_teacher_id = ? THEN 'Primary Class Teacher'
               ELSE 'Co-Class Teacher'
             END AS current_role
      FROM branch_class_sections bcs
      JOIN classes c ON bcs.class_id = c.id
      JOIN branches b ON bcs.branch_id = b.id
      WHERE (bcs.class_teacher_id = ? OR bcs.co_class_teacher_id = ?)
        AND bcs.status = 'active'
    `;
    const params = [teacher_id, teacher_id, teacher_id];

    if (current_section_id) {
      sql += ' AND bcs.id != ?';
      params.push(Number(current_section_id));
    }
    if (branch_id && branch_id !== 'all') {
      sql += ' AND bcs.branch_id = ?';
      params.push(Number(branch_id));
    }

    const conflicts = await query(sql, params);

    res.json({
      hasConflict: conflicts.length > 0,
      conflicts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/staff/allocations/class-teachers
 * Assign primary class teacher & co-class teacher to a section
 */
export const assignClassTeacher = async (req, res, next) => {
  try {
    const { branch_class_section_id, section_id, class_teacher_id, co_class_teacher_id } = req.body;
    const targetSectionId = branch_class_section_id || section_id;

    if (!targetSectionId) {
      return res.status(400).json({ message: 'branch_class_section_id or section_id is required' });
    }

    const sectionRows = await query('SELECT id, branch_id FROM branch_class_sections WHERE id = ?', [targetSectionId]);
    if (sectionRows.length === 0) {
      return res.status(404).json({ message: 'Class section not found' });
    }

    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (sectionRows[0].branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot assign teachers in another branch' });
      }
    }

    await query(
      `UPDATE branch_class_sections
       SET class_teacher_id = ?,
           co_class_teacher_id = ?
       WHERE id = ?`,
      [
        class_teacher_id ? Number(class_teacher_id) : null,
        co_class_teacher_id ? Number(co_class_teacher_id) : null,
        targetSectionId,
      ]
    );

    res.json({ message: 'Class teacher allocation updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/allocations/subjects
 * Get teacher-subject mapping matrix
 */
export const getSubjectAllocations = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, class_id, section_id, teacher_id } = req.query;

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    let sql = `
      SELECT
        tsa.id,
        tsa.branch_id,
        b.name AS branch_name,
        tsa.academic_year_id,
        ay.name AS academic_year_name,
        tsa.class_id,
        c.name AS class_name,
        c.code AS class_code,
        tsa.section_id,
        bcs.name AS section_name,
        tsa.subject_id,
        sub.name AS subject_name,
        sub.code AS subject_code,
        tsa.teacher_id,
        sp.emp_no AS teacher_emp_no,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS teacher_profile_name,
        u.name AS teacher_user_name,
        sp.designation AS teacher_designation,
        COALESCE(tsa.weekly_periods, tsa.periods_per_week, 5) AS weekly_periods,
        tsa.is_primary,
        tsa.status,
        tsa.created_at
      FROM teacher_subject_allocations tsa
      JOIN subjects sub ON tsa.subject_id = sub.id
      JOIN classes c ON tsa.class_id = c.id
      JOIN branch_class_sections bcs ON tsa.section_id = bcs.id
      JOIN staff_profiles sp ON tsa.teacher_id = sp.id
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN branches b ON tsa.branch_id = b.id
      LEFT JOIN academic_years ay ON tsa.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (targetBranchId) {
      sql += ' AND tsa.branch_id = ?';
      params.push(Number(targetBranchId));
    }
    if (academic_year_id && academic_year_id !== 'all') {
      sql += ' AND tsa.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (class_id && class_id !== 'all') {
      sql += ' AND tsa.class_id = ?';
      params.push(Number(class_id));
    }
    if (section_id && section_id !== 'all') {
      sql += ' AND tsa.section_id = ?';
      params.push(Number(section_id));
    }
    if (teacher_id && teacher_id !== 'all') {
      sql += ' AND tsa.teacher_id = ?';
      params.push(Number(teacher_id));
    }

    sql += ' ORDER BY c.display_order ASC, c.name ASC, bcs.name ASC, sub.name ASC';

    const rawRows = await query(sql, params);

    const allocations = rawRows.map(row => ({
      ...row,
      teacher_name: (row.teacher_profile_name && row.teacher_profile_name.trim() !== '') ? row.teacher_profile_name.trim() : (row.teacher_user_name || row.teacher_emp_no),
    }));

    res.json({ allocations });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff/allocations/subjects/simple-assign
 * Simple subject mapping workflow: Select Class & Section -> Search staff -> check subjects -> Assign
 */
export const simpleAssignSubjects = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, class_id, section_id, teacher_id, subject_ids, weekly_periods = 5 } = req.body;

    if (!class_id || !section_id || !teacher_id || !Array.isArray(subject_ids) || subject_ids.length === 0) {
      return res.status(400).json({ message: 'class_id, section_id, teacher_id, and subject_ids array are required' });
    }

    let targetBranchId = branch_id || (req.user.branch_id || 1);
    let targetYearId = academic_year_id || 1;

    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      if (activeYears.length > 0) targetYearId = activeYears[0].id;
    } catch (e) {}

    let count = 0;
    for (const subId of subject_ids) {
      const existing = await query(
        `SELECT id FROM teacher_subject_allocations
         WHERE branch_id = ? AND academic_year_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?`,
        [targetBranchId, targetYearId, class_id, section_id, subId]
      );

      if (existing.length > 0) {
        await query(
          `UPDATE teacher_subject_allocations
           SET teacher_id = ?,
               weekly_periods = ?,
               periods_per_week = ?,
               status = 'active'
           WHERE id = ?`,
          [teacher_id, weekly_periods, weekly_periods, existing[0].id]
        );
      } else {
        await query(
          `INSERT INTO teacher_subject_allocations (
             branch_id, academic_year_id, class_id, section_id, subject_id, teacher_id, weekly_periods, periods_per_week, is_primary, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')`,
          [targetBranchId, targetYearId, class_id, section_id, subId, teacher_id, weekly_periods, weekly_periods]
        );
      }
      count++;
    }

    res.json({
      message: `Successfully mapped ${count} subjects to teacher`,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff/allocations/subjects
 * Batch save/upsert teacher subject allocations
 */
export const saveSubjectAllocations = async (req, res, next) => {
  try {
    const records = Array.isArray(req.body.allocations) ? req.body.allocations : [req.body];

    if (records.length === 0) {
      return res.status(400).json({ message: 'No allocation data provided' });
    }

    let defaultYearId = 1;
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      if (activeYears.length > 0) defaultYearId = activeYears[0].id;
    } catch (e) {}

    for (const alloc of records) {
      const branchId = alloc.branch_id || (req.user.branch_id || 1);
      const academicYearId = alloc.academic_year_id || defaultYearId;
      const classId = alloc.class_id;
      const sectionId = alloc.section_id;
      const subjectId = alloc.subject_id;
      const teacherId = alloc.teacher_id;
      const weeklyPeriods = alloc.weekly_periods !== undefined ? Number(alloc.weekly_periods) : 5;
      const isPrimary = alloc.is_primary !== undefined ? (alloc.is_primary ? 1 : 0) : 1;

      if (!classId || !sectionId || !subjectId || !teacherId) continue;

      const existing = await query(
        `SELECT id FROM teacher_subject_allocations
         WHERE branch_id = ? AND academic_year_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?`,
        [branchId, academicYearId, classId, sectionId, subjectId]
      );

      if (existing.length > 0) {
        await query(
          `UPDATE teacher_subject_allocations
           SET teacher_id = ?, weekly_periods = ?, periods_per_week = ?, is_primary = ?, status = 'active'
           WHERE id = ?`,
          [teacherId, weeklyPeriods, weeklyPeriods, isPrimary, existing[0].id]
        );
      } else {
        await query(
          `INSERT INTO teacher_subject_allocations (
             branch_id, academic_year_id, class_id, section_id, subject_id, teacher_id, weekly_periods, periods_per_week, is_primary, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [branchId, academicYearId, classId, sectionId, subjectId, teacherId, weeklyPeriods, weeklyPeriods, isPrimary]
        );
      }
    }

    res.json({ message: 'Subject allocations saved successfully', count: records.length });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/staff/allocations/subjects/:id
 */
export const deleteSubjectAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM teacher_subject_allocations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Subject allocation not found' });
    }
    await query('DELETE FROM teacher_subject_allocations WHERE id = ?', [id]);
    res.json({ message: 'Subject allocation removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// Coordinators CRUD (Tab 3: Flexible Scope Wing / Class)
// ========================================================

/**
 * GET /api/staff/allocations/coordinators
 * List staff coordinators with role, scope, wing, and class information
 */
export const getCoordinators = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, coordinator_role, scope_type, stage, class_id } = req.query;

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    let sql = `
      SELECT
        sc.id,
        sc.branch_id,
        b.name AS branch_name,
        sc.academic_year_id,
        ay.name AS academic_year_name,
        sc.staff_id,
        sp.emp_no,
        sp.first_name,
        sp.last_name,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
        u.name AS user_name,
        sp.designation,
        sp.department,
        sp.phone AS staff_phone,
        COALESCE(sp.avatar_url, '') AS photo_url,
        sc.coordinator_role,
        sc.scope_type,
        sc.wing,
        sc.stage,
        sc.class_id,
        c.name AS class_name,
        c.code AS class_code,
        sc.section_id,
        sc.status,
        sc.notes,
        sc.created_at
      FROM staff_coordinators sc
      JOIN staff_profiles sp ON sc.staff_id = sp.id
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN classes c ON sc.class_id = c.id
      LEFT JOIN branches b ON sc.branch_id = b.id
      LEFT JOIN academic_years ay ON sc.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (targetBranchId) {
      sql += ' AND sc.branch_id = ?';
      params.push(Number(targetBranchId));
    }
    if (academic_year_id && academic_year_id !== 'all') {
      sql += ' AND sc.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (coordinator_role && coordinator_role !== 'all') {
      sql += ' AND sc.coordinator_role = ?';
      params.push(coordinator_role);
    }
    if (scope_type && scope_type !== 'all') {
      sql += ' AND sc.scope_type = ?';
      params.push(scope_type);
    }
    if (stage && stage !== 'all') {
      sql += ' AND sc.stage = ?';
      params.push(stage);
    }
    if (class_id && class_id !== 'all') {
      sql += ' AND sc.class_id = ?';
      params.push(Number(class_id));
    }

    sql += ' ORDER BY sc.id DESC';

    const rawRows = await query(sql, params);

    const coordinators = rawRows.map(row => ({
      ...row,
      coordinator_name: (row.profile_full_name && row.profile_full_name.trim() !== '') ? row.profile_full_name.trim() : (row.user_name || row.emp_no),
    }));

    res.json({ coordinators });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff/allocations/coordinators
 * Add coordinator allocation
 */
export const createCoordinator = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      staff_id,
      coordinator_role,
      scope_type = 'class',
      wing,
      stage,
      class_id,
      section_id,
      notes,
    } = req.body;

    if (!staff_id || !coordinator_role) {
      return res.status(400).json({ message: 'staff_id and coordinator_role are required' });
    }

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (!targetBranchId) targetBranchId = 1;

    let targetYearId = academic_year_id;
    if (!targetYearId) {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      targetYearId = activeYears.length > 0 ? activeYears[0].id : 1;
    }

    const result = await query(
      `INSERT INTO staff_coordinators (
         branch_id,
         academic_year_id,
         staff_id,
         coordinator_role,
         scope_type,
         wing,
         stage,
         class_id,
         section_id,
         status,
         notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        targetBranchId,
        targetYearId,
        Number(staff_id),
        coordinator_role,
        scope_type,
        wing || null,
        stage || null,
        class_id ? Number(class_id) : null,
        section_id ? Number(section_id) : null,
        notes || null,
      ]
    );

    res.status(201).json({
      message: 'Staff coordinator appointed successfully',
      coordinatorId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/staff/allocations/coordinators/:id
 * Update coordinator allocation
 */
export const updateCoordinator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      coordinator_role,
      scope_type,
      wing,
      stage,
      class_id,
      section_id,
      status,
      notes,
    } = req.body;

    const existing = await query('SELECT id FROM staff_coordinators WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Coordinator record not found' });
    }

    const fields = [];
    const params = [];

    if (coordinator_role !== undefined) { fields.push('coordinator_role = ?'); params.push(coordinator_role); }
    if (scope_type !== undefined) { fields.push('scope_type = ?'); params.push(scope_type); }
    if (wing !== undefined) { fields.push('wing = ?'); params.push(wing); }
    if (stage !== undefined) { fields.push('stage = ?'); params.push(stage); }
    if (class_id !== undefined) { fields.push('class_id = ?'); params.push(class_id ? Number(class_id) : null); }
    if (section_id !== undefined) { fields.push('section_id = ?'); params.push(section_id ? Number(section_id) : null); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }

    if (fields.length > 0) {
      params.push(id);
      await query(`UPDATE staff_coordinators SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    res.json({ message: 'Coordinator allocation updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/staff/allocations/coordinators/:id
 * Remove coordinator allocation
 */
export const deleteCoordinator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM staff_coordinators WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Coordinator record not found' });
    }

    await query('DELETE FROM staff_coordinators WHERE id = ?', [id]);
    res.json({ message: 'Coordinator allocation removed successfully' });
  } catch (error) {
    next(error);
  }
};
