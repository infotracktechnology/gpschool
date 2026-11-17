import { Router } from 'express';
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  setCurrentAcademicYear,
  deleteAcademicYear,
} from '../controllers/academicYearController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getAcademicYears);
router.post('/', requireRoles('super_admin'), createAcademicYear);
router.put('/:id', requireRoles('super_admin'), updateAcademicYear);
router.patch('/:id/set-current', requireRoles('super_admin'), setCurrentAcademicYear);
router.delete('/:id', requireRoles('super_admin'), deleteAcademicYear);

export default router;
