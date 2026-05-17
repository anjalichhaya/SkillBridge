import Application from '../models/Application.model.js'
import Job from '../models/Job.model.js'
import Enrollment from '../models/Enrollment.model.js'

// ─── @desc    Apply for a job
// ─── @route   POST /api/applications/:jobId
// ─── @access  Private (Student)
export const applyForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId)

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' })
    }

    if (job.applicationDeadline < new Date()) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed' })
    }

    if (job.totalApplications >= job.maxApplications) {
      return res.status(400).json({ success: false, message: 'Maximum applications reached for this job' })
    }

    // Check for SkillBridge certificates related to this job
    // This is the unique feature — auto-attach relevant certificates
    const enrollments = await Enrollment.find({
      student: req.user.id,
      isCompleted: true,
      'certificate.issued': true
    }).populate('course', 'title skillsRequired')

    const attachedCertificates = enrollments
      .filter(e => {
        // Attach certificate if course skills overlap with job skills
        const courseSkills = e.course?.title?.toLowerCase() || ''
        return job.skillsRequired.some(skill =>
          courseSkills.includes(skill.toLowerCase())
        )
      })
      .map(e => ({
        courseTitle: e.course.title,
        certificateId: e.certificate.certificateId,
        issuedAt: e.certificate.issuedAt
      }))

    const application = await Application.create({
      job: req.params.jobId,
      applicant: req.user.id,
      coverLetter: req.body.coverLetter,
      expectedSalary: req.body.expectedSalary,
      attachedCertificates,
      statusHistory: [{ status: 'pending', note: 'Application submitted' }]
    })

    // Increment application count on job
    await Job.findByIdAndUpdate(req.params.jobId, {
      $inc: { totalApplications: 1 }
    })

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application,
      certificatesAttached: attachedCertificates.length
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      })
    }
    next(err)
  }
}

// ─── @desc    Get student's own applications
// ─── @route   GET /api/applications/my-applications
// ─── @access  Private (Student)
export const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ applicant: req.user.id })
      .populate({
        path: 'job',
        select: 'title company location jobType salary status applicationDeadline'
      })
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      totalApplications: applications.length,
      applications
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get all applications for a job (employer view)
// ─── @route   GET /api/applications/job/:jobId
// ─── @access  Private (Employer)
export const getJobApplications = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId)

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    const { status } = req.query
    const filter = { job: req.params.jobId }
    if (status) filter.status = status

    const applications = await Application.find(filter)
      .populate('applicant', 'name email avatar phone skills education resume')
      .sort({ createdAt: -1 })

    // Mark all as read
    await Application.updateMany(
      { job: req.params.jobId, isRead: false },
      { isRead: true }
    )

    res.status(200).json({
      success: true,
      totalApplications: applications.length,
      applications
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Update application status (employer action)
// ─── @route   PUT /api/applications/:id/status
// ─── @access  Private (Employer)
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body

    const application = await Application.findById(req.params.id)
      .populate('job', 'postedBy')

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' })
    }

    if (application.job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    // Update status and push to history
    application.status = status
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      note: note || ''
    })

    if (note) application.employerNote = note

    await application.save()

    res.status(200).json({
      success: true,
      message: `Application ${status}`,
      application
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Withdraw application
// ─── @route   DELETE /api/applications/:id
// ─── @access  Private (Student who applied)
export const withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' })
    }

    if (application.applicant.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    if (['hired', 'rejected'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw a processed application'
      })
    }

    await Application.findByIdAndUpdate(req.params.id, {
      $inc: { totalApplications: -1 }
    })

    await application.deleteOne()

    res.status(200).json({ success: true, message: 'Application withdrawn' })
  } catch (err) {
    next(err)
  }
}