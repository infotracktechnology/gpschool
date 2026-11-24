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
} from '../controllers/portal/portalController.js';

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

// Attendance
router.get('/attendance', getPortalAttendance);

// Assigned Classes & Subject Allocations
router.get('/classes', getPortalClasses);

// Payslips
router.get('/payslips', getPortalPayslips);
router.get('/payslips/:id', getPortalPayslipById);

export default router;
