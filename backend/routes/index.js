import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import boardRoutes from './boardRoutes.js';
import branchRoutes from './branchRoutes.js';
import academicYearRoutes from './academicYearRoutes.js';
import branchAcademicYearRoutes from './branchAcademicYearRoutes.js';
import classesRoutes from './classesRoutes.js';
import streamsRoutes from './streamsRoutes.js';
import sectionsRoutes from './sectionsRoutes.js';
import subjectsRoutes from './subjectsRoutes.js';
import admissionsRoutes from './admissionsRoutes.js';
import calendarRoutes from './calendarRoutes.js';
import staffProfileRoutes from './staffProfileRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import studentsRoutes from './studentsRoutes.js';
import staffRoutes from './staffRoutes.js';
import portalRoutes from './portalRoutes.js';
import { communicationRouter } from './communicationRoutes.js';
import concernRoutes from './concernRoutes.js';
import visitorRoutes from './visitorRoutes.js';
import healthRoutes from './healthRoutes.js';
import certificateRoutes from './certificateRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/settings/boards', boardRoutes);
router.use('/settings/branches', branchRoutes);
router.use('/branches', branchRoutes); // Alias for top-level access
router.use('/settings/academic-years', academicYearRoutes);
router.use('/academic-years', academicYearRoutes); // Alias for top-level access
router.use('/settings/branch-academic-years', branchAcademicYearRoutes);

// Academic Structure & Subjects Module
router.use('/academics/classes', classesRoutes);
router.use('/classes', classesRoutes); // Alias for top-level access
router.use('/academics/streams', streamsRoutes);
router.use('/academics/sections', sectionsRoutes);
router.use('/sections', sectionsRoutes); // Alias for top-level access
router.use('/academics/subjects', subjectsRoutes);

// Admissions Module
router.use('/admissions', admissionsRoutes);
router.use('/calendar', calendarRoutes);

// Staff Module
router.use('/staff', staffRoutes);
router.use('/portal', portalRoutes);
router.use('/staff-profiles', staffProfileRoutes);

// Attendance Module
router.use('/attendance', attendanceRoutes);

// Students Module
router.use('/students', studentsRoutes);
router.use('/communication', communicationRouter);

// Concerns & Helpdesk Module
router.use('/concerns', concernRoutes);

// Visitor Management Module
router.use('/visitors', visitorRoutes);

// Infirmary & Health Management Module
router.use('/health', healthRoutes);

// Certificate Management Module
router.use('/certificates', certificateRoutes);

// Inventory Management Module
router.use('/inventory', inventoryRoutes);

export default router;
