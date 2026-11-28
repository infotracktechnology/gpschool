import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  WRITE_ROLES,
  dashboard,
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  collectFee,
  listCollections,
  listCollectionsForStudent,
  report,
  studentTransport,
  createNotification,
  listNotifications,
  getTransportAudit,
  markStudentNotificationRead,
  getTransportSettings,
  saveTransportSettings,
} from '../controllers/transportController.js';

const router = Router();
const READ_ROLES = ['super_admin', 'admin', 'principal', 'staff', 'teacher'];
const ADMIN_ROLES = ['super_admin', 'admin', 'principal'];

router.use(verifyToken);

router.get('/student/me', requireRoles(...READ_ROLES, 'student'), studentTransport);
router.get('/student/collections', requireRoles(...READ_ROLES, 'student'), listCollectionsForStudent);
router.patch('/student/notifications/:id/read', requireRoles(...READ_ROLES, 'student'), markStudentNotificationRead);

router.use(requireRoles(...READ_ROLES));
router.get('/dashboard', dashboard);
router.get('/settings', getTransportSettings);
router.post('/settings', requireRoles(...ADMIN_ROLES), saveTransportSettings);
router.put('/settings', requireRoles(...ADMIN_ROLES), saveTransportSettings);
router.get('/reports/fees', report('fees'));
router.get('/reports/allocations', report('allocations'));
router.get('/reports/trips', report('trips'));
router.get('/reports/expiries', report('expiries'));
router.get('/collections', listCollections);
router.get('/notifications', listNotifications);
router.get('/audit-trail', requireRoles(...ADMIN_ROLES), getTransportAudit);
router.post('/notifications', requireRoles(...ADMIN_ROLES), createNotification);
router.post('/collections', requireRoles(...ADMIN_ROLES), collectFee);

const registerResource = (path, name, { deletable = true } = {}) => {
  router.get(`/${path}`, listRecords(name));
  router.get(`/${path}/:id`, getRecord(name));
  router.post(`/${path}`, requireRoles(...WRITE_ROLES), createRecord(name));
  router.put(`/${path}/:id`, requireRoles(...WRITE_ROLES), updateRecord(name));
  if (deletable) router.delete(`/${path}/:id`, requireRoles(...WRITE_ROLES), deleteRecord(name));
};

registerResource('settings', 'settings', { deletable: false });
registerResource('vehicle-types', 'vehicle-types');
registerResource('vehicles', 'vehicles');
registerResource('drivers', 'drivers');
registerResource('attendants', 'attendants');
registerResource('routes', 'routes');
registerResource('stops', 'stops', { deletable: false });
registerResource('allocations', 'allocations', { deletable: false });
registerResource('fees', 'fees', { deletable: false });
registerResource('trips', 'trips', { deletable: false });
registerResource('trip-stops', 'trip-stops', { deletable: false });
registerResource('documents', 'documents', { deletable: false });
registerResource('maintenance', 'maintenance', { deletable: false });

export default router;
