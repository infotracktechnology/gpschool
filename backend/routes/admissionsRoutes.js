import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

import {
  getBranchWorkflow,
  updateBranchWorkflow,
} from '../controllers/admissions/workflowController.js';

import {
  getNumberSeries,
  upsertNumberSeries,
} from '../controllers/admissions/seriesController.js';

import {
  getLeadSources,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
} from '../controllers/admissions/leadSourcesController.js';

import {
  getEnquiries,
  createEnquiry,
  getEnquiryById,
  updateEnquiry,
  addFollowup,
  convertToApplication,
  directAdmission,
} from '../controllers/admissions/enquiriesController.js';

import {
  getApplications,
  createApplication,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  finalizeAdmission,
} from '../controllers/admissions/applicationsController.js';

import {
  getStudents,
  directAdmissionWalkin,
  getStudentById,
} from '../controllers/admissions/admissionsController.js';

import {
  getConversionFunnel,
  getCapacityRoster,
  getEnquiryStatusLog,
} from '../controllers/admissions/reportsController.js';

const router = Router();

const ADMISSIONS_ROLES = ['super_admin', 'admin', 'principal', 'staff'];

// Protect all admission routes — admissions data is not for teachers or students
router.use(verifyToken, requireRoles(...ADMISSIONS_ROLES));

// --- Settings: Workflow ---
router.get('/settings/workflow/:branchId', getBranchWorkflow);
router.put('/settings/workflow/:branchId', requireRoles('super_admin', 'admin'), updateBranchWorkflow);

// --- Settings: Number Series ---
router.get('/settings/series', getNumberSeries);
router.post('/settings/series', requireRoles('super_admin', 'admin'), upsertNumberSeries);

// --- Settings: Lead Sources ---
router.get('/settings/lead-sources', getLeadSources);
router.post('/settings/lead-sources', requireRoles('super_admin', 'admin'), createLeadSource);
router.put('/settings/lead-sources/:id', requireRoles('super_admin', 'admin'), updateLeadSource);
router.delete('/settings/lead-sources/:id', requireRoles('super_admin', 'admin'), deleteLeadSource);
// Convenience alias
router.get('/lead-sources', getLeadSources);

// --- Enquiries & Follow-ups ---
router.get('/enquiries', getEnquiries);
router.post('/enquiries', createEnquiry);
router.get('/enquiries/:id', getEnquiryById);
router.put('/enquiries/:id', updateEnquiry);
router.post('/enquiries/:id/followups', addFollowup);
router.post('/enquiries/:id/convert-to-application', convertToApplication);
router.post('/enquiries/:id/direct-admission', directAdmission);

// --- Applications ---
router.get('/applications', getApplications);
router.post('/applications', createApplication);
router.get('/applications/:id', getApplicationById);
router.put('/applications/:id', updateApplication);
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/:id/finalize-admission', finalizeAdmission);

// --- Confirmed Admissions (Students) ---
router.get('/students', getStudents);
router.post('/students/direct', directAdmissionWalkin);
router.get('/students/:id', getStudentById);

// --- Reports ---
router.get('/reports/conversion-funnel', getConversionFunnel);
router.get('/reports/capacity-roster', getCapacityRoster);
router.get('/reports/enquiry-status-log', getEnquiryStatusLog);

export default router;
