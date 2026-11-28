import { Router } from 'express';
import { getExecutiveOverview } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/overview', verifyToken, getExecutiveOverview);

export default router;
