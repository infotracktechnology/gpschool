import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Only Super Admin and Admin can manage users
router.use(verifyToken, requireRoles('super_admin', 'admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
