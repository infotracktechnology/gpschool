import { Router } from 'express';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../controllers/branchController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getBranches);
router.post('/', requireRoles('super_admin'), createBranch);
router.put('/:id', requireRoles('super_admin', 'admin'), updateBranch);
router.delete('/:id', requireRoles('super_admin'), deleteBranch);

export default router;
