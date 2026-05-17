import Course from '../models/Course.model.js'

// ─── @desc    Get all published courses (with filters)
// ─── @route   GET /api/courses
// ─── @access  Public
export const getAllCourses = async (req, res, next) => {
  try {
    // Extract query params — everything after ? in the URL
    // e.g. /api/courses?category=Technology&level=Beginner&page=2
    const {
      keyword,
      category,
      level,
      minPrice,
      maxPrice,
      isFree,
      sort,
      page = 1,
      limit = 9
    } = req.query

    // Build filter object dynamically
    // We only add a filter if the query param actually exists
    const filter = { status: 'published' }   // always only show published

    // Full-text search across title, description, tags
    if (keyword) {
      filter.$text = { $search: keyword }
    }

    if (category) filter.category = category
    if (level) filter.level = level
    if (isFree === 'true') filter.isFree = true

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)  // $gte = greater than or equal
      if (maxPrice) filter.price.$lte = Number(maxPrice)  // $lte = less than or equal
    }

    // Sort options
    let sortOption = { createdAt: -1 }  // default: newest first

    if (sort === 'price-low') sortOption = { price: 1 }
    if (sort === 'price-high') sortOption = { price: -1 }
    if (sort === 'rating') sortOption = { ratings: -1 }
    if (sort === 'popular') sortOption = { totalEnrollments: -1 }

    // Pagination
    // page=2, limit=9 → skip first 9 results, take next 9
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query
    const courses = await Course.find(filter)
      .populate('instructor', 'name avatar')  // replace instructor ObjectId with actual user data
      .select('-lessons -enrolledStudents -reviews')  // exclude heavy fields for list view
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))

    // Count total matching docs for pagination UI
    const totalCourses = await Course.countDocuments(filter)

    res.status(200).json({
      success: true,
      totalCourses,
      totalPages: Math.ceil(totalCourses / Number(limit)),
      currentPage: Number(page),
      courses
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get single course by ID
// ─── @route   GET /api/courses/:id
// ─── @access  Public
export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name avatar bio expertise experience')
      .populate('reviews.user', 'name avatar')

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    // Only show free lessons if user is not enrolled
    // We'll enhance this later with enrollment check
    const courseData = course.toJSON()

    res.status(200).json({
      success: true,
      course: courseData
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Create new course
// ─── @route   POST /api/courses
// ─── @access  Private (Instructor, Admin)
export const createCourse = async (req, res, next) => {
  try {
    // Attach instructor from logged-in user
    req.body.instructor = req.user.id

    const course = await Course.create(req.body)

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Update course
// ─── @route   PUT /api/courses/:id
// ─── @access  Private (Instructor who owns it, Admin)
export const updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id)

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    // Check ownership — only the instructor who created it or admin can update
    // course.instructor is an ObjectId, req.user.id is a string — toString() fixes comparison
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this course'
      })
    }

    course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,            // return updated document, not the old one
        runValidators: true   // run schema validators on update too
      }
    )

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      course
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Delete course
// ─── @route   DELETE /api/courses/:id
// ─── @access  Private (Instructor who owns it, Admin)
export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this course'
      })
    }

    await course.deleteOne()

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Add review to course
// ─── @route   POST /api/courses/:id/reviews
// ─── @access  Private (enrolled students only)
export const addReview = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    // Check if student is enrolled
    const isEnrolled = course.enrolledStudents.includes(req.user.id)
    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled to review this course'
      })
    }

    // Check if already reviewed
    const alreadyReviewed = course.reviews.find(
      r => r.user.toString() === req.user.id
    )
    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course'
      })
    }

    const review = {
      user: req.user.id,
      name: req.user.name,
      avatar: req.user.avatar?.url,
      rating: Number(req.body.rating),
      comment: req.body.comment
    }

    course.reviews.push(review)
    course.numReviews = course.reviews.length

    // Recalculate average rating
    course.ratings =
      course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length

    await course.save()

    res.status(201).json({
      success: true,
      message: 'Review added successfully'
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Get instructor's own courses
// ─── @route   GET /api/courses/my-courses
// ─── @access  Private (Instructor)
export const getMyCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ instructor: req.user.id })
      .select('-enrolledStudents -reviews')
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      totalCourses: courses.length,
      courses
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Publish / unpublish a course
// ─── @route   PUT /api/courses/:id/status
// ─── @access  Private (Instructor who owns it, Admin)
export const updateCourseStatus = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      })
    }

    // Toggle between draft and published
    course.status = req.body.status
    await course.save()

    res.status(200).json({
      success: true,
      message: `Course ${req.body.status} successfully`,
      status: course.status
    })
  } catch (err) {
    next(err)
  }
}