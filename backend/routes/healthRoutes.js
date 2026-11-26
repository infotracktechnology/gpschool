import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  getHealthDashboard,
  getInfirmaryVisits,
  getInfirmaryVisitById,
  createInfirmaryVisit,
  updateInfirmaryVisit,
  updateVisitDisposition,
  deleteInfirmaryVisit,
  getHealthProfiles,
  getHealthProfileDetail,
  updateHealthProfile,
  deleteHealthProfile,
  getHealthCheckups,
  getHealthCheckupById,
  createHealthCheckup,
  updateHealthCheckup,
  deleteHealthCheckup,
  getMedicineLogs,
  getMedicineLogById,
  createMedicineLog,
  updateMedicineLog,
  deleteMedicineLog,
  getMedicineInventory,
  getMedicineInventoryById,
  createMedicineInventory,
  updateMedicineInventory,
  deleteMedicineInventory,
  getDoctorConsultations,
  getDoctorConsultationById,
  createDoctorConsultation,
  updateDoctorConsultation,
  deleteDoctorConsultation,
  getParentNotifications,
  getParentNotificationById,
  createParentNotification,
  updateParentNotification,
  deleteParentNotification,
  getEmergencyDirectory,
  getStudentHealthDossier,
  referStudentFromClass,
  searchHealthStudents,
  searchHealthStaff,
} from '../controllers/healthController.js';

const router = Router();

const HEALTH_STAFF_ROLES = ['super_admin', 'admin', 'principal', 'teacher', 'staff', 'coordinator'];

router.use(verifyToken);

// Student dossier — any authenticated user; controller enforces student ownership
router.get('/student-dossier/:studentId', getStudentHealthDossier);

// All remaining health endpoints are staff-only
router.use(requireRoles(...HEALTH_STAFF_ROLES));

// Overview Dashboard
router.get('/dashboard', getHealthDashboard);

// Fast autocomplete & auto-fill lookups
router.get('/search-students', searchHealthStudents);
router.get('/search-staff', searchHealthStaff);

// Staff referral
router.post('/refer-from-portal', referStudentFromClass);

// Infirmary Visits CRUD
router.get('/visits', getInfirmaryVisits);
router.get('/visits/:id', getInfirmaryVisitById);
router.post('/visits', createInfirmaryVisit);
router.put('/visits/:id', updateInfirmaryVisit);
router.patch('/visits/:id/disposition', updateVisitDisposition);
router.delete('/visits/:id', deleteInfirmaryVisit);

// Health Profiles & Full Medical History Dossier CRUD
router.get('/profiles', getHealthProfiles);
router.get('/profiles/:type/:id', getHealthProfileDetail);
router.put('/profiles/:type/:id', updateHealthProfile);
router.delete('/profiles/:type/:id', deleteHealthProfile);

// Periodic Health Checkups CRUD
router.get('/checkups', getHealthCheckups);
router.get('/checkups/:id', getHealthCheckupById);
router.post('/checkups', createHealthCheckup);
router.put('/checkups/:id', updateHealthCheckup);
router.delete('/checkups/:id', deleteHealthCheckup);

// Medicine Administration CRUD
router.get('/medicines', getMedicineLogs);
router.get('/medicines/:id', getMedicineLogById);
router.post('/medicines', createMedicineLog);
router.put('/medicines/:id', updateMedicineLog);
router.delete('/medicines/:id', deleteMedicineLog);

// Infirmary Medicine Inventory & Stock CRUD
router.get('/inventory', getMedicineInventory);
router.get('/inventory/:id', getMedicineInventoryById);
router.post('/inventory', createMedicineInventory);
router.put('/inventory/:id', updateMedicineInventory);
router.delete('/inventory/:id', deleteMedicineInventory);

// Doctor Consultations CRUD
router.get('/consultations', getDoctorConsultations);
router.get('/consultations/:id', getDoctorConsultationById);
router.post('/consultations', createDoctorConsultation);
router.put('/consultations/:id', updateDoctorConsultation);
router.delete('/consultations/:id', deleteDoctorConsultation);

// Parent Emergency / Health Notifications CRUD
router.get('/notifications', getParentNotifications);
router.get('/notifications/:id', getParentNotificationById);
router.post('/notifications', createParentNotification);
router.put('/notifications/:id', updateParentNotification);
router.delete('/notifications/:id', deleteParentNotification);

// Emergency Directory
router.get('/emergency-directory', getEmergencyDirectory);

export default router;
