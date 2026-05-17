import express from 'express'
import {
  applyForJob, getMyApplications,
  getJobApplications, updateApplicationStatus,
  withdrawApplication
} from '../controllers/application.controller.js'
import { isAuthenticated, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

router.use(isAuthenticated)

router.post('/:jobId', authorizeRoles('student'), applyForJob)
router.get('/my-applications', getMyApplications)
router.get('/job/:jobId', authorizeRoles('employer', 'admin'), getJobApplications)
router.put('/:id/status', authorizeRoles('employer', 'admin'), updateApplicationStatus)
router.delete('/:id', authorizeRoles('student'), withdrawApplication)

export default router