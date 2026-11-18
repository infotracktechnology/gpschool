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

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/settings/boards', boardRoutes);
router.use('/settings/branches', branchRoutes);
router.use('/branches', branchRoutes); // Alias for top-level access
router.use('/settings/academic-years', academicYearRoutes);
router.use('/settings/branch-academic-years', branchAcademicYearRoutes);

// Academic Structure & Subjects Module
router.use('/academics/classes', classesRoutes);
router.use('/academics/streams', streamsRoutes);
router.use('/academics/sections', sectionsRoutes);
router.use('/academics/subjects', subjectsRoutes);

// Admissions Module
router.use('/admissions', admissionsRoutes);
router.use('/calendar', calendarRoutes);
// // Students Module
// router.use('/students', studentsRoutes);

export default router;
