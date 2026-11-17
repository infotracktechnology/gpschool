import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subjectsController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getSubjects);
router.get('/:id', getSubjectById);
router.post('/', requireRoles('super_admin', 'admin', 'principal'), createSubject);
router.put('/:id', requireRoles('super_admin', 'admin', 'principal'), updateSubject);
router.delete('/:id', requireRoles('super_admin', 'admin'), deleteSubject);

export default router;
