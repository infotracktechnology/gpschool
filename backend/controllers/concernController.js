import { query } from '../config/database.js';

/**
 * Priority SLA hours mapping
 */
const PRIORITY_SLA_HOURS = {
  urgent: 12,
  high: 24,
  medium: 48,
  low: 72,
};

/**
 * Helper to resolve student profile from user_id
 */
const resolveStudent = async (userId) => {
  const rows = await query(
    `SELECT s.id, s.branch_id, s.class_id, s.section_id, s.admission_number, s.roll_no,
            CONCAT_WS(' ', s.first_name, s.last_name) AS student_name,
            c.name AS class_name, bcs.name AS section_name, bcs.class_teacher_id
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN branch_class_sections bcs ON s.section_id = bcs.id
     WHERE s.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Helper to resolve staff profile from user_id
 */
const resolveStaff = async (userId) => {
  const rows = await query(
    `SELECT sp.id, sp.branch_id, sp.emp_no, sp.department, sp.designation,
            TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS staff_name
     FROM staff_profiles sp
     WHERE sp.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * GET /api/concerns/categories
 * List active concern categories (optionally filtered by target_type: student, staff, all)
 */
export const getCategories = async (req, res, next) => {
  try {
    const { target_type } = req.query;

    let sql = `
      SELECT id, branch_id, name, code, target_type, default_priority, sla_hours, description, status
      FROM concern_categories
      WHERE status = 'active'
    `;
    const params = [];

    if (target_type && target_type !== 'all') {
      sql += ' AND (target_type = ? OR target_type = "all")';
      params.push(target_type);
    }

    sql += ' ORDER BY id ASC';

    const categories = await query(sql, params);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/concerns/stats
 * Executive metrics and summary counts (Total, Open, In Progress, Resolved, Overdue SLA, Escalated, Student vs Staff)
 */
export const getConcernStats = async (req, res, next) => {
  try {
    const { branch_id, scope } = req.query;

    let targetBranchId = req.user.role === 'super_admin' ? (branch_id ? Number(branch_id) : null) : req.user.branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    let sql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN c.status = 'open' THEN 1 ELSE 0 END) AS count_open,
        SUM(CASE WHEN c.status = 'in_progress' THEN 1 ELSE 0 END) AS count_in_progress,
        SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS count_resolved,
        SUM(CASE WHEN c.status = 'rejected' THEN 1 ELSE 0 END) AS count_rejected,
        SUM(CASE WHEN (c.status IN ('open', 'in_progress') AND c.sla_due_at < NOW()) OR c.is_overdue = 1 THEN 1 ELSE 0 END) AS count_overdue,
        SUM(CASE WHEN c.is_escalated = 1 THEN 1 ELSE 0 END) AS count_escalated,
        SUM(CASE WHEN c.concern_type = 'student' THEN 1 ELSE 0 END) AS count_student,
        SUM(CASE WHEN c.concern_type = 'staff' THEN 1 ELSE 0 END) AS count_staff
      FROM concerns c
      WHERE 1=1
    `;
    const params = [];

    if (targetBranchId) {
      sql += ' AND c.branch_id = ?';
      params.push(targetBranchId);
    }

    // Role-based scoping for stats
    if (req.user.role === 'student') {
      const student = await resolveStudent(req.user.id);
      sql += ' AND (c.raised_by_user_id = ? OR c.student_id = ?)';
      params.push(req.user.id, student ? student.id : -1);
    } else if (['teacher', 'staff'].includes(req.user.role)) {
      const staff = await resolveStaff(req.user.id);
      const staffId = staff ? staff.id : -1;

      if (scope === 'assigned') {
        sql += ' AND (c.assigned_to_user_id = ? OR c.assigned_to_staff_id = ?)';
        params.push(req.user.id, staffId);
      } else if (scope === 'my_raised') {
        sql += ' AND (c.raised_by_user_id = ? OR c.staff_id = ?)';
        params.push(req.user.id, staffId);
      }
    }

    const rows = await query(sql, params);
    const r = rows[0] || {};

    const stats = {
      total: Number(r.total || 0),
      open: Number(r.count_open || 0),
      in_progress: Number(r.count_in_progress || 0),
      resolved: Number(r.count_resolved || 0),
      rejected: Number(r.count_rejected || 0),
      overdue: Number(r.count_overdue || 0),
      escalated: Number(r.count_escalated || 0),
      student_concerns: Number(r.count_student || 0),
      staff_concerns: Number(r.count_staff || 0),
    };

    res.json({ stats });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/concerns
 * List concerns with comprehensive role scoping, multi-filters, and search
 */
export const getConcerns = async (req, res, next) => {
  try {
    const {
      branch_id,
      concern_type,
      status,
      priority,
      category_id,
      is_overdue,
      is_escalated,
      search,
      scope,
    } = req.query;

    let targetBranchId = req.user.role === 'super_admin' ? (branch_id && branch_id !== 'all' ? Number(branch_id) : null) : req.user.branch_id;

    let sql = `
      SELECT
        c.id,
        c.ticket_no,
        c.branch_id,
        b.name AS branch_name,
        b.code AS branch_code,
        c.academic_year_id,
        c.category_id,
        cc.name AS category_name,
        cc.code AS category_code,
        c.concern_type,
        c.title,
        c.description,
        c.attachment_url,
        c.priority,
        c.sla_hours,
        c.sla_due_at,
        CASE
          WHEN c.status IN ('open', 'in_progress') AND c.sla_due_at < NOW() THEN 1
          ELSE COALESCE(c.is_overdue, 0)
        END AS is_overdue,
        c.status,
        c.raised_by_user_id,
        c.raised_by_role,
        u_raised.name AS raised_by_name,
        c.student_id,
        CONCAT_WS(' ', st.first_name, st.last_name) AS student_name,
        st.admission_number AS student_admission_number,
        cls.name AS student_class_name,
        sec.name AS student_section_name,
        c.staff_id,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS staff_name,
        sp.emp_no AS staff_emp_no,
        sp.department AS staff_department,
        sp.designation AS staff_designation,
        c.logged_on_behalf,
        c.logged_by_staff_id,
        c.assigned_to_user_id,
        u_assigned.name AS assigned_to_name,
        c.assigned_to_staff_id,
        TRIM(CONCAT(COALESCE(sp_assigned.first_name, ''), ' ', COALESCE(sp_assigned.last_name, ''))) AS assigned_staff_name,
        sp_assigned.emp_no AS assigned_staff_emp_no,
        c.assigned_at,
        c.department,
        c.resolution_notes,
        c.resolved_by_user_id,
        u_resolved.name AS resolved_by_name,
        c.resolved_at,
        c.is_escalated,
        c.escalated_to_user_id,
        u_escalated.name AS escalated_to_name,
        c.escalated_at,
        c.escalation_reason,
        c.created_at,
        c.updated_at
      FROM concerns c
      JOIN concern_categories cc ON c.category_id = cc.id
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN users u_raised ON c.raised_by_user_id = u_raised.id
      LEFT JOIN students st ON c.student_id = st.id
      LEFT JOIN classes cls ON st.class_id = cls.id
      LEFT JOIN branch_class_sections sec ON st.section_id = sec.id
      LEFT JOIN staff_profiles sp ON c.staff_id = sp.id
      LEFT JOIN users u_assigned ON c.assigned_to_user_id = u_assigned.id
      LEFT JOIN staff_profiles sp_assigned ON c.assigned_to_staff_id = sp_assigned.id
      LEFT JOIN users u_resolved ON c.resolved_by_user_id = u_resolved.id
      LEFT JOIN users u_escalated ON c.escalated_to_user_id = u_escalated.id
      WHERE 1=1
    `;
    const params = [];

    // Branch scoping
    if (targetBranchId) {
      sql += ' AND c.branch_id = ?';
      params.push(targetBranchId);
    }

    // Role Scoping
    if (req.user.role === 'student') {
      const student = await resolveStudent(req.user.id);
      sql += ' AND (c.raised_by_user_id = ? OR c.student_id = ?)';
      params.push(req.user.id, student ? student.id : -1);
    } else if (['teacher', 'staff'].includes(req.user.role)) {
      const staff = await resolveStaff(req.user.id);
      const staffId = staff ? staff.id : -1;

      if (scope === 'assigned') {
        sql += ' AND (c.assigned_to_user_id = ? OR c.assigned_to_staff_id = ?)';
        params.push(req.user.id, staffId);
      } else if (scope === 'my_raised') {
        sql += ' AND (c.raised_by_user_id = ? OR c.staff_id = ?)';
        params.push(req.user.id, staffId);
      } else if (scope !== 'all') {
        // Default for staff/teacher: show both tickets assigned to them AND grievances raised by them
        sql += ' AND (c.assigned_to_user_id = ? OR c.assigned_to_staff_id = ? OR c.raised_by_user_id = ? OR c.staff_id = ?)';
        params.push(req.user.id, staffId, req.user.id, staffId);
      }
    }

    // Filter by Concern Type (student vs staff)
    if (concern_type && concern_type !== 'all') {
      sql += ' AND c.concern_type = ?';
      params.push(concern_type);
    }

    // Filter by Status
    if (status && status !== 'all') {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    // Filter by Priority
    if (priority && priority !== 'all') {
      sql += ' AND c.priority = ?';
      params.push(priority);
    }

    // Filter by Category
    if (category_id && category_id !== 'all') {
      sql += ' AND c.category_id = ?';
      params.push(Number(category_id));
    }

    // Filter by Overdue SLA
    if (is_overdue === 'true' || is_overdue === true || is_overdue === '1') {
      sql += ' AND ((c.status IN ("open", "in_progress") AND c.sla_due_at < NOW()) OR c.is_overdue = 1)';
    }

    // Filter by Escalated
    if (is_escalated === 'true' || is_escalated === true || is_escalated === '1') {
      sql += ' AND c.is_escalated = 1';
    }

    // Search term across ticket_no, title, description, student, staff
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        c.ticket_no LIKE ? OR
        c.title LIKE ? OR
        c.description LIKE ? OR
        st.first_name LIKE ? OR
        st.last_name LIKE ? OR
        st.admission_number LIKE ? OR
        sp.first_name LIKE ? OR
        sp.last_name LIKE ? OR
        sp.emp_no LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term, term, term);
    }

    sql += ' ORDER BY c.is_escalated DESC, c.id DESC';

    const concerns = await query(sql, params);
    res.json({ concerns });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/concerns/:id
 * Detailed 360° Concern ticket view with full activity timeline
 */
export const getConcernById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let sql = `
      SELECT
        c.*,
        b.name AS branch_name,
        b.code AS branch_code,
        cc.name AS category_name,
        cc.code AS category_code,
        CASE
          WHEN c.status IN ('open', 'in_progress') AND c.sla_due_at < NOW() THEN 1
          ELSE COALESCE(c.is_overdue, 0)
        END AS is_overdue,
        u_raised.name AS raised_by_name,
        u_raised.phone AS raised_by_phone,
        u_raised.username AS raised_by_email,
        CONCAT_WS(' ', st.first_name, st.last_name) AS student_name,
        st.admission_number AS student_admission_number,
        st.roll_no AS student_roll_no,
        st.phone AS student_phone,
        st.parent_phone AS student_parent_phone,
        cls.name AS student_class_name,
        sec.name AS student_section_name,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS staff_name,
        sp.emp_no AS staff_emp_no,
        sp.department AS staff_department,
        sp.designation AS staff_designation,
        sp.phone AS staff_phone,
        u_assigned.name AS assigned_to_name,
        TRIM(CONCAT(COALESCE(sp_assigned.first_name, ''), ' ', COALESCE(sp_assigned.last_name, ''))) AS assigned_staff_name,
        sp_assigned.emp_no AS assigned_staff_emp_no,
        u_resolved.name AS resolved_by_name,
        u_escalated.name AS escalated_to_name
      FROM concerns c
      JOIN concern_categories cc ON c.category_id = cc.id
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN users u_raised ON c.raised_by_user_id = u_raised.id
      LEFT JOIN students st ON c.student_id = st.id
      LEFT JOIN classes cls ON st.class_id = cls.id
      LEFT JOIN branch_class_sections sec ON st.section_id = sec.id
      LEFT JOIN staff_profiles sp ON c.staff_id = sp.id
      LEFT JOIN users u_assigned ON c.assigned_to_user_id = u_assigned.id
      LEFT JOIN staff_profiles sp_assigned ON c.assigned_to_staff_id = sp_assigned.id
      LEFT JOIN users u_resolved ON c.resolved_by_user_id = u_resolved.id
      LEFT JOIN users u_escalated ON c.escalated_to_user_id = u_escalated.id
      WHERE c.id = ?
      LIMIT 1
    `;

    const rows = await query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Concern ticket not found' });
    }

    const concern = rows[0];

    // Branch scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (concern.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Access denied to tickets from another branch' });
      }
    }

    // Role privacy check for students
    if (req.user.role === 'student' && concern.raised_by_user_id !== req.user.id) {
      const student = await resolveStudent(req.user.id);
      if (!student || student.id !== concern.student_id) {
        return res.status(403).json({ message: 'Forbidden: You can only view your own concern tickets' });
      }
    }

    // Fetch activity timeline
    const timeline = await query(
      `SELECT ct.id, ct.action_type, ct.note, ct.created_at, u.name AS user_name, u.role AS user_role
       FROM concern_timeline ct
       LEFT JOIN users u ON ct.user_id = u.id
       WHERE ct.concern_id = ?
       ORDER BY ct.created_at ASC`,
      [id]
    );

    res.json({ concern, timeline });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/concerns
 * Raise a new concern ticket (Student Portal, Staff Grievance, or On-Behalf of Student)
 * Auto-generates sequential ticket_no: TKT-YYYY-XXXX
 * Calculates SLA due date based on priority
 * Inserts initial audit timeline record
 */
export const createConcern = async (req, res, next) => {
  try {
    const {
      branch_id,
      category_id,
      title,
      description,
      priority,
      concern_type,
      portal_type = 'student',
      student_id,
      logged_on_behalf = false,
      attachment_url,
      assigned_to_user_id,
      assigned_to_staff_id,
      department,
    } = req.body;

    if (!category_id || !title || !description) {
      return res.status(400).json({ message: 'category_id, title, and description are required' });
    }

    // Verify category exists
    const catRows = await query('SELECT * FROM concern_categories WHERE id = ?', [category_id]);
    if (catRows.length === 0) {
      return res.status(404).json({ message: 'Concern category not found' });
    }
    const category = catRows[0];

    // Determine target branch
    let targetBranchId = req.user.role === 'super_admin' ? (branch_id ? Number(branch_id) : 1) : req.user.branch_id;
    if (!targetBranchId) targetBranchId = 1;

    // Determine academic year
    let targetYearId = null;
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      if (activeYears.length > 0) targetYearId = activeYears[0].id;
    } catch (e) {}

    // Determine concern_type ('student' or 'staff')
    let finalType = concern_type;
    if (!finalType) {
      if (req.user.role === 'student' || portal_type === 'student' || student_id) {
        finalType = 'student';
      } else {
        finalType = 'staff';
      }
    }

    // Determine student_id and staff_id
    let finalStudentId = student_id ? Number(student_id) : null;
    let finalStaffId = null;
    let loggedByStaffId = null;

    if (req.user.role === 'student') {
      const student = await resolveStudent(req.user.id);
      if (student) {
        finalStudentId = student.id;
        if (!targetBranchId) targetBranchId = student.branch_id;
      }
    } else if (['teacher', 'staff', 'admin', 'principal'].includes(req.user.role)) {
      const staff = await resolveStaff(req.user.id);
      if (staff) {
        if (finalType === 'staff') {
          finalStaffId = staff.id;
        }
        if (logged_on_behalf) {
          loggedByStaffId = staff.id;
        }
      }
    }

    // Determine Priority & SLA Hours
    const finalPriority = priority || category.default_priority || 'medium';
    const slaHours = PRIORITY_SLA_HOURS[finalPriority] || category.sla_hours || 48;
    const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000);

    // Auto-generate sequential ticket_no: TKT-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const prefix = `TKT-${currentYear}-`;

    const existingTickets = await query(
      `SELECT ticket_no FROM concerns WHERE ticket_no LIKE ? ORDER BY id DESC LIMIT 50`,
      [`${prefix}%`]
    );

    let maxSeq = 0;
    for (const row of existingTickets) {
      if (row.ticket_no) {
        const match = row.ticket_no.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
    }
    const nextSeq = maxSeq + 1;
    const ticketNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Auto-assign: if assigned staff specified or student's class teacher exists
    let finalAssignedUserId = assigned_to_user_id ? Number(assigned_to_user_id) : null;
    let finalAssignedStaffId = assigned_to_staff_id ? Number(assigned_to_staff_id) : null;
    let initialStatus = 'open';

    if (!finalAssignedStaffId && finalType === 'student' && finalStudentId) {
      // Find class teacher of the student
      const stDetails = await query(
        `SELECT bcs.class_teacher_id, ct.user_id AS ct_user_id
         FROM students s
         JOIN branch_class_sections bcs ON s.section_id = bcs.id
         LEFT JOIN staff_profiles ct ON bcs.class_teacher_id = ct.id
         WHERE s.id = ?`,
        [finalStudentId]
      );
      if (stDetails.length > 0 && stDetails[0].class_teacher_id) {
        finalAssignedStaffId = stDetails[0].class_teacher_id;
        finalAssignedUserId = stDetails[0].ct_user_id;
        initialStatus = 'in_progress';
      }
    }

    // Insert into concerns
    const result = await query(
      `INSERT INTO concerns (
         ticket_no,
         branch_id,
         academic_year_id,
         category_id,
         concern_type,
         title,
         description,
         attachment_url,
         priority,
         sla_hours,
         sla_due_at,
         is_overdue,
         status,
         raised_by_user_id,
         raised_by_role,
         student_id,
         staff_id,
         logged_on_behalf,
         logged_by_staff_id,
         assigned_to_user_id,
         assigned_to_staff_id,
         assigned_at,
         department
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketNo,
        targetBranchId,
        targetYearId,
        category_id,
        finalType,
        title.trim(),
        description.trim(),
        attachment_url || null,
        finalPriority,
        slaHours,
        slaDueAt,
        initialStatus,
        req.user.id,
        req.user.role,
        finalStudentId,
        finalStaffId,
        logged_on_behalf ? 1 : 0,
        loggedByStaffId,
        finalAssignedUserId,
        finalAssignedStaffId,
        finalAssignedStaffId ? new Date() : null,
        department || category.name || null,
      ]
    );

    const concernId = result.insertId;

    // Insert initial activity timeline record
    const portalNote = logged_on_behalf
      ? `Ticket logged on behalf of student by staff member`
      : `Concern ticket logged via ${portal_type.toUpperCase()} Portal`;

    await query(
      `INSERT INTO concern_timeline (concern_id, user_id, action_type, note)
       VALUES (?, ?, 'created', ?)`,
      [concernId, req.user.id, portalNote]
    );

    if (finalAssignedStaffId) {
      await query(
        `INSERT INTO concern_timeline (concern_id, user_id, action_type, note)
         VALUES (?, ?, 'assigned', 'Auto-assigned to Class Teacher for initial review')`,
        [concernId, req.user.id]
      );
    }

    res.status(201).json({
      message: 'Concern ticket raised successfully',
      concernId,
      ticket_no: ticketNo,
      priority: finalPriority,
      sla_hours: slaHours,
      sla_due_at: slaDueAt,
      status: initialStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/concerns/:id/assign
 * Reassign or assign ticket to a specific staff member or department
 */
export const assignConcern = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to_user_id, assigned_to_staff_id, department, notes } = req.body;

    const existing = await query('SELECT * FROM concerns WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Concern ticket not found' });
    }
    const concern = existing[0];

    // Branch scoping
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (concern.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot manage tickets outside your branch' });
      }
    }

    let targetUserId = assigned_to_user_id ? Number(assigned_to_user_id) : null;
    let targetStaffId = assigned_to_staff_id ? Number(assigned_to_staff_id) : null;

    // If staff_id provided without user_id, lookup user_id
    if (targetStaffId && !targetUserId) {
      const sp = await query('SELECT user_id FROM staff_profiles WHERE id = ?', [targetStaffId]);
      if (sp.length > 0) targetUserId = sp[0].user_id;
    }

    const nextStatus = concern.status === 'open' ? 'in_progress' : concern.status;

    await query(
      `UPDATE concerns
       SET assigned_to_user_id = ?,
           assigned_to_staff_id = ?,
           assigned_at = NOW(),
           assigned_by_user_id = ?,
           department = COALESCE(?, department),
           status = ?
       WHERE id = ?`,
      [targetUserId, targetStaffId, req.user.id, department || null, nextStatus, id]
    );

    // Audit timeline
    await query(
      `INSERT INTO concern_timeline (concern_id, user_id, action_type, note)
       VALUES (?, ?, 'assigned', ?)`,
      [id, req.user.id, notes || 'Ticket reassigned to faculty/department']
    );

    res.json({
      message: 'Concern ticket assigned successfully',
      concernId: Number(id),
      status: nextStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/concerns/:id/status
 * Update concern status with mandatory resolution notes upon resolution
 */
export const updateConcernStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes, note } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of [${validStatuses.join(', ')}]` });
    }

    const existing = await query('SELECT * FROM concerns WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Concern ticket not found' });
    }
    const concern = existing[0];

    // Branch scoping
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (concern.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot manage tickets outside your branch' });
      }
    }

    const finalNotes = resolution_notes || note || null;

    let updateSql = 'UPDATE concerns SET status = ?';
    const params = [status];

    if (['resolved', 'closed'].includes(status)) {
      updateSql += ', resolved_by_user_id = ?, resolved_at = NOW(), resolution_notes = ?';
      params.push(req.user.id, finalNotes);
    } else if (finalNotes) {
      updateSql += ', resolution_notes = ?';
      params.push(finalNotes);
    }

    updateSql += ' WHERE id = ?';
    params.push(id);

    await query(updateSql, params);

    // Audit timeline
    const actionType = status === 'resolved' ? 'resolved' : (status === 'closed' ? 'closed' : 'status_changed');
    const timelineNote = finalNotes || `Status updated to ${status.replace('_', ' ').toUpperCase()}`;

    await query(
      `INSERT INTO concern_timeline (concern_id, user_id, action_type, note)
       VALUES (?, ?, ?, ?)`,
      [id, req.user.id, actionType, timelineNote]
    );

    res.json({
      message: `Concern ticket status updated to ${status}`,
      concernId: Number(id),
      status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/concerns/:id/escalate
 * Escalate ticket past SLA or manually to Principal with reason
 */
export const escalateConcern = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { escalation_reason, escalated_to_user_id } = req.body;

    if (!escalation_reason || escalation_reason.trim() === '') {
      return res.status(400).json({ message: 'escalation_reason is required' });
    }

    const existing = await query('SELECT * FROM concerns WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Concern ticket not found' });
    }
    const concern = existing[0];

    // Find Principal user_id for this branch if not specified
    let targetEscalatedUserId = escalated_to_user_id ? Number(escalated_to_user_id) : null;
    if (!targetEscalatedUserId) {
      const pRows = await query(
        `SELECT id FROM users WHERE role = 'principal' AND branch_id = ? LIMIT 1`,
        [concern.branch_id]
      );
      if (pRows.length > 0) {
        targetEscalatedUserId = pRows[0].id;
      }
    }

    await query(
      `UPDATE concerns
       SET is_escalated = 1,
           escalated_to_user_id = ?,
           escalated_at = NOW(),
           escalation_reason = ?,
           escalated_by_user_id = ?,
           priority = 'urgent'
       WHERE id = ?`,
      [targetEscalatedUserId, escalation_reason.trim(), req.user.id, id]
    );

    // Audit timeline
    await query(
      `INSERT INTO concern_timeline (concern_id, user_id, action_type, note)
       VALUES (?, ?, 'escalated', ?)`,
      [id, req.user.id, `Ticket escalated to leadership: ${escalation_reason.trim()}`]
    );

    res.json({
      message: 'Concern ticket escalated successfully to leadership',
      concernId: Number(id),
      is_escalated: true,
      priority: 'urgent',
    });
  } catch (error) {
    next(error);
  }
};
