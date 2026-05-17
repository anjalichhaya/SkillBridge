import express from 'express'
import {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addReview,
  getMyCourses,
  updateCourseStatus
} from '../controllers/course.controller.js'
import { isAuthenticated, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', getAllCourses)
router.get('/:id', getCourse)

// ── Private — instructor & admin only ─────────────────────────────────────────
// isAuthenticated runs first, then authorizeRoles checks the role
router.post(
  '/',
  isAuthenticated,
  authorizeRoles('instructor', 'admin'),
  createCourse
)

router.put(
  '/:id',
  isAuthenticated,
  authorizeRoles('instructor', 'admin'),
  updateCourse
)

router.delete(
  '/:id',
  isAuthenticated,
  authorizeRoles('instructor', 'admin'),
  deleteCourse
)

router.put(
  '/:id/status',
  isAuthenticated,
  authorizeRoles('instructor', 'admin'),
  updateCourseStatus
)

// ── Instructor's own courses ───────────────────────────────────────────────────
router.get(
  '/instructor/my-courses',
  isAuthenticated,
  authorizeRoles('instructor', 'admin'),
  getMyCourses
)

// ── Reviews — enrolled students only ─────────────────────────────────────────
router.post('/:id/reviews', isAuthenticated, addReview)

export default router