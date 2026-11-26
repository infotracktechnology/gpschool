import { Router } from 'express';
import { communicationController } from '../controllers/communicationController.js';
import { verifyToken, requireRoles, optionalToken } from '../middleware/authMiddleware.js';

export const communicationRouter = Router();

const COMMUNICATION_STAFF_READ = ['super_admin', 'admin', 'principal', 'teacher', 'staff', 'coordinator'];
const COMMUNICATION_STAFF_WRITE = ['super_admin', 'admin', 'principal', 'teacher'];

// Student / Parent Portal Feed (token optional — resolves student context when present)
communicationRouter.get('/portal/student-feed', optionalToken, communicationController.getStudentPortalFeed);

// Everything below requires authentication
communicationRouter.use(verifyToken);

// Homework
communicationRouter.get('/homework', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.listHomework);
communicationRouter.post('/homework', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.createHomework);
communicationRouter.put('/homework/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.updateHomework);
communicationRouter.delete('/homework/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.deleteHomework);
communicationRouter.post('/upload-attachment', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.uploadAttachment);

// Announcements
communicationRouter.get('/announcements', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.listAnnouncements);
communicationRouter.post('/announcements', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.createAnnouncement);
communicationRouter.put('/announcements/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.updateAnnouncement);
communicationRouter.delete('/announcements/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.deleteAnnouncement);

// Assignments
communicationRouter.get('/assignments', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.listAssignments);
communicationRouter.get('/assignments/:id', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.getAssignmentDetails);
communicationRouter.post('/assignments', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.createAssignment);
communicationRouter.put('/assignments/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.updateAssignment);
communicationRouter.delete('/assignments/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.deleteAssignment);
// Students may submit their own work (ownership enforced in controller)
communicationRouter.post('/assignments/:assignmentId/submit', communicationController.submitAssignmentWork);
communicationRouter.put('/assignments/:assignmentId/review/:studentId', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.reviewAssignment);
communicationRouter.put('/assignments/:assignmentId/offline-verify/:studentId', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.markOfflineCompletion);

// Gallery — students may view album details (media) for the student gallery page
communicationRouter.get('/gallery', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.listAlbums);
communicationRouter.get('/gallery/:id', communicationController.getAlbumDetails);
communicationRouter.post('/gallery', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.createAlbum);
communicationRouter.put('/gallery/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.updateAlbum);
communicationRouter.delete('/gallery/:id', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.deleteAlbum);
communicationRouter.post('/gallery/:albumId/media', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.addMediaToAlbum);
communicationRouter.put('/gallery/media/:mediaId', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.updateMediaItem);
communicationRouter.delete('/gallery/media/:mediaId', requireRoles(...COMMUNICATION_STAFF_WRITE), communicationController.deleteMediaItem);

// Dashboard & Monitoring
communicationRouter.get('/dashboard/summary', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.getDashboardSummary);
communicationRouter.get('/dashboard/homework-monitoring', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.getHomeworkMonitoring);
communicationRouter.get('/dashboard/assignment-monitoring', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.getAssignmentMonitoring);

// Multi-Module Feeds for All Classes
communicationRouter.get('/feeds', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.getClassModuleFeeds);

// Audit Trail & Activity History
communicationRouter.get('/history', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.getAuditHistory);
communicationRouter.get('/audit', requireRoles(...COMMUNICATION_STAFF_READ), communicationController.getAuditHistory);

export default communicationRouter;
