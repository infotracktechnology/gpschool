import { query } from '../config/database.js';
import { buildScopeFilter } from '../middleware/authMiddleware.js';

/**
 * GET /api/dashboard/overview
 * Unified Executive ERP Overview scoped by req.scope (branchId & academicYearId)
 */
export const getExecutiveOverview = async (req, res, next) => {
  try {
    const bothScope = buildScopeFilter(req);
    const branchScope = buildScopeFilter(req, '', { includeAy: false });
    const branchId = bothScope.branchId;
    const ayId = bothScope.academicYearId;

    const seScope = buildScopeFilter(req, 'se');
    const cScope = buildScopeFilter(req, 'c', { includeAy: false });
    const bayScope = buildScopeFilter(req, 'bay');

    const [
      studentTotalsRows,
      classCountRows,
      classStrengthRows,
      attTodayRows,
      attTrendRows,
      staffTotalsRows,
      staffAttTodayRows,
      pendingLeavesRows,
      enquiryStatsRows,
      applicationStatsRows,
      admissionStatsRows,
      certStatsRows,
      certByTypeRows,
      pendingCertsRows,
      visitorStatsRows,
      activeVisitorsRows,
      pendingAptsRows,
      healthStatsRows,
      activeBaysRows,
      medAlertsRows,
      concernStatsRows,
      urgentConcernsRows,
      inventoryStatsRows,
      commStatsRows,
      upcomingEventsRows,
      recentHomeworkRows,
      recentAnnouncementsRows,
      metaCountsRows,
      sessionMappingsRows,
    ] = await Promise.all([
      // 1. Enrolled Students count
      query(
        `SELECT COUNT(DISTINCT se.student_id) AS active_students
         FROM student_enrollments se
         JOIN students s ON se.student_id = s.id
         WHERE s.status = 'active'
           AND se.enrollment_status IN ('current', 'active') ${seScope.sql}`,
        seScope.params
      ),
      // 2. Classes & Sections count
      query(
        `SELECT
           (SELECT COUNT(*) FROM classes WHERE status = 'active' ${branchScope.sql}) AS total_classes,
           (SELECT COUNT(*) FROM branch_class_sections WHERE status = 'active' ${branchScope.sql}) AS total_sections`,
        [...branchScope.params, ...branchScope.params]
      ),
      // 3. Class-wise student distribution for ECharts
      query(
        `SELECT c.id, c.name AS class_name, COUNT(DISTINCT se.student_id) AS student_count
         FROM classes c
         LEFT JOIN student_enrollments se ON se.class_id = c.id
           AND se.enrollment_status IN ('current', 'active')
           ${ayId ? 'AND se.academic_year_id = ?' : ''}
         LEFT JOIN students s ON s.id = se.student_id AND s.status = 'active'
         WHERE c.status = 'active' ${cScope.sql}
         GROUP BY c.id, c.name
         ORDER BY c.id ASC
         LIMIT 16`,
        [...(ayId ? [ayId] : []), ...cScope.params]
      ),
      // 4. Today's student attendance
      query(
        `SELECT
           COUNT(DISTINCT CASE WHEN status IN ('present', 'late', 'half_day') THEN student_id END) AS present_today,
           COUNT(DISTINCT CASE WHEN status = 'absent' THEN student_id END) AS absent_today,
           COUNT(DISTINCT student_id) AS marked_today
         FROM student_attendance
         WHERE attendance_date = CURDATE() ${bothScope.sql}`,
        bothScope.params
      ),
      // 5. Recent 7 recorded attendance days trend
      query(
        `SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') AS att_date,
                DATE_FORMAT(attendance_date, '%d %b') AS label,
                COUNT(DISTINCT CASE WHEN status IN ('present', 'late', 'half_day') THEN student_id END) AS present_count,
                COUNT(DISTINCT CASE WHEN status = 'absent' THEN student_id END) AS absent_count
         FROM student_attendance
         WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ${bothScope.sql}
         GROUP BY attendance_date
         ORDER BY attendance_date DESC
         LIMIT 7`,
        bothScope.params
      ),
      // 6. Staff totals
      query(
        `SELECT
           COUNT(*) AS total_staff,
           SUM(CASE WHEN staff_type = 'teaching' THEN 1 ELSE 0 END) AS teaching_staff,
           SUM(CASE WHEN staff_type <> 'teaching' OR staff_type IS NULL THEN 1 ELSE 0 END) AS non_teaching_staff
         FROM staff_profiles
         WHERE status = 'active' ${branchScope.sql}`,
        branchScope.params
      ),
      // 7. Staff attendance today
      query(
        `SELECT
           SUM(CASE WHEN status IN ('present', 'late', 'half_day', 'on_duty') THEN 1 ELSE 0 END) AS present_today,
           SUM(CASE WHEN status IN ('absent', 'on_leave') THEN 1 ELSE 0 END) AS absent_or_leave_today,
           COUNT(*) AS marked_today
         FROM staff_attendance
         WHERE attendance_date = CURDATE() ${branchScope.sql}`,
        branchScope.params
      ),
      // 8. Pending staff leave applications
      query(
        `SELECT sla.id, sla.from_date, sla.to_date, sla.total_days, sla.reason,
                TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS staff_name,
                sp.department
         FROM staff_leave_applications sla
         LEFT JOIN staff_profiles sp ON sla.staff_id = sp.id
         WHERE sla.status = 'pending' ${branchId ? 'AND sla.branch_id = ?' : ''}
         ORDER BY sla.id DESC LIMIT 5`,
        branchId ? [branchId] : []
      ),
      // 9. Enquiries funnel
      query(
        `SELECT
           COUNT(*) AS total_enquiries,
           SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_enquiries
         FROM enquiries WHERE 1=1 ${bothScope.sql}`,
        bothScope.params
      ),
      // 10. Applications funnel
      query(
        `SELECT
           COUNT(*) AS total_applications,
           SUM(CASE WHEN status IN ('submitted', 'under_review', 'pending') THEN 1 ELSE 0 END) AS pending_applications
         FROM applications WHERE 1=1 ${bothScope.sql}`,
        bothScope.params
      ),
      // 11. Finalized Admissions
      query(
        `SELECT COUNT(*) AS total_admissions FROM admissions WHERE 1=1 ${bothScope.sql}`,
        bothScope.params
      ),
      // 12. Certificates summary
      query(
        `SELECT
           COUNT(*) AS total_certificates,
           SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending_approvals,
           SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) AS issued_count,
           COALESCE(SUM(reprint_count), 0) AS total_reprints
         FROM issued_certificates WHERE 1=1 ${bothScope.sql}`,
        bothScope.params
      ),
      // 13. Certificates breakdown by type
      query(
        `SELECT certificate_type, COUNT(*) AS count
         FROM issued_certificates WHERE 1=1 ${bothScope.sql}
         GROUP BY certificate_type`,
        bothScope.params
      ),
      // 14. Pending certificates list
      query(
        `SELECT id, certificate_no, certificate_type, recipient_name, class_or_dept, DATE_FORMAT(created_at, '%Y-%m-%d') AS requested_date
         FROM issued_certificates
         WHERE status = 'pending_approval' ${bothScope.sql}
         ORDER BY id DESC LIMIT 5`,
        bothScope.params
      ),
      // 15. Visitors KPIs
      query(
        `SELECT
           COUNT(*) AS total_today,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_now,
           SUM(CASE WHEN status = 'active' AND TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1 ELSE 0 END) AS overstayed_now
         FROM visitor_passes
         WHERE (DATE(check_in_time) = CURDATE() OR status = 'active') ${bothScope.sql}`,
        bothScope.params
      ),
      // 16. Active gate visitors
      query(
        `SELECT id, pass_number, visitor_name, person_to_meet_name, purpose,
                TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) AS elapsed_minutes,
                CASE WHEN TIMESTAMPDIFF(MINUTE, check_in_time, NOW()) > expected_duration_minutes THEN 1 ELSE 0 END AS is_overstayed
         FROM visitor_passes
         WHERE status = 'active' ${bothScope.sql}
         ORDER BY is_overstayed DESC, id DESC LIMIT 5`,
        bothScope.params
      ),
      // 17. Pending visitor appointments
      query(
        `SELECT id, appointment_number, visitor_name, person_to_meet_name,
                DATE_FORMAT(appointment_date, '%Y-%m-%d') AS appointment_date, appointment_time
         FROM visitor_appointments
         WHERE status = 'pending' ${bothScope.sql}
         ORDER BY appointment_date ASC LIMIT 5`,
        bothScope.params
      ),
      // 18. Health & Infirmary stats
      query(
        `SELECT
           SUM(CASE WHEN visit_date = CURDATE() THEN 1 ELSE 0 END) AS today_visits,
           SUM(CASE WHEN disposition = 'resting_in_bay' THEN 1 ELSE 0 END) AS in_bay_now,
           SUM(CASE WHEN visit_date = CURDATE() AND disposition = 'sent_home' THEN 1 ELSE 0 END) AS sent_home_today
         FROM infirmary_visits WHERE 1=1 ${bothScope.sql}`,
        bothScope.params
      ),
      // 19. Active Resting Bays
      query(
        `SELECT id, visit_number, patient_name, class_section, department, bed_number, chief_complaint
         FROM infirmary_visits
         WHERE disposition = 'resting_in_bay' ${bothScope.sql}
         ORDER BY id DESC LIMIT 5`,
        bothScope.params
      ),
      // 20. Medicine low stock alerts
      query(
        `SELECT id, medicine_name, quantity_available, reorder_level, unit, status
         FROM infirmary_medicine_inventory
         WHERE (status IN ('low_stock', 'out_of_stock', 'expired') OR quantity_available <= reorder_level) ${branchScope.sql}
         ORDER BY quantity_available ASC LIMIT 5`,
        branchScope.params
      ),
      // 21. Concern Desk stats
      query(
        `SELECT
           SUM(CASE WHEN status IN ('open', 'in_progress') THEN 1 ELSE 0 END) AS open_concerns,
           SUM(CASE WHEN ((status IN ('open', 'in_progress') AND sla_due_at < NOW()) OR is_overdue = 1) THEN 1 ELSE 0 END) AS overdue_concerns,
           SUM(CASE WHEN is_escalated = 1 AND status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS escalated_concerns
         FROM concerns WHERE 1=1 ${bothScope.sql}`,
        bothScope.params
      ),
      // 22. Urgent / Open Concerns
      query(
        `SELECT id, ticket_no, title, concern_type, priority, status,
                CASE WHEN (status IN ('open', 'in_progress') AND sla_due_at < NOW()) OR is_overdue = 1 THEN 1 ELSE 0 END AS is_overdue
         FROM concerns
         WHERE status IN ('open', 'in_progress') ${bothScope.sql}
         ORDER BY is_overdue DESC, (priority = 'urgent') DESC, id DESC LIMIT 5`,
        bothScope.params
      ),
      // 23. Inventory stats
      query(
        `SELECT
           (SELECT COUNT(*) FROM inventory_items WHERE status = 'active') AS total_items,
           (SELECT COUNT(*) FROM inventory_branch_stock bs JOIN inventory_items i ON bs.item_id = i.id WHERE bs.quantity <= i.reorder_level ${branchId ? 'AND bs.branch_id = ?' : ''}) AS low_stock_items,
           (SELECT COUNT(*) FROM inventory_purchase_orders WHERE status IN ('draft', 'sent') ${branchScope.sql}) AS open_pos`,
        [...(branchId ? [branchId] : []), ...branchScope.params]
      ),
      // 24. Communication stats
      query(
        `SELECT
           (SELECT COUNT(*) FROM homework WHERE (status = 'Published' OR status IS NULL OR status = '') ${bothScope.sql}) AS total_homework,
           (SELECT COUNT(*) FROM assignments WHERE (status = 'Published' OR status IS NULL OR status = '') ${bothScope.sql}) AS total_assignments,
           (SELECT COUNT(*) FROM announcements WHERE (status = 'Published' OR status IS NULL OR status = '') ${bothScope.sql}) AS total_announcements`,
        [...bothScope.params, ...bothScope.params, ...bothScope.params]
      ),
      // 25. Upcoming academic calendar events
      query(
        `SELECT id, title, event_type, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, is_holiday
         FROM academic_calendar_events
         WHERE start_date >= CURDATE() AND (is_published = 1 OR is_published IS NULL) ${bothScope.sql}
         ORDER BY start_date ASC LIMIT 5`,
        bothScope.params
      ),
      // 26. Recent homework
      query(
        `SELECT h.id, h.title, COALESCE(sub.name, h.subject) AS subject_name, c.name AS class_name,
                DATE_FORMAT(h.assigned_date, '%Y-%m-%d') AS assigned_date
         FROM homework h
         LEFT JOIN classes c ON h.class_id = c.id
         LEFT JOIN subjects sub ON h.subject_id = sub.id
         WHERE 1=1 ${buildScopeFilter(req, 'h').sql}
         ORDER BY h.id DESC LIMIT 4`,
        buildScopeFilter(req, 'h').params
      ),
      // 27. Recent announcements
      query(
        `SELECT id, title, category, priority, DATE_FORMAT(created_at, '%Y-%m-%d') AS created_date
         FROM announcements
         WHERE 1=1 ${bothScope.sql}
         ORDER BY id DESC LIMIT 4`,
        bothScope.params
      ),
      // 28. Meta counts (branches, boards, academic_years, users)
      query(
        `SELECT
           (SELECT COUNT(*) FROM branches WHERE status = 'active') AS branches_count,
           (SELECT COUNT(*) FROM boards) AS boards_count,
           (SELECT COUNT(*) FROM academic_years) AS academic_years_count,
           (SELECT COUNT(*) FROM users WHERE status = 'active' ${branchScope.sql}) AS users_count`,
        branchScope.params
      ),
      // 29. Branch academic year mappings
      query(
        `SELECT bay.id, bay.branch_id, bay.academic_year_id,
                DATE_FORMAT(bay.start_date, '%Y-%m-%d') AS start_date,
                DATE_FORMAT(bay.end_date, '%Y-%m-%d') AS end_date,
                bay.status,
                b.name AS branch_name, b.code AS branch_code,
                bd.code AS board_code,
                ay.code AS academic_year_code, ay.name AS academic_year_name
         FROM branch_academic_years bay
         JOIN branches b ON bay.branch_id = b.id
         LEFT JOIN boards bd ON b.board_id = bd.id
         JOIN academic_years ay ON bay.academic_year_id = ay.id
         WHERE 1=1 ${bayScope.sql}
         ORDER BY bay.id DESC LIMIT 12`,
        bayScope.params
      ),
    ]);

    const attToday = attTodayRows[0] || {};
    const activeStudents = Number(studentTotalsRows[0]?.active_students || 0);
    const presentToday = Number(attToday.present_today || 0);
    const markedToday = Number(attToday.marked_today || 0);
    const attendancePct = markedToday > 0 ? Math.round((presentToday / markedToday) * 100) : null;

    const pendingCertCount = Number(certStatsRows[0]?.pending_approvals || 0);
    const pendingLeavesCount = pendingLeavesRows.length;
    const pendingAptsCount = pendingAptsRows.length;
    const openPOsCount = Number(inventoryStatsRows[0]?.open_pos || 0);

    res.json({
      success: true,
      kpis: {
        active_students: activeStudents,
        total_classes: Number(classCountRows[0]?.total_classes || 0),
        total_sections: Number(classCountRows[0]?.total_sections || 0),
        student_present_today: presentToday,
        student_absent_today: Number(attToday.absent_today || 0),
        student_marked_today: markedToday,
        attendance_pct: attendancePct,
        total_staff: Number(staffTotalsRows[0]?.total_staff || 0),
        teaching_staff: Number(staffTotalsRows[0]?.teaching_staff || 0),
        staff_present_today: Number(staffAttTodayRows[0]?.present_today || 0),
        staff_marked_today: Number(staffAttTodayRows[0]?.marked_today || 0),
        total_enquiries: Number(enquiryStatsRows[0]?.total_enquiries || 0),
        open_enquiries: Number(enquiryStatsRows[0]?.open_enquiries || 0),
        total_applications: Number(applicationStatsRows[0]?.total_applications || 0),
        pending_applications: Number(applicationStatsRows[0]?.pending_applications || 0),
        total_admissions: Number(admissionStatsRows[0]?.total_admissions || 0),
        pending_certificates: pendingCertCount,
        issued_certificates: Number(certStatsRows[0]?.issued_count || 0),
        certificate_reprints: Number(certStatsRows[0]?.total_reprints || 0),
        pending_leaves: pendingLeavesCount,
        pending_appointments: pendingAptsCount,
        total_pending_approvals: pendingCertCount + pendingLeavesCount + pendingAptsCount,
        visitors_active_now: Number(visitorStatsRows[0]?.active_now || 0),
        visitors_today: Number(visitorStatsRows[0]?.total_today || 0),
        visitors_overstayed: Number(visitorStatsRows[0]?.overstayed_now || 0),
        health_visits_today: Number(healthStatsRows[0]?.today_visits || 0),
        health_in_bay: Number(healthStatsRows[0]?.in_bay_now || 0),
        med_low_stock: medAlertsRows.length,
        open_concerns: Number(concernStatsRows[0]?.open_concerns || 0),
        overdue_concerns: Number(concernStatsRows[0]?.overdue_concerns || 0),
        inventory_items: Number(inventoryStatsRows[0]?.total_items || 0),
        inventory_low_stock: Number(inventoryStatsRows[0]?.low_stock_items || 0),
        open_pos: openPOsCount,
        total_homework: Number(commStatsRows[0]?.total_homework || 0),
        total_assignments: Number(commStatsRows[0]?.total_assignments || 0),
        total_announcements: Number(commStatsRows[0]?.total_announcements || 0),
        branches_count: Number(metaCountsRows[0]?.branches_count || 0),
        boards_count: Number(metaCountsRows[0]?.boards_count || 0),
        academic_years_count: Number(metaCountsRows[0]?.academic_years_count || 0),
        users_count: Number(metaCountsRows[0]?.users_count || 0),
      },
      charts: {
        classStrength: classStrengthRows.map((r) => ({
          class_name: r.class_name,
          student_count: Number(r.student_count || 0),
        })),
        attendanceTrend: [...attTrendRows].reverse().map((r) => ({
          date: r.att_date,
          label: r.label,
          present: Number(r.present_count || 0),
          absent: Number(r.absent_count || 0),
        })),
        admissionsFunnel: [
          { stage: 'Enquiries', count: Number(enquiryStatsRows[0]?.total_enquiries || 0) },
          { stage: 'Applications', count: Number(applicationStatsRows[0]?.total_applications || 0) },
          { stage: 'Admitted', count: Number(admissionStatsRows[0]?.total_admissions || 0) },
        ],
        certificateMix: certByTypeRows.map((r) => ({
          type: r.certificate_type,
          count: Number(r.count || 0),
        })),
      },
      queues: {
        pendingCertificates: pendingCertsRows,
        pendingLeaves: pendingLeavesRows,
        pendingAppointments: pendingAptsRows,
        urgentConcerns: urgentConcernsRows,
        activeVisitors: activeVisitorsRows,
        activeBays: activeBaysRows,
        medicineAlerts: medAlertsRows,
        upcomingEvents: upcomingEventsRows,
        recentHomework: recentHomeworkRows,
        recentAnnouncements: recentAnnouncementsRows,
      },
      sessionMappings: sessionMappingsRows,
    });
  } catch (error) {
    next(error);
  }
};
