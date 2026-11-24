import { query } from '../../config/database.js';
import { sendToStudent } from '../../utils/fcmStudent.js';
import { getLoggedInStaffProfile } from './portalController.js';

/**
 * Format local time to minutes for session comparison
 */
const timeToMinutes = (timeVal) => {
  if (!timeVal) return 0;
  if (typeof timeVal === 'string') {
    const [h, m] = timeVal.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  return Math.floor(timeVal / 60);
};

/**
 * Detect current suggested session from attendance_timings
 */
const detectCurrentSession = async (branchId, academicYearId) => {
  try {
    const rows = await query(
      `SELECT * FROM attendance_timings
       WHERE branch_id = ? AND academic_year_id = ? AND is_active = 1
       LIMIT 1`,
      [branchId, academicYearId]
    );

    if (rows.length === 0) {
      return { timing: null, suggested_session: 'session1' };
    }

    const timing = rows[0];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let suggestedSession = 'session1';
    if (timing.session2_enabled && timing.session2_start && timing.session2_end) {
      const s2Start = timeToMinutes(timing.session2_start);
      const s2End = timeToMinutes(timing.session2_end);
      const s1Start = timeToMinutes(timing.session1_start);
      const s1End = timeToMinutes(timing.session1_end);

      if (nowMinutes >= s2Start && nowMinutes <= s2End) {
        suggestedSession = 'session2';
      } else if (nowMinutes >= s1Start && nowMinutes <= s1End) {
        suggestedSession = 'session1';
      } else if (nowMinutes > s1End) {
        suggestedSession = 'session2';
      }
    }

    return { timing, suggested_session: suggestedSession };
  } catch (err) {
    return { timing: null, suggested_session: 'session1' };
  }
};

/**
 * GET /api/portal/student-attendance/assigned-classes
 * Scoped access to classes based on staff role:
 * - Primary & Co-Class Teacher: Restricted strictly to their assigned class sections (pre-select primary).
 * - Coordinators: Access to all classes in their assigned Wing/Stage.
 * - Principal & Admins: Campus-wide access to all classes.
 */
export const getAssignedClasses = async (req, res, next) => {
  try {
    const isCampusAdmin = ['super_admin', 'admin', 'principal'].includes(req.user.role);
    const branchId = req.user.branch_id || 1;

    // 1. Campus-wide access for Principal & Admins
    if (isCampusAdmin) {
      let sql = `
        SELECT
          bcs.id AS section_id,
          bcs.class_id,
          c.name AS class_name,
          c.code AS class_code,
          c.stage AS class_stage,
          bcs.name AS section_name,
          bcs.room_no,
          bcs.capacity,
          bcs.class_teacher_id,
          bcs.co_class_teacher_id,
          u_ct.name AS class_teacher_name,
          'Campus Administrator' AS role_title,
          1 AS is_primary
        FROM branch_class_sections bcs
        JOIN classes c ON bcs.class_id = c.id
        LEFT JOIN staff_profiles ct ON bcs.class_teacher_id = ct.id
        LEFT JOIN users u_ct ON ct.user_id = u_ct.id
        WHERE bcs.status = 'active'
      `;
      const params = [];
      if (req.user.role !== 'super_admin' && req.user.branch_id) {
        sql += ' AND bcs.branch_id = ?';
        params.push(req.user.branch_id);
      }
      sql += ' ORDER BY c.display_order ASC, c.name ASC, bcs.name ASC';

      const sections = await query(sql, params);

      return res.json({
        access_level: 'campus',
        can_edit_locked: true,
        sections,
        default_section_id: sections.length > 0 ? sections[0].section_id : null,
      });
    }

    // 2. Resolve Staff Profile for teacher/staff
    const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found for logged in user' });
    }

    const staffId = staff.id;

    // Check if staff is an active coordinator
    const coordRows = await query(
      `SELECT * FROM staff_coordinators
       WHERE staff_id = ? AND status = 'active'`,
      [staffId]
    );

    const isCoordinator = coordRows.length > 0;

    // 3. Coordinator access (Wing / Stage / Class level)
    if (isCoordinator) {
      const coord = coordRows[0];
      let sql = `
        SELECT
          bcs.id AS section_id,
          bcs.class_id,
          c.name AS class_name,
          c.code AS class_code,
          c.stage AS class_stage,
          bcs.name AS section_name,
          bcs.room_no,
          bcs.capacity,
          bcs.class_teacher_id,
          bcs.co_class_teacher_id,
          u_ct.name AS class_teacher_name,
          'Wing Coordinator' AS role_title,
          CASE WHEN bcs.class_teacher_id = ? THEN 1 ELSE 0 END AS is_primary
        FROM branch_class_sections bcs
        JOIN classes c ON bcs.class_id = c.id
        LEFT JOIN staff_profiles ct ON bcs.class_teacher_id = ct.id
        LEFT JOIN users u_ct ON ct.user_id = u_ct.id
        WHERE bcs.status = 'active' AND bcs.branch_id = ?
      `;
      const params = [staffId, staff.branch_id || branchId];

      if (coord.scope_type === 'stage' && coord.stage) {
        sql += ' AND c.stage = ?';
        params.push(coord.stage);
      } else if (coord.scope_type === 'class' && coord.class_id) {
        sql += ' AND bcs.class_id = ?';
        params.push(coord.class_id);
      }

      sql += ' ORDER BY is_primary DESC, c.display_order ASC, c.name ASC, bcs.name ASC';
      const sections = await query(sql, params);

      return res.json({
        access_level: 'coordinator',
        coordinator_role: coord.coordinator_role,
        scope_type: coord.scope_type,
        can_edit_locked: true,
        sections,
        default_section_id: sections.length > 0 ? sections[0].section_id : null,
      });
    }

    // 4. Primary Class Teacher & Co-Class Teacher strictly scoped
    const teacherSections = await query(
      `SELECT
         bcs.id AS section_id,
         bcs.class_id,
         c.name AS class_name,
         c.code AS class_code,
         c.stage AS class_stage,
         bcs.name AS section_name,
         bcs.room_no,
         bcs.capacity,
         bcs.class_teacher_id,
         bcs.co_class_teacher_id,
         CASE
           WHEN bcs.class_teacher_id = ? THEN 'Primary Class Teacher'
           WHEN bcs.co_class_teacher_id = ? THEN 'Co-Class Teacher'
           ELSE 'Assigned Teacher'
         END AS role_title,
         CASE WHEN bcs.class_teacher_id = ? THEN 1 ELSE 0 END AS is_primary
       FROM branch_class_sections bcs
       JOIN classes c ON bcs.class_id = c.id
       WHERE (bcs.class_teacher_id = ? OR bcs.co_class_teacher_id = ?)
         AND bcs.status = 'active'
       ORDER BY is_primary DESC, c.display_order ASC, bcs.name ASC`,
      [staffId, staffId, staffId, staffId, staffId]
    );

    return res.json({
      access_level: 'class_teacher',
      can_edit_locked: false,
      sections: teacherSections,
      default_section_id: teacherSections.length > 0 ? teacherSections[0].section_id : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/student-attendance/roster
 * Fetch student attendance roster for class section, date & session with tiered lock check
 */
export const getStudentAttendanceRoster = async (req, res, next) => {
  try {
    const { class_id, section_id, attendance_date, session } = req.query;

    if (!class_id || !section_id) {
      return res.status(400).json({ message: 'class_id and section_id are required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = attendance_date || todayStr;

    // Resolve branch & academic year
    const secRows = await query(
      'SELECT id, branch_id, class_id FROM branch_class_sections WHERE id = ?',
      [section_id]
    );
    const branchId = secRows.length > 0 ? secRows[0].branch_id : (req.user.branch_id || 1);

    let academicYearId = 1;
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      if (activeYears.length > 0) academicYearId = activeYears[0].id;
    } catch (e) {}

    // Auto-detect session if not provided
    const sessionInfo = await detectCurrentSession(branchId, academicYearId);
    const targetSession = session || sessionInfo.suggested_session || 'session1';

    // Tiered Backdated Attendance & Edit Lock check:
    // Today and past 2 days: Editable by teachers.
    // Older than 2 days: Locked for teachers (only Coordinators & Principal can edit/override).
    const dTarget = new Date(targetDate);
    const dToday = new Date(todayStr);
    const diffDays = Math.floor((dToday.getTime() - dTarget.getTime()) / (1000 * 60 * 60 * 24));

    const isOlderThan2Days = diffDays > 2;

    // Check user override authority (super_admin, admin, principal, or coordinator)
    let isPrivileged = ['super_admin', 'admin', 'principal'].includes(req.user.role);
    if (!isPrivileged) {
      const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
      if (staff) {
        const coord = await query(
          'SELECT id FROM staff_coordinators WHERE staff_id = ? AND status = "active"',
          [staff.id]
        );
        if (coord.length > 0) isPrivileged = true;
      }
    }

    const isLocked = isOlderThan2Days;
    const canEdit = !isLocked || isPrivileged;
    const lockMessage = isLocked && !isPrivileged
      ? 'Attendance records older than 2 days are locked for faculty edits. Contact your Coordinator or Principal to request an administrative override.'
      : null;

    // Query enrolled active students in this class and section
    const students = await query(
      `SELECT
         s.id AS student_id,
         CONCAT_WS(' ', s.first_name, s.last_name) AS student_name,
         s.roll_no,
         s.admission_number,
         s.gender,
         COALESCE(s.avatar_url, s.photo_url, '') AS photo_url,
         sa.id AS attendance_id,
         COALESCE(sa.status, 'present') AS status,
         COALESCE(sa.remarks, '') AS remarks,
         CASE WHEN sa.id IS NOT NULL THEN 1 ELSE 0 END AS is_recorded
       FROM students s
       LEFT JOIN student_attendance sa
         ON sa.student_id = s.id
        AND sa.attendance_date = ?
        AND sa.session = ?
       WHERE s.class_id = ?
         AND s.section_id = ?
         AND s.status = 'active'
       ORDER BY s.roll_no ASC, s.first_name ASC`,
      [targetDate, targetSession, class_id, section_id]
    );

    // Summary counters
    const totalCount = students.length;
    const presentCount = students.filter(s => s.status === 'present').length;
    const absentCount = students.filter(s => s.status === 'absent').length;
    const lateCount = students.filter(s => s.status === 'late').length;

    res.json({
      attendance_date: targetDate,
      session: targetSession,
      is_locked: isLocked,
      can_edit: canEdit,
      is_privileged_override: isPrivileged && isLocked,
      lock_message: lockMessage,
      timing: sessionInfo.timing,
      summary: {
        total: totalCount,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
      students,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/student-attendance/save
 * Batch save student attendance with tiered lock validation and silent background FCM absent alerts
 */
export const saveStudentAttendance = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      attendance_date,
      session = 'session1',
      timing_id,
      records,
    } = req.body;

    if (!class_id || !section_id || !attendance_date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'class_id, section_id, attendance_date, and records array are required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dTarget = new Date(attendance_date);
    const dToday = new Date(todayStr);
    const diffDays = Math.floor((dToday.getTime() - dTarget.getTime()) / (1000 * 60 * 60 * 24));

    // Check lock permission if older than 2 days
    if (diffDays > 2) {
      let isPrivileged = ['super_admin', 'admin', 'principal'].includes(req.user.role);
      if (!isPrivileged) {
        const staff = await getLoggedInStaffProfile(req.user.id, req.user.phone);
        if (staff) {
          const coord = await query(
            'SELECT id FROM staff_coordinators WHERE staff_id = ? AND status = "active"',
            [staff.id]
          );
          if (coord.length > 0) isPrivileged = true;
        }
      }

      if (!isPrivileged) {
        return res.status(403).json({
          message: 'Attendance for dates older than 2 days is locked for teachers. Please contact your Coordinator or Principal to make backdated updates.',
        });
      }
    }

    // Determine target branch & academic year
    let targetBranchId = branch_id;
    if (!targetBranchId) {
      const secRows = await query('SELECT branch_id FROM branch_class_sections WHERE id = ?', [section_id]);
      targetBranchId = secRows.length > 0 ? secRows[0].branch_id : (req.user.branch_id || 1);
    }

    let targetYearId = academic_year_id;
    if (!targetYearId) {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      targetYearId = activeYears.length > 0 ? activeYears[0].id : 1;
    }

    const markedBy = req.user.id;
    let savedCount = 0;
    const absentees = [];

    // Batch upsert into student_attendance
    for (const rec of records) {
      const { student_id, status = 'present', remarks } = rec;
      if (!student_id) continue;

      await query(
        `INSERT INTO student_attendance
           (student_id, branch_id, academic_year_id, class_id, section_id, attendance_date, session, status, remarks, marked_by, timing_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status     = VALUES(status),
           remarks    = VALUES(remarks),
           marked_by  = VALUES(marked_by),
           timing_id  = VALUES(timing_id),
           updated_at = NOW()`,
        [
          student_id,
          targetBranchId,
          targetYearId,
          class_id,
          section_id,
          attendance_date,
          session,
          status,
          remarks || null,
          markedBy,
          timing_id || null,
        ]
      );

      savedCount++;

      if (status === 'absent') {
        absentees.push({ student_id, remarks });
      }
    }

    // Silent background FCM dispatch for absentees (non-blocking)
    if (absentees.length > 0) {
      const sessionLabel = session === 'session2' ? 'Afternoon (Session 2)' : 'Morning (Session 1)';
      Promise.allSettled(
        absentees.map(async (abs) => {
          try {
            const stRows = await query('SELECT first_name, last_name FROM students WHERE id = ?', [abs.student_id]);
            const stName = stRows.length > 0 ? `${stRows[0].first_name || ''} ${stRows[0].last_name || ''}`.trim() : 'Student';
            await sendToStudent(abs.student_id, {
              title: 'Student Attendance Alert: Absent',
              body: `Dear Parent, ${stName} was marked ABSENT for ${sessionLabel} on ${attendance_date}.${abs.remarks ? ` Note: ${abs.remarks}` : ''}`,
              data: {
                type: 'attendance_alert',
                student_id: String(abs.student_id),
                date: attendance_date,
                session,
                status: 'absent',
              },
            });
          } catch (fcmErr) {
            console.warn(`[FCM Silent Dispatch] Could not deliver alert for student ${abs.student_id}:`, fcmErr.message);
          }
        })
      ).catch(() => {});
    }

    res.json({
      message: 'Student attendance saved successfully',
      date: attendance_date,
      session,
      saved_count: savedCount,
      absentees_count: absentees.length,
      fcm_dispatched: absentees.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/student-attendance/copy-morning
 * 'Copy Morning to Afternoon' shortcut: copies session1 records into session2
 */
export const copyMorningToAfternoon = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, class_id, section_id, attendance_date } = req.body;

    if (!class_id || !section_id || !attendance_date) {
      return res.status(400).json({ message: 'class_id, section_id, and attendance_date are required' });
    }

    // Fetch morning session records
    const morningRecords = await query(
      `SELECT student_id, branch_id, academic_year_id, class_id, section_id, status, remarks, timing_id
       FROM student_attendance
       WHERE class_id = ?
         AND section_id = ?
         AND attendance_date = ?
         AND session = 'session1'`,
      [class_id, section_id, attendance_date]
    );

    if (morningRecords.length === 0) {
      return res.status(404).json({
        message: 'No Morning (Session 1) attendance records found for this class and date. Please mark Session 1 first.',
      });
    }

    const markedBy = req.user.id;
    let copiedCount = 0;

    for (const rec of morningRecords) {
      await query(
        `INSERT INTO student_attendance
           (student_id, branch_id, academic_year_id, class_id, section_id, attendance_date, session, status, remarks, marked_by, timing_id)
         VALUES (?, ?, ?, ?, ?, ?, 'session2', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status     = VALUES(status),
           remarks    = VALUES(remarks),
           marked_by  = VALUES(marked_by),
           updated_at = NOW()`,
        [
          rec.student_id,
          rec.branch_id || branch_id || 1,
          rec.academic_year_id || academic_year_id || 1,
          rec.class_id,
          rec.section_id,
          attendance_date,
          rec.status,
          rec.remarks || null,
          markedBy,
          rec.timing_id || null,
        ]
      );
      copiedCount++;
    }

    res.json({
      message: `Morning attendance successfully copied to Afternoon session (${copiedCount} students)`,
      copied_count: copiedCount,
      date: attendance_date,
    });
  } catch (error) {
    next(error);
  }
};
