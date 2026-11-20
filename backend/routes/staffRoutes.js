import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import { uploadStaffDocument } from '../middleware/staffUploadMiddleware.js';

import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/staff/staffController.js';

import {
  uploadDocument,
  getStaffDocuments,
  deleteStaffDocument,
} from '../controllers/staff/staffDocumentController.js';

import {
  getClassTeacherAllocations,
  getClassTeachersReport,
  checkClassTeacherConflict,
  assignClassTeacher,
  getSubjectAllocations,
  simpleAssignSubjects,
  saveSubjectAllocations,
  deleteSubjectAllocation,
  getCoordinators,
  createCoordinator,
  updateCoordinator,
  deleteCoordinator,
} from '../controllers/staff/staffAllocationController.js';

import {
  getDailyAttendance,
  markDailyAttendance,
  getMonthlyAttendanceReport,
  syncBiometricPunchLogs,
} from '../controllers/staff/staffAttendanceController.js';

import {
  getLeaveTypes,
  getLeaveBalances,
  applyLeave,
  getLeaveApplications,
  updateLeaveApplicationStatus,
} from '../controllers/staff/staffLeaveController.js';

import {
  getPayrollStructure,
  savePayrollStructure,
  generateMonthlyPayroll,
  getPayslips,
  getPayslipById,
  updatePayslipStatus,
} from '../controllers/staff/staffPayrollController.js';

import {
  getBulkImportTemplate,
  previewBulkImport,
  executeBulkImport,
} from '../controllers/staff/staffBulkImportController.js';

const router = Router();

// Apply authentication to all staff routes
router.use(verifyToken);

// ==========================================
// 1. Bulk Import Routes (Must be before /:id)
// ==========================================
router.get('/bulk-import/template', getBulkImportTemplate);
router.post(
  '/bulk-import/preview',
  requireRoles('super_admin', 'admin', 'principal'),
  uploadStaffDocument.single('file'),
  previewBulkImport
);
router.post(
  '/bulk-import/execute',
  requireRoles('super_admin', 'admin', 'principal'),
  executeBulkImport
);

// ==========================================
// 2. Documents Routes (Register before /:id)
// ==========================================
router.post(
  '/documents/upload',
  uploadStaffDocument.single('document'),
  uploadDocument
);
router.delete(
  '/documents/:docId',
  requireRoles('super_admin', 'admin', 'principal'),
  deleteStaffDocument
);

// ==========================================
// 3. Allocations Routes (Register before /:id)
// ==========================================
router.get('/allocations/class-teachers', getClassTeacherAllocations);
router.get('/allocations/class-teachers/report', getClassTeachersReport);
router.get('/allocations/class-teachers/check-conflict', checkClassTeacherConflict);
router.put(
  '/allocations/class-teachers',
  requireRoles('super_admin', 'admin', 'principal'),
  assignClassTeacher
);

router.get('/allocations/subjects', getSubjectAllocations);
router.post(
  '/allocations/subjects/simple-assign',
  requireRoles('super_admin', 'admin', 'principal'),
  simpleAssignSubjects
);
router.post(
  '/allocations/subjects',
  requireRoles('super_admin', 'admin', 'principal'),
  saveSubjectAllocations
);
router.delete(
  '/allocations/subjects/:id',
  requireRoles('super_admin', 'admin', 'principal'),
  deleteSubjectAllocation
);

// Coordinators CRUD (Tab 3)
router.get('/allocations/coordinators', getCoordinators);
router.post(
  '/allocations/coordinators',
  requireRoles('super_admin', 'admin', 'principal'),
  createCoordinator
);
router.put(
  '/allocations/coordinators/:id',
  requireRoles('super_admin', 'admin', 'principal'),
  updateCoordinator
);
router.delete(
  '/allocations/coordinators/:id',
  requireRoles('super_admin', 'admin', 'principal'),
  deleteCoordinator
);

// ==========================================
// 4. Attendance Routes (Register before /:id)
// ==========================================
router.get('/attendance/daily', getDailyAttendance);
router.post(
  '/attendance/daily',
  requireRoles('super_admin', 'admin', 'principal', 'staff'),
  markDailyAttendance
);
router.get('/attendance/monthly-report', getMonthlyAttendanceReport);
router.post(
  '/attendance/sync-biometric',
  requireRoles('super_admin', 'admin'),
  syncBiometricPunchLogs
);

// ==========================================
// 5. Leave Management Routes (Register before /:id)
// ==========================================
router.get('/leaves/types', getLeaveTypes);
router.get('/leaves/applications', getLeaveApplications);
router.post('/leaves/apply', applyLeave);
router.put(
  '/leaves/applications/:appId/status',
  requireRoles('super_admin', 'admin', 'principal'),
  updateLeaveApplicationStatus
);
router.get('/leaves/balances/:staffId', getLeaveBalances);

// ==========================================
// 6. Payroll Routes (Register before /:id)
// ==========================================
router.post(
  '/payroll/generate',
  requireRoles('super_admin', 'admin'),
  generateMonthlyPayroll
);
router.get('/payroll/payslips', getPayslips);
router.get('/payroll/payslips/:payslipId', getPayslipById);
router.put(
  '/payroll/payslips/:payslipId/status',
  requireRoles('super_admin', 'admin'),
  updatePayslipStatus
);

// ==========================================
// 7. Nested Staff Sub-Resource Routes
// ==========================================
router.get('/:staffId/documents', getStaffDocuments);
router.get('/:staffId/leave-balances', getLeaveBalances);
router.get('/:staffId/payroll-structure', getPayrollStructure);
router.post(
  '/:staffId/payroll-structure',
  requireRoles('super_admin', 'admin'),
  savePayrollStructure
);

// ==========================================
// 8. Base Staff Directory CRUD Routes
// ==========================================
router.get('/', getStaff);
router.get('/:id', getStaffById);
router.post(
  '/',
  requireRoles('super_admin', 'admin', 'principal'),
  createStaff
);
router.put(
  '/:id',
  requireRoles('super_admin', 'admin', 'principal'),
  updateStaff
);
router.delete(
  '/:id',
  requireRoles('super_admin', 'admin'),
  deleteStaff
);

export default router;
