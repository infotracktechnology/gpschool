import { Router } from 'express';
import {
  getBoards,
  createBoard,
  updateBoard,
  deleteBoard,
} from '../controllers/boardController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getBoards);
router.post('/', requireRoles('super_admin'), createBoard);
router.put('/:id', requireRoles('super_admin'), updateBoard);
router.delete('/:id', requireRoles('super_admin'), deleteBoard);

export default router;
