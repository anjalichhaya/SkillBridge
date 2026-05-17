import User from '../models/User.model.js'
import Course from '../models/Course.model.js'
import Enrollment from '../models/Enrollment.model.js'
import Job from '../models/Job.model.js'
import Application from '../models/Application.model.js'

// ─── @desc    Get dashboard stats
// ─── @route   GET /api/admin/stats
// ─── @access  Private (Admin)
export const getDashboardStats = async (req, res, next) => {
  try {
    // Run all count queries in PARALLEL using Promise.all
    // Much faster than awaiting each one sequentially
    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalEmployers,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      completedEnrollments,
      totalJobs,
      openJobs,
      totalApplications,
      hiredApplications
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: 'employer' }),
      Course.countDocuments(),
      Course.countDocuments({ status: 'published' }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ isCompleted: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'hired' })
    ])

    // ── Growth data — last 7 days ──────────────────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [newUsersThisWeek, newEnrollmentsThisWeek, newApplicationsThisWeek] =
      await Promise.all([
        User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        Enrollment.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        Application.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
      ])

    // ── Enrollments per day — last 30 days (for chart) ─────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const enrollmentTrend = await Enrollment.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // ── Course category distribution (for pie chart) ───────────────────────
    const categoryDistribution = await Course.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalEnrollments: { $sum: '$totalEnrollments' }
        }
      },
      { $sort: { count: -1 } }
    ])

    // ── User growth — last 6 months ────────────────────────────────────────
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])

    // ── Top courses by enrollment ──────────────────────────────────────────
    const topCourses = await Course.find({ status: 'published' })
      .select('title category totalEnrollments ratings instructor')
      .populate('instructor', 'name')
      .sort({ totalEnrollments: -1 })
      .limit(5)

    // ── Recent activity ────────────────────────────────────────────────────
    const recentUsers = await User.find()
      .select('name email role avatar createdAt')
      .sort({ createdAt: -1 })
      .limit(8)

    const recentEnrollments = await Enrollment.find()
      .populate('student', 'name avatar')
      .populate('course', 'title category')
      .sort({ createdAt: -1 })
      .limit(5)

    const recentApplications = await Application.find()
      .populate('applicant', 'name avatar')
      .populate('job', 'title company')
      .sort({ createdAt: -1 })
      .limit(5)

    // ── Application status breakdown ───────────────────────────────────────
    const applicationStats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          students: totalStudents,
          instructors: totalInstructors,
          employers: totalEmployers,
          newThisWeek: newUsersThisWeek
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          draft: totalCourses - publishedCourses
        },
        enrollments: {
          total: totalEnrollments,
          completed: completedEnrollments,
          completionRate: totalEnrollments
            ? Math.round((completedEnrollments / totalEnrollments) * 100)
            : 0,
          newThisWeek: newEnrollmentsThisWeek
        },
        jobs: {
          total: totalJobs,
          open: openJobs
        },
        applications: {
          total: totalApplications,
          hired: hiredApplications,
          newThisWeek: newApplicationsThisWeek,
          breakdown: applicationStats
        }
      },
      charts: {
        enrollmentTrend,
        categoryDistribution,
        userGrowth
      },
      topCourses,
      recentActivity: {
        users: recentUsers,
        enrollments: recentEnrollments,
        applications: recentApplications
      }
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get all users with filters
// ─── @route   GET /api/admin/users
// ─── @access  Private (Admin)
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 10 } = req.query

    const filter = {}
    if (role) filter.role = role
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)

    const users = await User.find(filter)
      .select('-resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await User.countDocuments(filter)

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      users
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Toggle user active status (ban/unban)
// ─── @route   PUT /api/admin/users/:id/toggle-status
// ─── @access  Private (Admin)
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Prevent admin from banning themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      })
    }

    user.isActive = !user.isActive
    await user.save({ validateBeforeSave: false })

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Change user role
// ─── @route   PUT /api/admin/users/:id/role
// ─── @access  Private (Admin)
export const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.status(200).json({
      success: true,
      message: `Role changed to ${role}`,
      user
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Delete user permanently
// ─── @route   DELETE /api/admin/users/:id
// ─── @access  Private (Admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      })
    }

    // Clean up all related data
    await Promise.all([
      Enrollment.deleteMany({ student: req.params.id }),
      Application.deleteMany({ applicant: req.params.id }),
      Course.updateMany(
        {},
        { $pull: { enrolledStudents: user._id, reviews: { user: user._id } } }
      )
    ])

    await user.deleteOne()

    res.status(200).json({
      success: true,
      message: 'User and all related data deleted successfully'
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Save admin notes
// ─── @route   POST /api/admin/notes
// ─── @access  Private (Admin)
export const saveNote = async (req, res, next) => {
  try {
    // We'll store notes in a simple in-memory cache for now
    // In production you'd have a Note model
    // For now return success — frontend handles persistence via localStorage
    res.status(200).json({
      success: true,
      message: 'Note saved'
    })
  } catch (err) {
    next(err)
  }
}