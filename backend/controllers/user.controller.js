import User from '../models/User.model.js'
import { deleteFromCloudinary } from '../utils/uploadToCloudinary.js'

// ─── @desc    Update profile info
// ─── @route   PUT /api/users/profile
// ─── @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    // Fields any user can update
    const allowedFields = {
      name: req.body.name,
      phone: req.body.phone,
      bio: req.body.bio
    }

    // Role-specific fields
    if (req.user.role === 'student') {
      if (req.body.skills) allowedFields.skills = req.body.skills
      if (req.body.education) allowedFields.education = req.body.education
    }

    if (req.user.role === 'instructor') {
      if (req.body.expertise) allowedFields.expertise = req.body.expertise
      if (req.body.experience) allowedFields.experience = req.body.experience
    }

    if (req.user.role === 'employer') {
      if (req.body.company) allowedFields.company = req.body.company
    }

    // Remove undefined fields so we don't overwrite with null
    Object.keys(allowedFields).forEach(
      key => allowedFields[key] === undefined && delete allowedFields[key]
    )

    const user = await User.findByIdAndUpdate(
      req.user.id,
      allowedFields,
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Upload / update avatar
// ─── @route   PUT /api/users/avatar
// ─── @access  Private
export const updateAvatar = async (req, res, next) => {
  try {
    // req.file is populated by multer after upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      })
    }

    const user = await User.findById(req.user.id)

    // Delete old avatar from Cloudinary if it exists
    if (user.avatar?.public_id) {
      await deleteFromCloudinary(user.avatar.public_id)
    }

    // req.file.filename = public_id set by CloudinaryStorage
    // req.file.path = the Cloudinary URL
    user.avatar = {
      public_id: req.file.filename,
      url: req.file.path
    }

    await user.save({ validateBeforeSave: false })

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Upload resume (students only)
// ─── @route   PUT /api/users/resume
// ─── @access  Private (Student)
export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF resume'
      })
    }

    const user = await User.findById(req.user.id)

    // Delete old resume
    if (user.resume?.public_id) {
      await deleteFromCloudinary(user.resume.public_id, 'raw')
    }

    user.resume = {
      public_id: req.file.filename,
      url: req.file.path
    }

    await user.save({ validateBeforeSave: false })

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      resume: user.resume
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get any user's public profile
// ─── @route   GET /api/users/:id
// ─── @access  Public
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-resetPasswordToken -resetPasswordExpire -emailVerificationToken')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.status(200).json({ success: true, user })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Upload course thumbnail
// ─── @route   PUT /api/users/course-thumbnail/:courseId
// ─── @access  Private (Instructor)
export const uploadCourseThumbnail = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      })
    }

    const Course = (await import('../models/Course.model.js')).default
    const course = await Course.findById(req.params.courseId)

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    // Delete old thumbnail
    if (course.thumbnail?.public_id) {
      await deleteFromCloudinary(course.thumbnail.public_id)
    }

    course.thumbnail = {
      public_id: req.file.filename,
      url: req.file.path
    }

    await course.save()

    res.status(200).json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail: course.thumbnail
    })
  } catch (err) {
    next(err)
  }
}