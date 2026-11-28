import { query } from '../../config/database.js';

/**
 * Helper to resolve staff_profile for the logged-in user
 */
export const getLoggedInStaffProfile = async (userId, userPhone = null) => {
  let rows = await query(
    `SELECT sp.*, u.name AS user_name, u.role AS user_role, u.username AS user_email, u.phone AS user_phone,
            b.name AS branch_name, b.code AS branch_code
     FROM staff_profiles sp
     LEFT JOIN users u ON sp.user_id = u.id
     LEFT JOIN branches b ON sp.branch_id = b.id
     WHERE sp.user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (rows.length === 0 && userPhone) {
    rows = await query(
      `SELECT sp.*, u.name AS user_name, u.role AS user_role, u.username AS user_email, u.phone AS user_phone,
              b.name AS branch_name, b.code AS branch_code
       FROM staff_profiles sp
       LEFT JOIN users u ON sp.user_id = u.id
       LEFT JOIN branches b ON sp.branch_id = b.id
       WHERE sp.phone = ? OR sp.emergency_contact_phone = ?
       LIMIT 1`,
      [userPhone, userPhone]
    );
  }

  if (rows.length === 0) {
    return null;
  }

  const staff = rows[0];
  staff.full_name = (staff.first_name || staff.last_name)
    ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
    : (staff.user_name || staff.emp_no);
  staff.display_phone = staff.phone || staff.user_phone || staff.emergency_contact_phone || '';
  return staff;
};

/**
 * GET /api/portal/dashboard
 * Staff Portal Dashboard Overview
 */
export const getPortalDashboard = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);

    if (!staff) {
      return res.status(404).json({
        message: 'No associated staff profile found for current user account',
        user: req.user,
      });
    }

    const staffId = staff.id;
    const branchId = staff.branch_id || req.user.branch_id || 1;

    // 1. Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attRows = await query(
      `SELECT status, COALESCE(check_in, check_in_time) AS check_in, COALESCE(check_out, check_out_time) AS check_out, remarks
       FROM staff_attendance
       WHERE staff_id = ? AND attendance_date = ?
       LIMIT 1`,
      [staffId, today]
    );
    const todayAttendance = attRows.length > 0
      ? attRows[0]
      : { status: 'not_marked', check_in: null, check_out: null, remarks: null };

    // 2. Class teacher assignments
    const classTeacherRows = await query(
      `SELECT bcs.id AS section_id, bcs.class_id, c.name AS class_name, c.code AS class_code,
              bcs.name AS section_name, bcs.room_no, bcs.capacity,
              CASE
                WHEN bcs.class_teacher_id = ? THEN 'Primary Class Teacher'
                ELSE 'Co-Class Teacher'
              END AS role
       FROM branch_class_sections bcs
       JOIN classes c ON bcs.class_id = c.id
       WHERE bcs.class_teacher_id = ? OR bcs.co_class_teacher_id = ?`,
      [staffId, staffId, staffId]
    );

    // 3. Subject allocations (filtered by active academic year if set)
    const activeAyId = req.scope?.academicYearId || null;
    const subjectRows = await query(
      `SELECT tsa.id, tsa.class_id, tsa.section_id, tsa.subject_id, tsa.weekly_periods,
              c.name AS class_name, bcs.name AS section_name, sub.name AS subject_name, sub.code AS subject_code
       FROM teacher_subject_allocations tsa
       JOIN classes c ON tsa.class_id = c.id
       JOIN branch_class_sections bcs ON tsa.section_id = bcs.id
       JOIN subjects sub ON tsa.subject_id = sub.id
       WHERE tsa.teacher_id = ? AND tsa.status = 'active'
         ${activeAyId ? 'AND tsa.academic_year_id = ?' : ''}`,
      [staffId, ...(activeAyId ? [activeAyId] : [])]
    );

    // 4. Leave balances summary
    const leaveBalances = await query(
      `SELECT slb.id, slb.leave_type_id, slt.code AS leave_type_code, slt.name AS leave_type_name,
              slt.annual_quota,
              COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) AS allocated,
              COALESCE(slb.used_days, slb.used, 0) AS used,
              COALESCE(slb.pending_days, slb.pending, 0) AS pending,
              GREATEST(0, (COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) - COALESCE(slb.used_days, slb.used, 0) - COALESCE(slb.pending_days, slb.pending, 0))) AS available
       FROM staff_leave_balances slb
       JOIN staff_leave_types slt ON slb.leave_type_id = slt.id
       WHERE slb.staff_id = ?`,
      [staffId]
    );

    // 5. Latest payslip
    const payslipRows = await query(
      `SELECT id, pay_month, pay_year, total_days_in_month, paid_days, lop_days, gross_earned, total_deductions, net_salary, payment_status, payment_date
       FROM staff_payslips
       WHERE staff_id = ?
       ORDER BY pay_year DESC, pay_month DESC
       LIMIT 1`,
      [staffId]
    );
    const latestPayslip = payslipRows.length > 0 ? payslipRows[0] : null;

    // 6. Pending leave approvals count (if approver)
    const canApproveLeaves = ['super_admin', 'admin', 'principal'].includes(req.user.role);
    let pendingApprovalsCount = 0;
    if (canApproveLeaves) {
      const pendingRows = await query(
        `SELECT COUNT(*) AS count
         FROM staff_leave_applications
         WHERE status = 'pending' AND (branch_id = ? OR ? IS NULL)`,
        [branchId, req.user.role === 'super_admin' ? null : branchId]
      );
      pendingApprovalsCount = Number(pendingRows[0]?.count || 0);
    }

    res.json({
      staff,
      today_attendance: todayAttendance,
      assigned_classes: classTeacherRows,
      allocated_subjects: subjectRows,
      leave_balances: leaveBalances,
      latest_payslip: latestPayslip,
      pending_approvals_count: pendingApprovalsCount,
      can_approve_leaves: canApproveLeaves,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/profile
 * Logged-in Staff Member 360° Profile (Read-Only)
 */
export const getPortalProfile = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const staffId = staff.id;

    // Documents
    const documents = await query(
      `SELECT id, doc_type, title, file_url, file_name, file_size, uploaded_at,
              COALESCE(document_type, doc_type) AS document_type,
              COALESCE(document_name, title) AS document_name
       FROM staff_documents
       WHERE staff_id = ?
       ORDER BY uploaded_at DESC`,
      [staffId]
    );

    // Allocations
    const classTeacherAllocations = await query(
      `SELECT bcs.id, c.name AS class_name, bcs.name AS section_name, bcs.room_no,
              CASE
                WHEN bcs.class_teacher_id = ? THEN 'Primary Class Teacher'
                ELSE 'Co-Class Teacher'
              END AS role
       FROM branch_class_sections bcs
       JOIN classes c ON bcs.class_id = c.id
       WHERE bcs.class_teacher_id = ? OR bcs.co_class_teacher_id = ?`,
      [staffId, staffId, staffId]
    );

    const subjectAllocations = await query(
      `SELECT tsa.id, c.name AS class_name, bcs.name AS section_name, sub.name AS subject_name, sub.code AS subject_code, tsa.weekly_periods
       FROM teacher_subject_allocations tsa
       JOIN classes c ON tsa.class_id = c.id
       JOIN branch_class_sections bcs ON tsa.section_id = bcs.id
       JOIN subjects sub ON tsa.subject_id = sub.id
       WHERE tsa.teacher_id = ?`,
      [staffId]
    );

    // Leave Balances
    const leaveBalances = await query(
      `SELECT slb.*, slt.name AS leave_type_name, slt.code AS leave_type_code, slt.annual_quota,
              GREATEST(0, (COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) - COALESCE(slb.used_days, slb.used, 0) - COALESCE(slb.pending_days, slb.pending, 0))) AS available_balance
       FROM staff_leave_balances slb
       JOIN staff_leave_types slt ON slb.leave_type_id = slt.id
       WHERE slb.staff_id = ?`,
      [staffId]
    );

    // Payroll Structure
    const payrollRows = await query(
      `SELECT * FROM staff_payroll_structures WHERE staff_id = ? LIMIT 1`,
      [staffId]
    );
    const payrollStructure = payrollRows.length > 0 ? payrollRows[0] : null;

    res.json({
      staff,
      documents,
      allocations: {
        classTeacher: classTeacherAllocations,
        subjects: subjectAllocations,
      },
      leaveBalances,
      payrollStructure,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/leaves
 * Logged-in Staff's Leave Balances & Applications History
 */
export const getPortalLeaves = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const staffId = staff.id;

    // Balances
    const balances = await query(
      `SELECT slb.id, slb.leave_type_id, slt.code AS leave_type_code, slt.name AS leave_type_name,
              slt.annual_quota,
              COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) AS allocated,
              COALESCE(slb.used_days, slb.used, 0) AS used,
              COALESCE(slb.pending_days, slb.pending, 0) AS pending,
              GREATEST(0, (COALESCE(slb.total_allocated, slb.allocated, slt.annual_quota) - COALESCE(slb.used_days, slb.used, 0) - COALESCE(slb.pending_days, slb.pending, 0))) AS available
       FROM staff_leave_balances slb
       JOIN staff_leave_types slt ON slb.leave_type_id = slt.id
       WHERE slb.staff_id = ?`,
      [staffId]
    );

    // Application history
    const applications = await query(
      `SELECT sla.*, slt.name AS leave_type_name, slt.code AS leave_type_code,
              reviewer.name AS reviewer_name
       FROM staff_leave_applications sla
       JOIN staff_leave_types slt ON sla.leave_type_id = slt.id
       LEFT JOIN users reviewer ON sla.reviewed_by = reviewer.id
       WHERE sla.staff_id = ?
       ORDER BY sla.created_at DESC`,
      [staffId]
    );

    res.json({
      balances,
      applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/leaves/apply
 * Submit leave application on behalf of logged-in staff member
 */
export const applyPortalLeave = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const { leave_type_id, from_date, to_date, reason } = req.body;

    if (!leave_type_id || !from_date || !to_date) {
      return res.status(400).json({ message: 'leave_type_id, from_date, and to_date are required' });
    }

    const fromTime = new Date(from_date).getTime();
    const toTime = new Date(to_date).getTime();
    if (toTime < fromTime) {
      return res.status(400).json({ message: 'to_date cannot be earlier than from_date' });
    }
    const days = Math.max(1, Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)) + 1);

    const insertResult = await query(
      `INSERT INTO staff_leave_applications (
         branch_id, staff_id, leave_type_id, from_date, to_date, total_days, days, reason, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        staff.branch_id || 1,
        staff.id,
        leave_type_id,
        from_date,
        to_date,
        days,
        days,
        reason || 'Leave requested via Staff Portal',
      ]
    );

    // Reserve pending balance
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      const yearId = activeYears.length > 0 ? activeYears[0].id : 1;

      await query(
        `UPDATE staff_leave_balances
         SET pending_days = pending_days + ?,
             pending = pending + ?
         WHERE staff_id = ? AND leave_type_id = ? AND academic_year_id = ?`,
        [days, days, staff.id, leave_type_id, yearId]
      );
    } catch (e) {
      console.warn('Could not update pending leave balance:', e.message);
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
 * GET /api/portal/leave-approvals
 * Approvals queue for administrators / principals / coordinators
 */
export const getPortalLeaveApprovals = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;

    const isApprover = ['super_admin', 'admin', 'principal'].includes(req.user.role);
    if (!isApprover) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to approve leaves' });
    }

    let sql = `
      SELECT sla.*, slt.name AS leave_type_name, slt.code AS leave_type_code,
             sp.emp_no, sp.first_name, sp.last_name,
             TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
             u.name AS staff_user_name,
             sp.designation, sp.department, COALESCE(sp.avatar_url, '') AS photo_url,
             reviewer.name AS reviewer_name
      FROM staff_leave_applications sla
      JOIN staff_profiles sp ON sla.staff_id = sp.id
      JOIN staff_leave_types slt ON sla.leave_type_id = slt.id
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN users reviewer ON sla.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND sla.branch_id = ?';
      params.push(req.user.branch_id);
    }
    if (status && status !== 'all') {
      sql += ' AND sla.status = ?';
      params.push(status);
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
 * PUT /api/portal/leave-approvals/:appId/status
 * Approve or Reject leave application
 */
export const updatePortalLeaveApproval = async (req, res, next) => {
  try {
    const isApprover = ['super_admin', 'admin', 'principal'].includes(req.user.role);
    if (!isApprover) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to review leaves' });
    }

    const { appId } = req.params;
    const { status, review_remarks } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be "approved" or "rejected"' });
    }

    const appRows = await query('SELECT * FROM staff_leave_applications WHERE id = ?', [appId]);
    if (appRows.length === 0) {
      return res.status(404).json({ message: 'Leave application not found' });
    }
    const app = appRows[0];

    const reviewerId = req.user.id;
    const leaveDays = Number(app.total_days || app.days || 1);

    await query(
      `UPDATE staff_leave_applications
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           review_remarks = ?
       WHERE id = ?`,
      [status, reviewerId, review_remarks || null, appId]
    );

    // Adjust balances
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
      } else {
        await query(
          `UPDATE staff_leave_balances
           SET pending_days = GREATEST(0, pending_days - ?),
               pending = GREATEST(0, pending - ?)
           WHERE staff_id = ? AND leave_type_id = ? AND academic_year_id = ?`,
          [leaveDays, leaveDays, app.staff_id, app.leave_type_id, yearId]
        );
      }
    } catch (e) {
      console.warn('Could not update balance on approval/rejection:', e.message);
    }

    res.json({
      message: `Leave application marked as ${status}`,
      applicationId: Number(appId),
      status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/attendance
 * Attendance history for logged-in staff member
 */
export const getPortalAttendance = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const { month, year } = req.query;
    const currentYear = year ? Number(year) : new Date().getFullYear();
    const currentMonth = month ? Number(month) : (new Date().getMonth() + 1);

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const attendanceLogs = await query(
      `SELECT id, attendance_date, DAY(attendance_date) AS day_of_month, status,
              COALESCE(check_in, check_in_time) AS check_in,
              COALESCE(check_out, check_out_time) AS check_out,
              remarks, punch_source
       FROM staff_attendance
       WHERE staff_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
       ORDER BY attendance_date ASC`,
      [staff.id, currentMonth, currentYear]
    );

    let present = 0;
    let late = 0;
    let halfDay = 0;
    let onDuty = 0;
    let absent = 0;

    const dailyMap = {};
    for (const log of attendanceLogs) {
      dailyMap[log.day_of_month] = log;
      if (log.status === 'present') present++;
      else if (log.status === 'late') late++;
      else if (log.status === 'half_day') halfDay++;
      else if (log.status === 'on_duty') onDuty++;
      else if (log.status === 'absent') absent++;
    }

    const effectiveDays = present + late + onDuty + (halfDay * 0.5);
    const totalDaysMarked = attendanceLogs.length;
    const percentage = totalDaysMarked > 0 ? Math.round((effectiveDays / totalDaysMarked) * 100) : 0;

    res.json({
      month: currentMonth,
      year: currentYear,
      days_in_month: daysInMonth,
      summary: {
        total_marked: totalDaysMarked,
        present,
        late,
        half_day: halfDay,
        on_duty: onDuty,
        absent,
        attendance_percentage: percentage,
      },
      daily_records: dailyMap,
      logs: attendanceLogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/classes
 * Classes and Subject Allocations for logged-in teacher
 */
export const getPortalClasses = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const staffId = staff.id;

    // Class teacher sections
    const classTeacherSections = await query(
      `SELECT bcs.id AS section_id, bcs.class_id, c.name AS class_name, c.code AS class_code, c.stage AS class_stage,
              bcs.name AS section_name, bcs.room_no, bcs.capacity,
              CASE
                WHEN bcs.class_teacher_id = ? THEN 'Primary Class Teacher'
                ELSE 'Co-Class Teacher'
              END AS assignment_type
       FROM branch_class_sections bcs
       JOIN classes c ON bcs.class_id = c.id
       WHERE bcs.class_teacher_id = ? OR bcs.co_class_teacher_id = ?`,
      [staffId, staffId, staffId]
    );

    // Subject allocations
    const subjectAllocations = await query(
      `SELECT tsa.id, tsa.class_id, tsa.section_id, tsa.subject_id, tsa.weekly_periods,
              c.name AS class_name, bcs.name AS section_name, sub.name AS subject_name, sub.code AS subject_code
       FROM teacher_subject_allocations tsa
       JOIN classes c ON tsa.class_id = c.id
       JOIN branch_class_sections bcs ON tsa.section_id = bcs.id
       JOIN subjects sub ON tsa.subject_id = sub.id
       WHERE tsa.teacher_id = ? AND tsa.status = 'active'`,
      [staffId]
    );

    res.json({
      class_teacher_sections: classTeacherSections,
      subject_allocations: subjectAllocations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/payslips
 * Payslip history for logged-in staff member
 */
export const getPortalPayslips = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const payslips = await query(
      `SELECT id, pay_month, pay_year, total_days_in_month, paid_days, lop_days, lop_amount,
              basic_earned, hra_earned, allowances_total, gross_earned,
              pf_amount, esi_amount, pt_amount, tds_amount, total_deductions,
              net_salary, payment_status, payment_date, payment_mode, created_at
       FROM staff_payslips
       WHERE staff_id = ?
       ORDER BY pay_year DESC, pay_month DESC`,
      [staff.id]
    );

    res.json({ payslips });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/payslips/:id
 * Detailed single payslip view for printing/viewing
 */
export const getPortalPayslipById = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const { id } = req.params;

    const rows = await query(
      `SELECT spay.*,
              sp.emp_no, sp.first_name, sp.last_name,
              TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
              u.name AS user_name, sp.designation, sp.department, sp.joining_date,
              sp.bank_name, COALESCE(sp.account_no, '') AS bank_account_no,
              COALESCE(sp.ifsc_code, '') AS bank_ifsc, COALESCE(sp.pan_no, '') AS pan_no,
              COALESCE(sp.pf_uan_no, '') AS uan_no, COALESCE(sp.esi_no, '') AS esi_no,
              b.name AS branch_name, b.code AS branch_code, b.address AS branch_address
       FROM staff_payslips spay
       JOIN staff_profiles sp ON spay.staff_id = sp.id
       LEFT JOIN users u ON sp.user_id = u.id
       LEFT JOIN branches b ON spay.branch_id = b.id
       WHERE spay.id = ? AND (spay.staff_id = ? OR ? = 1)`,
      [id, staff.id, req.user.role === 'super_admin' ? 1 : 0]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Payslip not found or access denied' });
    }

    const payslip = rows[0];
    payslip.staff_name = (payslip.profile_full_name && payslip.profile_full_name.trim() !== '')
      ? payslip.profile_full_name.trim()
      : (payslip.user_name || payslip.emp_no);

    res.json({ payslip });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/appointments
 * Get visitor appointments for the logged-in staff member
 */
export const getPortalAppointments = async (req, res, next) => {
  try {
    const staff = await getLoggedInStaffProfile(req.user?.id, req.user?.phone);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff profile not found' });
    }

    const appointments = await query(
      `SELECT * FROM visitor_appointments 
       WHERE person_to_meet_id = ? OR person_to_meet_name LIKE ?
       ORDER BY appointment_date DESC, appointment_time ASC`,
      [staff.id, `%${staff.full_name}%`]
    );

    res.json({ success: true, appointments });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/portal/appointments/:id/status
 * Staff member approves/rejects their appointment
 */
export const updatePortalAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, staff_remarks } = req.body;
    const staff = await getLoggedInStaffProfile(req.user?.id, req.user?.phone);

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    await query(
      `UPDATE visitor_appointments 
       SET status = ?, staff_remarks = ?, approved_by = ?
       WHERE id = ?`,
      [status, staff_remarks || null, staff ? staff.user_id : req.user?.id, id]
    );

    const [updated] = await query('SELECT * FROM visitor_appointments WHERE id = ?', [id]);
    res.json({ success: true, message: `Appointment ${status} successfully`, appointment: updated });
  } catch (error) {
    next(error);
  }
};
