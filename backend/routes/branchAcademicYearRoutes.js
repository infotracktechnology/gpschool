import { Router } from 'express';
import {
  getBranchAcademicYears,
  createBranchAcademicYear,
  updateBranchAcademicYear,
  deleteBranchAcademicYear,
} from '../controllers/branchAcademicYearController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getBranchAcademicYears);
router.post('/', requireRoles('super_admin', 'admin'), createBranchAcademicYear);
router.put('/:id', requireRoles('super_admin', 'admin'), updateBranchAcademicYear);
router.delete('/:id', requireRoles('super_admin', 'admin'), deleteBranchAcademicYear);

export default router;
