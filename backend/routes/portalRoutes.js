import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';

import {
  getPortalDashboard,
  getPortalProfile,
  getPortalLeaves,
  applyPortalLeave,
  getPortalLeaveApprovals,
  updatePortalLeaveApproval,
  getPortalAttendance,
  getPortalClasses,
  getPortalPayslips,
  getPortalPayslipById,
  getPortalAppointments,
  updatePortalAppointmentStatus,
} from '../controllers/portal/portalController.js';

import {
  getAssignedClasses,
  getStudentAttendanceRoster,
  saveStudentAttendance,
  copyMorningToAfternoon,
} from '../controllers/portal/portalStudentAttendanceController.js';

const router = Router();

// All portal endpoints require valid staff/user authentication
router.use(verifyToken);

// Dashboard
router.get('/dashboard', getPortalDashboard);

// 360° Profile
router.get('/profile', getPortalProfile);

// Leaves & Approvals
router.get('/leaves', getPortalLeaves);
router.post('/leaves/apply', applyPortalLeave);
router.get('/leave-approvals', getPortalLeaveApprovals);
router.put('/leave-approvals/:appId/status', updatePortalLeaveApproval);

// Staff Personal Attendance
router.get('/attendance', getPortalAttendance);

// Assigned Classes & Subject Allocations
router.get('/classes', getPortalClasses);

// Student Attendance in Staff Portal (Session-based & Tiered Lock)
router.get('/student-attendance/assigned-classes', getAssignedClasses);
router.get('/student-attendance/roster', getStudentAttendanceRoster);
router.post('/student-attendance/save', saveStudentAttendance);
router.post('/student-attendance/copy-morning', copyMorningToAfternoon);

// Payslips
router.get('/payslips', getPortalPayslips);
router.get('/payslips/:id', getPortalPayslipById);

// Visitor Appointments (Assigned to logged-in staff)
router.get('/appointments', getPortalAppointments);
router.patch('/appointments/:id/status', updatePortalAppointmentStatus);

export default router;
