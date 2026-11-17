import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkUpdateStudents,
  importStudentsCSV,
} from '../controllers/students/studentController.js';

import { changeSectionBatch } from '../controllers/students/sectionChangeController.js';

import {
  previewPromotion,
  executePromotion,
  getPromotionReport,
} from '../controllers/students/promotionController.js';

import {
  getAcademicGroups,
  getAcademicGroupById,
  createAcademicGroup,
  updateAcademicGroup,
  deleteAcademicGroup,
  getSubjectMappingMatrix,
  saveSubjectMappings,
} from '../controllers/students/academicGroupsController.js';

import {
  issueTC,
  getTCList,
  getTCById,
} from '../controllers/students/tcController.js';

import {
  previewCredentials,
  generateCredentialsBatch,
} from '../controllers/students/credentialsController.js';

const router = Router();

// Protect all student suite routes
router.use(verifyToken);

// --- Section Batch Change ---
router.post('/sections/batch-change', requireRoles('super_admin', 'admin', 'principal', 'teacher'), changeSectionBatch);
router.post('/section-change', requireRoles('super_admin', 'admin', 'principal', 'teacher'), changeSectionBatch);

// --- Promotion Engine ---
router.get('/promotions/preview', previewPromotion);
router.post('/promotions/preview', previewPromotion);
router.post('/promotions/execute', requireRoles('super_admin', 'admin', 'principal'), executePromotion);
router.post('/promotion', requireRoles('super_admin', 'admin', 'principal'), executePromotion);
router.get('/promotions/report', getPromotionReport);

// --- Academic Groups & Subject Allocation ---
router.get('/academic-groups', getAcademicGroups);
router.post('/academic-groups', requireRoles('super_admin', 'admin', 'principal'), createAcademicGroup);
router.get('/academic-groups/:id', getAcademicGroupById);
router.put('/academic-groups/:id', requireRoles('super_admin', 'admin', 'principal'), updateAcademicGroup);
router.delete('/academic-groups/:id', requireRoles('super_admin', 'admin', 'principal'), deleteAcademicGroup);

router.get('/subjects/matrix', getSubjectMappingMatrix);
router.post('/subjects/save-mappings', requireRoles('super_admin', 'admin', 'principal', 'teacher'), saveSubjectMappings);
router.post('/subject-mappings', requireRoles('super_admin', 'admin', 'principal', 'teacher'), saveSubjectMappings);

// --- Transfer Certificate (TC) ---
router.post('/tc/issue', requireRoles('super_admin', 'admin', 'principal'), issueTC);
router.post('/tc', requireRoles('super_admin', 'admin', 'principal'), issueTC);
router.get('/tc/list', getTCList);
router.get('/tc', getTCList);
router.get('/tc/:id', getTCById);

// --- Student Portal Credentials ---
router.post('/credentials/preview', requireRoles('super_admin', 'admin', 'principal'), previewCredentials);
router.post('/credentials/generate', requireRoles('super_admin', 'admin', 'principal'), generateCredentialsBatch);

// --- Core Student Management ---
router.get('/', getStudents);
router.post('/', requireRoles('super_admin', 'admin', 'principal'), createStudent);
router.post('/bulk-update', requireRoles('super_admin', 'admin', 'principal', 'teacher'), bulkUpdateStudents);
router.post('/import', requireRoles('super_admin', 'admin', 'principal'), importStudentsCSV);
router.post('/import-csv', requireRoles('super_admin', 'admin', 'principal'), importStudentsCSV);
router.get('/:id', getStudentById);
router.put('/:id', requireRoles('super_admin', 'admin', 'principal'), updateStudent);
router.delete('/:id', requireRoles('super_admin', 'admin', 'principal'), deleteStudent);

export default router;
