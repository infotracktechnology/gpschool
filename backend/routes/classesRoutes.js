import { Router } from 'express';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
} from '../controllers/classesController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getClasses);
router.post('/', requireRoles('super_admin', 'admin'), createClass);
router.put('/:id', requireRoles('super_admin', 'admin'), updateClass);
router.delete('/:id', requireRoles('super_admin'), deleteClass);

export default router;
