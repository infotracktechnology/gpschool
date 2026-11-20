import { query } from '../../config/database.js';

/**
 * GET /api/staff/leaves/types
 * List all available leave types
 */
export const getLeaveTypes = async (_req, res, next) => {
  try {
    const leaveTypes = await query(
      `SELECT id, code, name, annual_quota, carry_forward
       FROM staff_leave_types
       ORDER BY id ASC`
    );
    res.json({ leaveTypes });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/:staffId/leave-balances
 * Get leave balances for a specific staff member
 */
export const getLeaveBalances = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { academic_year_id } = req.query;

    let targetYearId = academic_year_id ? Number(academic_year_id) : null;
    if (!targetYearId) {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      targetYearId = activeYears.length > 0 ? activeYears[0].id : 1;
    }

    // Verify staff exists
    const staffRows = await query('SELECT id, branch_id FROM staff_profiles WHERE id = ?', [staffId]);
    if (staffRows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    // Check if balances already exist
    let balances = await query(
      `SELECT
         slb.id,
         slb.staff_id,
         slb.academic_year_id,
         slb.leave_type_id,
         slt.name AS leave_type_name,
         slt.code AS leave_type_code,
         slt.annual_quota,
         COALESCE(slb.opening_balance, 0) AS opening_balance,
         COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) AS allocated,
         COALESCE(slb.used_days, slb.used, 0) AS used,
         COALESCE(slb.pending_days, slb.pending, 0) AS pending,
         GREATEST(0, (COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) - COALESCE(slb.used_days, slb.used, 0) - COALESCE(slb.pending_days, slb.pending, 0))) AS available_balance
       FROM staff_leave_balances slb
       JOIN staff_leave_types slt ON slb.leave_type_id = slt.id
       WHERE slb.staff_id = ? AND slb.academic_year_id = ?
       ORDER BY slt.id ASC`,
      [staffId, targetYearId]
    );

    // If no balances found, auto-initialize
    if (balances.length === 0) {
      const allTypes = await query('SELECT id, code, name, annual_quota FROM staff_leave_types ORDER BY id ASC');
      for (const lt of allTypes) {
        const quota = Number(lt.annual_quota) || 12;
        await query(
          `INSERT INTO staff_leave_balances (
             academic_year_id,
             staff_id,
             leave_type_id,
             opening_balance,
             allocated,
             total_allocated,
             used,
             used_days,
             pending,
             pending_days
           ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)
           ON DUPLICATE KEY UPDATE
             total_allocated = VALUES(total_allocated),
             allocated = VALUES(allocated)`,
          [targetYearId, staffId, lt.id, quota, quota, quota]
        );
      }

      balances = await query(
        `SELECT
           slb.id,
           slb.staff_id,
           slb.academic_year_id,
           slb.leave_type_id,
           slt.name AS leave_type_name,
           slt.code AS leave_type_code,
           slt.annual_quota,
           COALESCE(slb.opening_balance, 0) AS opening_balance,
           COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) AS allocated,
           COALESCE(slb.used_days, slb.used, 0) AS used,
           COALESCE(slb.pending_days, slb.pending, 0) AS pending,
           GREATEST(0, (COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) - COALESCE(slb.used_days, slb.used, 0) - COALESCE(slb.pending_days, slb.pending, 0))) AS available_balance
         FROM staff_leave_balances slb
         JOIN staff_leave_types slt ON slb.leave_type_id = slt.id
         WHERE slb.staff_id = ? AND slb.academic_year_id = ?
         ORDER BY slt.id ASC`,
        [staffId, targetYearId]
      );
    }

    res.json({ leaveBalances: balances });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff/leaves/apply
 * Apply for leave
 */
export const applyLeave = async (req, res, next) => {
  try {
    const { staff_id, branch_id, leave_type_id, from_date, to_date, reason } = req.body;

    if (!staff_id || !leave_type_id || !from_date || !to_date) {
      return res.status(400).json({ message: 'staff_id, leave_type_id, from_date, and to_date are required' });
    }

    // Verify staff
    const staffRows = await query('SELECT id, branch_id FROM staff_profiles WHERE id = ?', [staff_id]);
    if (staffRows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }
    const staff = staffRows[0];
    const targetBranchId = staff.branch_id || branch_id || (req.user.branch_id || 1);

    // Calculate total days
    const fromTime = new Date(from_date).getTime();
    const toTime = new Date(to_date).getTime();
    if (toTime < fromTime) {
      return res.status(400).json({ message: 'to_date cannot be earlier than from_date' });
    }
    const days = Math.max(1, Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)) + 1);

    // Insert leave application
    const insertResult = await query(
      `INSERT INTO staff_leave_applications (
         branch_id,
         staff_id,
         leave_type_id,
         from_date,
         to_date,
         total_days,
         days,
         reason,
         status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        targetBranchId,
        staff_id,
        leave_type_id,
        from_date,
        to_date,
        days,
        days,
        reason || 'Leave application',
      ]
    );

    // Update staff_leave_balances pending days
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      const yearId = activeYears.length > 0 ? activeYears[0].id : 1;

      await query(
        `UPDATE staff_leave_balances
         SET pending_days = pending_days + ?,
             pending = pending + ?
         WHERE staff_id = ? AND leave_type_id = ? AND academic_year_id = ?`,
        [days, days, staff_id, leave_type_id, yearId]
      );
    } catch (balErr) {
      console.warn('Could not update pending leave balances:', balErr.message);
    }

    res.status(201).json({
      message: 'Leave application submitted successfully',
      applicationId: insertResult.insertId,
      days,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/leaves/applications
 * For Principal & Admin approval dashboard
 */
export const getLeaveApplications = async (req, res, next) => {
  try {
    const { branch_id, status, search, staff_id } = req.query;

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    let sql = `
      SELECT
        sla.id,
        sla.branch_id,
        b.name AS branch_name,
        sla.staff_id,
        sp.emp_no,
        sp.first_name,
        sp.last_name,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
        u.name AS staff_user_name,
        sp.designation,
        sp.department,
        COALESCE(sp.avatar_url, '') AS photo_url,
        sla.leave_type_id,
        slt.name AS leave_type_name,
        slt.code AS leave_type_code,
        sla.from_date,
        sla.to_date,
        COALESCE(sla.total_days, sla.days, 1) AS days,
        COALESCE(sla.total_days, sla.days, 1) AS total_days,
        sla.reason,
        sla.status,
        sla.reviewed_by,
        reviewer.name AS reviewer_name,
        sla.reviewed_at,
        sla.review_remarks,
        sla.created_at
      FROM staff_leave_applications sla
      JOIN staff_profiles sp ON sla.staff_id = sp.id
      JOIN staff_leave_types slt ON sla.leave_type_id = slt.id
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN branches b ON sla.branch_id = b.id
      LEFT JOIN users reviewer ON sla.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];

    if (targetBranchId) {
      sql += ' AND sla.branch_id = ?';
      params.push(Number(targetBranchId));
    }
    if (staff_id && staff_id !== 'all') {
      sql += ' AND sla.staff_id = ?';
      params.push(Number(staff_id));
    }
    if (status && status !== 'all') {
      sql += ' AND sla.status = ?';
      params.push(status);
    }
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.emp_no LIKE ? OR u.name LIKE ? OR sla.reason LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY sla.created_at DESC';

    const rawRows = await query(sql, params);

    const applications = rawRows.map(row => ({
      ...row,
      staff_name: (row.profile_full_name && row.profile_full_name.trim() !== '') ? row.profile_full_name.trim() : (row.staff_user_name || row.emp_no),
    }));

    res.json({ applications });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/staff/leaves/applications/:appId/status
 * Approve or Reject a leave application
 */
export const updateLeaveApplicationStatus = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { status, review_remarks, reviewRemarks } = req.body;

    const finalRemarks = review_remarks || reviewRemarks || null;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be either "approved" or "rejected"' });
    }

    const appRows = await query('SELECT * FROM staff_leave_applications WHERE id = ?', [appId]);
    if (appRows.length === 0) {
      return res.status(404).json({ message: 'Leave application not found' });
    }
    const app = appRows[0];

    // Branch scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (app.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot review leaves from another branch' });
      }
    }

    if (app.status !== 'pending') {
      return res.status(400).json({ message: `Application has already been ${app.status}` });
    }

    const reviewerId = req.user.id;
    const leaveDays = Number(app.total_days || app.days || 1);

    // Update application
    await query(
      `UPDATE staff_leave_applications
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           review_remarks = ?
       WHERE id = ?`,
      [status, reviewerId, finalRemarks, appId]
    );

    // Update balances
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      const yearId = activeYears.length > 0 ? activeYears[0].id : 1;

      if (status === 'approved') {
        await query(
          `UPDATE staff_leave_balances
           SET used_days = used_days + ?,
               used = used + ?,
               pending_days = GREATEST(0, pending_days - ?),
               pending = GREATEST(0, pending - ?)
           WHERE staff_id = ? AND leave_type_id = ? AND academic_year_id = ?`,
          [leaveDays, leaveDays, leaveDays, leaveDays, app.staff_id, app.leave_type_id, yearId]
        );
      } else if (status === 'rejected') {
        await query(
          `UPDATE staff_leave_balances
           SET pending_days = GREATEST(0, pending_days - ?),
               pending = GREATEST(0, pending - ?)
           WHERE staff_id = ? AND leave_type_id = ? AND academic_year_id = ?`,
          [leaveDays, leaveDays, app.staff_id, app.leave_type_id, yearId]
        );
      }
    } catch (balErr) {
      console.warn('Balance adjustment error on approval/rejection:', balErr.message);
    }

    res.json({
      message: `Leave application ${status} successfully`,
      applicationId: Number(appId),
      status,
    });
  } catch (error) {
    next(error);
  }
};
