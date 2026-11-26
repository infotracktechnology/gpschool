import { Router } from 'express';
import {
  getCertificateDashboard,
  searchCertificateStudents,
  searchCertificateStaff,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
  getCertificates,
  getCertificateById,
  createCertificate,
  updateCertificate,
  updateCertificateStatus,
  recordCertificatePrint,
  deleteCertificate,
} from '../controllers/certificateController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

const CERTIFICATE_STAFF_ROLES = ['super_admin', 'admin', 'principal', 'teacher'];
const CERTIFICATE_ADMIN_ROLES = ['super_admin', 'admin', 'principal'];

router.use(verifyToken);

// Dashboard Analytics & Approval Overview
router.get('/dashboard', requireRoles(...CERTIFICATE_STAFF_ROLES), getCertificateDashboard);

// Recipient Lookups (Students & Staff)
router.get('/search-students', requireRoles(...CERTIFICATE_STAFF_ROLES), searchCertificateStudents);
router.get('/search-staff', requireRoles(...CERTIFICATE_STAFF_ROLES), searchCertificateStaff);

// Certificate Templates CRUD & Duplication
router.get('/templates', requireRoles(...CERTIFICATE_STAFF_ROLES), getTemplates);
router.get('/templates/:id', requireRoles(...CERTIFICATE_STAFF_ROLES), getTemplateById);
router.post('/templates', requireRoles(...CERTIFICATE_ADMIN_ROLES), createTemplate);
router.put('/templates/:id', requireRoles(...CERTIFICATE_ADMIN_ROLES), updateTemplate);
router.post('/templates/:id/duplicate', requireRoles(...CERTIFICATE_ADMIN_ROLES), duplicateTemplate);
router.delete('/templates/:id', requireRoles(...CERTIFICATE_ADMIN_ROLES), deleteTemplate);

// Issued Certificates & Approval Workflow CRUD
router.get('/', requireRoles(...CERTIFICATE_STAFF_ROLES), getCertificates);
router.get('/:id', requireRoles(...CERTIFICATE_STAFF_ROLES), getCertificateById);
router.post('/', requireRoles(...CERTIFICATE_STAFF_ROLES), createCertificate);
router.put('/:id', requireRoles(...CERTIFICATE_STAFF_ROLES), updateCertificate);
router.patch('/:id/status', requireRoles(...CERTIFICATE_ADMIN_ROLES), updateCertificateStatus);
router.post('/:id/print', requireRoles(...CERTIFICATE_STAFF_ROLES), recordCertificatePrint);
router.delete('/:id', requireRoles(...CERTIFICATE_ADMIN_ROLES), deleteCertificate);

export default router;
