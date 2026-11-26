import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  getVisitorDashboard,
  lookupReturningVisitor,
  registerVisitorEntry,
  updateVisitorPass,
  deleteVisitorPass,
  getActiveVisitors,
  checkOutVisitor,
  getVisitorPasses,
  getPassDetails,
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getHostsDirectory,
  getHostById,
  updateHostExtension,
  getVisitorHistory,
  searchStudents,
} from '../controllers/visitorController.js';

const router = Router();

router.use(verifyToken, requireRoles('super_admin', 'admin', 'principal', 'teacher', 'staff', 'coordinator'));

// Overview & Returning Lookup
router.get('/dashboard', getVisitorDashboard);
router.get('/lookup-returning', lookupReturningVisitor);

// Registration, Editing, Deleting & Pass Issuing
router.post('/entry', registerVisitorEntry);
router.get('/passes', getVisitorPasses);
router.get('/passes/:idOrPassNumber', getPassDetails);
router.put('/passes/:id', updateVisitorPass);
router.delete('/passes/:id', deleteVisitorPass);

// Active visitors & Exit Checkout
router.get('/active', getActiveVisitors);
router.post('/exit/:identifier', checkOutVisitor);

// Appointments CRUD
router.get('/appointments', getAppointments);
router.get('/appointments/:id', getAppointmentById);
router.post('/appointments', createAppointment);
router.put('/appointments/:id', updateAppointment);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.delete('/appointments/:id', deleteAppointment);

// Person to Meet Directory
router.get('/hosts', getHostsDirectory);
router.get('/hosts/:staffId', getHostById);
router.put('/hosts/:staffId/extension', updateHostExtension);

// History & Analytics
router.get('/history', getVisitorHistory);

// Student lookup helper
router.get('/students-search', searchStudents);

export default router;
