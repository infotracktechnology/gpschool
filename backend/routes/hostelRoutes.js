import { Router } from 'express';
import { requireRoles, verifyToken } from '../middleware/authMiddleware.js';
import {
  collectHostelFee,
  completeGatePass,
  createHostelMovement,
  createHostelResource,
  createStudentComplaint,
  createStudentGatePass,
  getHostelDashboard,
  getHostelReport,
  getStudentComplaints,
  getStudentHostelDashboard,
  listHostelResource,
  listHostelStudents,
  reviewGatePass,
  updateAllocation,
  updateHostelResource,
} from '../controllers/hostel/hostelController.js';

const router = Router();
const READ_ROLES = ['super_admin', 'admin', 'principal', 'teacher', 'staff', 'coordinator'];
const WRITE_ROLES = ['super_admin', 'admin', 'principal'];

router.use(verifyToken);

router.get('/student/me', requireRoles('student'), getStudentHostelDashboard);
router.post('/student/gate-passes', requireRoles('student'), createStudentGatePass);
router.get('/student/complaints', requireRoles('student'), getStudentComplaints);
router.post('/student/complaints', requireRoles('student'), createStudentComplaint);

router.use(requireRoles(...READ_ROLES));
router.get('/dashboard', getHostelDashboard);
router.get('/students', listHostelStudents);
router.get('/reports/:type', getHostelReport);

router.get('/resources/:resource', (req, res, next) => listHostelResource(req.params.resource)(req, res, next));
router.post('/resources/:resource', requireRoles(...WRITE_ROLES), (req, res, next) => createHostelResource(req.params.resource)(req, res, next));
router.put('/resources/:resource/:id', requireRoles(...WRITE_ROLES), (req, res, next) => updateHostelResource(req.params.resource)(req, res, next));

router.post('/attendance/movement', createHostelMovement);
router.put('/allocations/:id/end', requireRoles(...WRITE_ROLES), updateAllocation);
router.post('/gate-passes/:id/review', requireRoles(...WRITE_ROLES), reviewGatePass);
router.post('/gate-passes/:id/return', requireRoles(...WRITE_ROLES), completeGatePass);
router.get('/collections', listHostelResource('fee-collections'));
router.post('/collections', requireRoles(...WRITE_ROLES), collectHostelFee);

export default router;
