import { Router } from 'express';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  uploadBranchLogoHandler,
} from '../controllers/branchController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import { uploadBranchLogo } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getBranches);
router.post(
  '/upload-logo',
  requireRoles('super_admin', 'admin'),
  uploadBranchLogo.single('logo'),
  uploadBranchLogoHandler
);
router.post('/', requireRoles('super_admin'), createBranch);
router.put('/:id', requireRoles('super_admin', 'admin'), updateBranch);
router.delete('/:id', requireRoles('super_admin'), deleteBranch);

export default router;
