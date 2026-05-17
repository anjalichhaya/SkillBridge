import express from 'express'
import {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js'
import { isAuthenticated } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public routes — no login required
router.post('/register', register)
router.post('/login', login)
router.post('/password/forgot', forgotPassword)
router.put('/password/reset/:token', resetPassword)

// Private routes — must be logged in
router.get('/logout', isAuthenticated, logout)
router.get('/me', isAuthenticated, getMe)
router.put('/password/update', isAuthenticated, updatePassword)

export default router