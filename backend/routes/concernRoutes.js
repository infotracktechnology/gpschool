import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  getCategories,
  getConcernStats,
  getConcerns,
  getConcernById,
  createConcern,
  assignConcern,
  updateConcernStatus,
  escalateConcern,
} from '../controllers/concernController.js';

const router = Router();

// Apply authentication to all concern routes
router.use(verifyToken);

// 1. Categories & Stats (must be before /:id)
router.get('/categories', getCategories);
router.get('/stats', getConcernStats);

// 2. Base Concern Queries & Creation
router.get('/', getConcerns);
router.get('/:id', getConcernById);
router.post('/', createConcern);

// 3. Ticket Workflow Actions
router.put(
  '/:id/assign',
  requireRoles('super_admin', 'admin', 'principal', 'teacher', 'staff'),
  assignConcern
);
router.put(
  '/:id/status',
  requireRoles('super_admin', 'admin', 'principal', 'teacher', 'staff'),
  updateConcernStatus
);
router.put(
  '/:id/escalate',
  requireRoles('super_admin', 'admin', 'principal', 'teacher', 'staff'),
  escalateConcern
);

export default router;
