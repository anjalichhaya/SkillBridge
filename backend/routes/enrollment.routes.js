import express from 'express'
import {
  enrollInCourse,
  getMyEnrollments,
  getEnrollmentDetails,
  markLessonComplete,
  markLessonIncomplete,
  getCourseStudents,
  issueCertificate
} from '../controllers/enrollment.controller.js'
import { isAuthenticated, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// All enrollment routes require login
router.use(isAuthenticated)

// ── Student routes ────────────────────────────────────────────────────────────
router.post('/:courseId', authorizeRoles('student'), enrollInCourse)
router.get('/my-enrollments', getMyEnrollments)
router.get('/:courseId', getEnrollmentDetails)
router.post('/:courseId/certificate', issueCertificate)

// ── Lesson progress ───────────────────────────────────────────────────────────
router.put(
  '/:courseId/lessons/:lessonId/complete',
  authorizeRoles('student'),
  markLessonComplete
)
router.put(
  '/:courseId/lessons/:lessonId/incomplete',
  authorizeRoles('student'),
  markLessonIncomplete
)

// ── Instructor routes ─────────────────────────────────────────────────────────
router.get(
  '/course/:courseId/students',
  authorizeRoles('instructor', 'admin'),
  getCourseStudents
)

export default router