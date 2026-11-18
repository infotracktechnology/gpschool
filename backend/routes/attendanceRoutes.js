import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  getTimings,
  createTiming,
  updateTiming,
  deleteTiming,
  setActiveTiming,
  getActiveTiming,
} from '../controllers/attendanceTimingsController.js';
import {
  bulkSaveAttendance,
  checkAttendance,
  detectSession,
  getMonthlyReport,
  getAttendance,
} from '../controllers/attendanceController.js';

const router = Router();
router.use(verifyToken);

// Timings — admin/super_admin manage, teacher can read active
router.get('/timings/active', requireRoles('super_admin', 'admin', 'teacher'), getActiveTiming);
router.get('/timings', requireRoles('super_admin', 'admin'), getTimings);
router.post('/timings', requireRoles('super_admin', 'admin'), createTiming);
router.put('/timings/:id', requireRoles('super_admin', 'admin'), updateTiming);
router.delete('/timings/:id', requireRoles('super_admin', 'admin'), deleteTiming);
router.patch('/timings/:id/set-active', requireRoles('super_admin', 'admin'), setActiveTiming);

// Attendance data routes
router.post('/bulk-save', requireRoles('super_admin', 'admin', 'teacher'), bulkSaveAttendance);
router.get('/check', requireRoles('super_admin', 'admin', 'teacher'), checkAttendance);
router.get('/session-detect', requireRoles('super_admin', 'admin', 'teacher'), detectSession);
router.get('/monthly-report', requireRoles('super_admin', 'admin', 'teacher'), getMonthlyReport);
router.get('/', requireRoles('super_admin', 'admin', 'teacher'), getAttendance);

export default router;
