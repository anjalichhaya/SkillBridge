import Enrollment from '../models/Enrollment.model.js'
import Course from '../models/Course.model.js'
import crypto from 'crypto'

// ─── @desc    Enroll in a course
// ─── @route   POST /api/enrollments/:courseId
// ─── @access  Private (Student)
export const enrollInCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId)

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'This course is not available for enrollment'
      })
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId
    })

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      })
    }

    // For now we handle free courses only
    // Paid course payment flow comes in a later step
    if (course.price > 0 && course.discountPrice > 0) {
      // Even paid courses — we'll allow for now, mark as pending
      // Full payment gateway integration comes later
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: req.params.courseId,
      paymentStatus: course.isFree ? 'free' : 'paid',
      amountPaid: course.discountPrice || course.price
    })

    // Add student to course's enrolledStudents array
    await Course.findByIdAndUpdate(req.params.courseId, {
      $addToSet: { enrolledStudents: req.user.id },  // $addToSet prevents duplicates
      $inc: { totalEnrollments: 1 }                  // $inc increments by 1
    })

    res.status(201).json({
      success: true,
      message: `Successfully enrolled in "${course.title}"`,
      enrollment
    })
  } catch (err) {
    // Handle duplicate enrollment at DB level
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      })
    }
    next(err)
  }
}

// ─── @desc    Get all enrollments of logged-in student
// ─── @route   GET /api/enrollments/my-enrollments
// ─── @access  Private (Student)
export const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate({
        path: 'course',
        select: 'title thumbnail category level totalDuration instructor ratings',
        populate: {
          path: 'instructor',
          select: 'name avatar'
        }
      })
      .sort({ lastAccessedAt: -1 })  // most recently accessed first

    res.status(200).json({
      success: true,
      totalEnrollments: enrollments.length,
      enrollments
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get single enrollment details
// ─── @route   GET /api/enrollments/:courseId
// ─── @access  Private (Student who enrolled)
export const getEnrollmentDetails = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId
    }).populate('course')

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      })
    }

    res.status(200).json({
      success: true,
      enrollment
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Mark a lesson as complete
// ─── @route   PUT /api/enrollments/:courseId/lessons/:lessonId/complete
// ─── @access  Private (Enrolled student)
export const markLessonComplete = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId
    })

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in this course'
      })
    }

    const { lessonId } = req.params

    // Check if lesson already marked complete — avoid duplicates
    const alreadyCompleted = enrollment.completedLessons.includes(lessonId)

    if (!alreadyCompleted) {
      enrollment.completedLessons.push(lessonId)
    }

    // Get total lessons count from the course
    const course = await Course.findById(req.params.courseId).select('lessons')
    const totalLessons = course.lessons.length

    // Recalculate progress using our instance method
    enrollment.calculateProgress(totalLessons)

    // Update last accessed
    enrollment.lastAccessedAt = new Date()

    await enrollment.save()

    res.status(200).json({
      success: true,
      message: alreadyCompleted
        ? 'Lesson already marked as complete'
        : 'Lesson marked as complete',
      progressPercent: enrollment.progressPercent,
      isCompleted: enrollment.isCompleted,
      completedLessons: enrollment.completedLessons.length,
      totalLessons
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Mark a lesson as incomplete (undo)
// ─── @route   PUT /api/enrollments/:courseId/lessons/:lessonId/incomplete
// ─── @access  Private (Enrolled student)
export const markLessonIncomplete = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId
    })

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in this course'
      })
    }

    // $pull removes a specific value from an array
    enrollment.completedLessons = enrollment.completedLessons.filter(
      id => id.toString() !== req.params.lessonId
    )

    const course = await Course.findById(req.params.courseId).select('lessons')
    enrollment.calculateProgress(course.lessons.length)
    enrollment.lastAccessedAt = new Date()

    await enrollment.save()

    res.status(200).json({
      success: true,
      message: 'Lesson marked as incomplete',
      progressPercent: enrollment.progressPercent,
      isCompleted: enrollment.isCompleted
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get all students enrolled in instructor's course
// ─── @route   GET /api/enrollments/course/:courseId/students
// ─── @access  Private (Instructor, Admin)
export const getCourseStudents = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId)

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    // Verify ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this data'
      })
    }

    const enrollments = await Enrollment.find({ course: req.params.courseId })
      .populate('student', 'name email avatar phone')
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      totalStudents: enrollments.length,
      enrollments
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Issue certificate after course completion
// ─── @route   POST /api/enrollments/:courseId/certificate
// ─── @access  Private (Enrolled student who completed the course)
export const issueCertificate = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId
    }).populate('course', 'title hasCertificate')

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      })
    }

    if (!enrollment.isCompleted) {
      return res.status(400).json({
        success: false,
        message: `Complete the course first. Current progress: ${enrollment.progressPercent}%`
      })
    }

    if (!enrollment.course.hasCertificate) {
      return res.status(400).json({
        success: false,
        message: 'This course does not offer a certificate'
      })
    }

    if (enrollment.certificate.issued) {
      return res.status(200).json({
        success: true,
        message: 'Certificate already issued',
        certificate: enrollment.certificate
      })
    }

    // Generate unique certificate ID
    // Format: SB-2026-XXXX (SkillBridge + year + random hex)
    const certificateId = `SB-${new Date().getFullYear()}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`

    enrollment.certificate = {
      issued: true,
      issuedAt: new Date(),
      certificateId,
      url: null   // we'll generate actual PDF/image in the certificate step
    }

    await enrollment.save()

    res.status(200).json({
      success: true,
      message: '🎓 Certificate issued successfully!',
      certificate: enrollment.certificate
    })
  } catch (err) {
    next(err)
  }
}