import express from 'express'
import {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  changeUserRole,
  deleteUser
} from '../controllers/admin.controller.js'
import { isAuthenticated, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// All admin routes — must be logged in AND be admin
router.use(isAuthenticated)
router.use(authorizeRoles('admin'))

router.get('/stats', getDashboardStats)
router.get('/users', getAllUsers)
router.put('/users/:id/toggle-status', toggleUserStatus)
router.put('/users/:id/role', changeUserRole)
router.delete('/users/:id', deleteUser)

export default router