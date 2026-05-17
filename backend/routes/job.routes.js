import express from 'express'
import {
  getAllJobs, getJob, createJob,
  updateJob, deleteJob, getMyJobs
} from '../controllers/job.controller.js'
import { isAuthenticated, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', getAllJobs)
router.get('/:id', getJob)

router.get('/employer/my-jobs', isAuthenticated, authorizeRoles('employer', 'admin'), getMyJobs)
router.post('/', isAuthenticated, authorizeRoles('employer', 'admin'), createJob)
router.put('/:id', isAuthenticated, authorizeRoles('employer', 'admin'), updateJob)
router.delete('/:id', isAuthenticated, authorizeRoles('employer', 'admin'), deleteJob)

export default router