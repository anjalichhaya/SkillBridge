import Job from '../models/Job.model.js'
import Application from '../models/Application.model.js'

// ─── @desc    Get all open jobs (with filters)
// ─── @route   GET /api/jobs
// ─── @access  Public
export const getAllJobs = async (req, res, next) => {
  try {
    const {
      keyword,
      location,
      jobType,
      workMode,
      minSalary,
      maxSalary,
      experience,
      skillIndiaScheme,
      sort,
      page = 1,
      limit = 10
    } = req.query

    const filter = {
      status: 'open',
      applicationDeadline: { $gt: new Date() }  // only non-expired jobs
    }

    if (keyword) filter.$text = { $search: keyword }
    if (location) filter['company.location'] = new RegExp(location, 'i')  // case-insensitive
    if (jobType) filter.jobType = jobType
    if (workMode) filter.workMode = workMode
    if (skillIndiaScheme) filter.skillIndiaScheme = skillIndiaScheme
    if (experience) filter['experience.min'] = { $lte: Number(experience) }

    if (minSalary || maxSalary) {
      filter['salary.min'] = {}
      if (minSalary) filter['salary.min'].$gte = Number(minSalary)
      if (maxSalary) filter['salary.min'].$lte = Number(maxSalary)
    }

    let sortOption = { createdAt: -1 }
    if (sort === 'salary-high') sortOption = { 'salary.max': -1 }
    if (sort === 'salary-low') sortOption = { 'salary.min': 1 }
    if (sort === 'deadline') sortOption = { applicationDeadline: 1 }
    if (sort === 'popular') sortOption = { totalApplications: -1 }

    const skip = (Number(page) - 1) * Number(limit)

    const jobs = await Job.find(filter)
      .populate('postedBy', 'name avatar company')
      .populate('relatedCourse', 'title thumbnail')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))

    const totalJobs = await Job.countDocuments(filter)

    res.status(200).json({
      success: true,
      totalJobs,
      totalPages: Math.ceil(totalJobs / Number(limit)),
      currentPage: Number(page),
      jobs
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get single job
// ─── @route   GET /api/jobs/:id
// ─── @access  Public
export const getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name avatar company')
      .populate('relatedCourse', 'title thumbnail level ratings')

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    res.status(200).json({ success: true, job })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Create job posting
// ─── @route   POST /api/jobs
// ─── @access  Private (Employer, Admin)
export const createJob = async (req, res, next) => {
  try {
    req.body.postedBy = req.user.id

    // Auto-fill company info from employer's profile if not provided
    if (!req.body.company?.name && req.user.company?.name) {
      req.body.company = {
        name: req.user.company.name,
        logo: req.user.company.logo?.url,
        website: req.user.company.website,
        location: req.user.company.location
      }
    }

    const job = await Job.create(req.body)

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Update job
// ─── @route   PUT /api/jobs/:id
// ─── @access  Private (Employer who posted, Admin)
export const updateJob = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id)

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })

    res.status(200).json({ success: true, message: 'Job updated', job })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Delete job
// ─── @route   DELETE /api/jobs/:id
// ─── @access  Private (Employer who posted, Admin)
export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    // Also delete all applications for this job
    await Application.deleteMany({ job: req.params.id })
    await job.deleteOne()

    res.status(200).json({ success: true, message: 'Job deleted successfully' })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get employer's own job postings
// ─── @route   GET /api/jobs/my-jobs
// ─── @access  Private (Employer)
export const getMyJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id })
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      totalJobs: jobs.length,
      jobs
    })
  } catch (err) {
    next(err)
  }
}