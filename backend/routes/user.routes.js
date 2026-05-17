import express from 'express'
import {
  updateProfile,
  updateAvatar,
  uploadResume,
  getUserProfile,
  uploadCourseThumbnail
} from '../controllers/user.controller.js'
import { isAuthenticated, authorizeRoles } from '../middleware/auth.middleware.js'
import {
  uploadAvatar as avatarUpload,
  uploadResume as resumeUpload,
  uploadThumbnail
} from '../config/multer.js'

const router = express.Router()

// Public
router.get('/:id', getUserProfile)

// Private — all need login
router.put('/profile', isAuthenticated, updateProfile)

// Avatar — multer middleware runs BEFORE controller
// multer uploads file to Cloudinary, then controller saves URL to DB
router.put('/avatar', isAuthenticated, avatarUpload, updateAvatar)

// Resume — students only
router.put(
  '/resume',
  isAuthenticated,
  authorizeRoles('student'),
  resumeUpload,
  uploadResume
)

// Course thumbnail — instructors only
router.put(
  '/course-thumbnail/:courseId',
  isAuthenticated,
  authorizeRoles('instructor', 'admin'),
  uploadThumbnail,
  uploadCourseThumbnail
)

export default router