import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  getStaffProfiles,
  getStaffProfileById,
  createStaffProfile,
  updateStaffProfile,
  deleteStaffProfile,
} from '../controllers/staffProfileController.js';

const router = Router();

// All routes require authentication and admin-level role
router.use(verifyToken, requireRoles('super_admin', 'admin'));

router.get('/', getStaffProfiles);
router.get('/:userId', getStaffProfileById);
router.post('/', createStaffProfile);
router.put('/:userId', updateStaffProfile);
router.delete('/:userId', deleteStaffProfile);

export default router;
