import { Router } from 'express';
import {
  getStreams,
  createStream,
  updateStream,
  deleteStream,
} from '../controllers/streamsController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getStreams);
router.post('/', requireRoles('super_admin', 'admin'), createStream);
router.put('/:id', requireRoles('super_admin', 'admin'), updateStream);
router.delete('/:id', requireRoles('super_admin'), deleteStream);

export default router;
