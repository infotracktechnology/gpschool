import express from 'express';
import { calendarController } from '../controllers/calendarController.js';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/events', calendarController.getEvents);
router.get('/upcoming', calendarController.getUpcoming);

router.post('/events', requireRoles('super_admin', 'admin', 'principal', 'teacher'), calendarController.createEvent);
router.put('/events/:id', requireRoles('super_admin', 'admin', 'principal', 'teacher'), calendarController.updateEvent);
router.delete('/events/:id', requireRoles('super_admin', 'admin', 'principal', 'teacher'), calendarController.deleteEvent);

export default router;
