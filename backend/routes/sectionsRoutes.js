import { Router } from 'express';
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
} from '../controllers/sectionsController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getSections);
router.post('/', requireRoles('super_admin', 'admin', 'principal'), createSection);
router.put('/:id', requireRoles('super_admin', 'admin', 'principal'), updateSection);
router.delete('/:id', requireRoles('super_admin', 'admin'), deleteSection);

export default router;
