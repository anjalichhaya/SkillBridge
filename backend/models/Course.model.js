import mongoose from 'mongoose'

// ─── Lesson Schema (embedded inside Course) ───────────────────────────────────
// We embed lessons directly in the course document because:
// - Lessons don't exist independently without a course
// - We always fetch them together
// - Fewer DB queries needed
const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  // Video hosted on Cloudinary
  video: {
    public_id: String,
    url: String,
    duration: Number   // in minutes
  },

  // Downloadable resources for this lesson
  resources: [
    {
      title: String,
      url: String
    }
  ],

  order: {
    type: Number,    // lesson number — for ordering (1, 2, 3...)
    required: true
  },

  isFree: {
    type: Boolean,
    default: false   // preview lessons are free, rest need enrollment
  }
})

// ─── Review Schema (embedded inside Course) ───────────────────────────────────
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',        // reference to User collection
      required: true
    },

    name: String,         // stored separately so we don't need to populate just for display
    avatar: String,

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },

    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [500, 'Review cannot exceed 500 characters']
    }
  },
  { timestamps: true }
)

// ─── Main Course Schema ───────────────────────────────────────────────────────
const courseSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },

    description: {
      type: String,
      required: [true, 'Course description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },

    // Short description for cards/previews
    shortDescription: {
      type: String,
      maxlength: [200, 'Short description cannot exceed 200 characters']
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    thumbnail: {
      public_id: String,
      url: {
        type: String,
        default: 'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains.jpg'
      }
    },

    // ── Categorization ────────────────────────────────────────────────────────
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Technology',
        'Finance',
        'Healthcare',
        'Agriculture',
        'Manufacturing',
        'Design',
        'Marketing',
        'Soft Skills',
        'Language',
        'Other'
      ]
    },

    tags: [String],    // ['javascript', 'web development', 'beginner']

    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner'
    },

    language: {
      type: String,
      default: 'English'
    },

    // ── Pricing ───────────────────────────────────────────────────────────────
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0
    },

    discountPrice: {
      type: Number,
      default: 0
    },

    isFree: {
      type: Boolean,
      default: false
    },

    // ── Instructor ────────────────────────────────────────────────────────────
    // ObjectId reference — links to a User document with role 'instructor'
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required']
    },

    // ── Curriculum ────────────────────────────────────────────────────────────
    // Array of embedded lessonSchema documents
    lessons: [lessonSchema],

    totalDuration: {
      type: Number,    // total minutes, calculated from lessons
      default: 0
    },

    // ── Enrollment ────────────────────────────────────────────────────────────
    // Array of User ObjectIds — everyone enrolled in this course
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    totalEnrollments: {
      type: Number,
      default: 0     // we'll keep this in sync with enrolledStudents.length
    },

    // ── Reviews ───────────────────────────────────────────────────────────────
    reviews: [reviewSchema],

    ratings: {
      type: Number,
      default: 0     // average rating, recalculated on each new review
    },

    numReviews: {
      type: Number,
      default: 0
    },

    // ── Requirements & Outcomes ───────────────────────────────────────────────
    requirements: [String],   // ['Basic computer knowledge', 'Internet connection']
    outcomes: [String],       // ['Build full stack apps', 'Understand REST APIs']

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },

    // ── Certificate ───────────────────────────────────────────────────────────
    hasCertificate: {
      type: Boolean,
      default: true
    },

    // ── Government Scheme Tag ─────────────────────────────────────────────────
    // This is what makes SkillBridge unique — courses tied to Skill India schemes
    skillIndiaScheme: {
      type: String,
      enum: [
        'PMKVY',           // Pradhan Mantri Kaushal Vikas Yojana
        'DDUGKY',          // Deen Dayal Upadhyaya Grameen Kaushalya Yojana
        'NAPS',            // National Apprenticeship Promotion Scheme
        'STAR',            // Standard Training Assessment and Reward
        'None'
      ],
      default: 'None'
    }
  },
  {
    timestamps: true
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Indexes speed up database queries dramatically
// Without index: MongoDB scans EVERY document to find matches
// With index: MongoDB uses a lookup table — like an index in a book
// courseSchema.index({ title: 'text', description: 'text', tags: 'text' })  // full-text search
// Text index
courseSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { default_language: 'none' }
)
courseSchema.index({ category: 1 })     // 1 = ascending index
courseSchema.index({ instructor: 1 })
courseSchema.index({ status: 1 })
courseSchema.index({ price: 1 })

// ─── Virtual Fields ───────────────────────────────────────────────────────────
// Virtuals are computed fields — they don't get stored in MongoDB
// but they appear in the output. Like a calculated column.

// Discount percentage
courseSchema.virtual('discountPercentage').get(function () {
  if (!this.discountPrice || !this.price) return 0
  return Math.round(((this.price - this.discountPrice) / this.price) * 100)
})

// Make virtuals show up in JSON output
courseSchema.set('toJSON', { virtuals: true })
courseSchema.set('toObject', { virtuals: true })

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
courseSchema.pre('save', async function () {
  // Auto-calculate totalDuration from all lessons
  if (this.lessons && this.lessons.length > 0) {
    this.totalDuration = this.lessons.reduce((total, lesson) => {
      return total + (lesson.video?.duration || 0)
    }, 0)
  }

  // Auto-set isFree if price is 0
  if (this.price === 0) {
    this.isFree = true
  }

  // Keep totalEnrollments in sync
  this.totalEnrollments = this.enrolledStudents.length
})

const Course = mongoose.model('Course', courseSchema)

export default Course