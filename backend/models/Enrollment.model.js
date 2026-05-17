import mongoose from 'mongoose'

const enrollmentSchema = new mongoose.Schema(
  {
    // ── Who enrolled ──────────────────────────────────────────────────────────
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── In which course ───────────────────────────────────────────────────────
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },

    // ── Payment Info ──────────────────────────────────────────────────────────
    // We'll expand this when we add payments later
    paymentStatus: {
      type: String,
      enum: ['free', 'paid', 'pending'],
      default: 'free'
    },

    amountPaid: {
      type: Number,
      default: 0
    },

    // ── Progress Tracking ─────────────────────────────────────────────────────
    // Array of lesson IDs the student has marked as complete
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId   // lesson _id from Course.lessons array
      }
    ],

    // Progress percentage — calculated automatically
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // ── Completion ────────────────────────────────────────────────────────────
    isCompleted: {
      type: Boolean,
      default: false
    },

    completedAt: Date,

    // ── Certificate ───────────────────────────────────────────────────────────
    certificate: {
      issued: {
        type: Boolean,
        default: false
      },
      issuedAt: Date,
      certificateId: {
        type: String,
        unique: true,
        sparse: true   // sparse: allows multiple null values (only enforces unique on non-null)
      },
      url: String      // Cloudinary URL of the generated certificate image
    },

    // ── Last accessed ─────────────────────────────────────────────────────────
    lastAccessedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

// ─── Compound Index ───────────────────────────────────────────────────────────
// A student can only enroll ONCE in a course
// This index enforces uniqueness on the COMBINATION of student + course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true })

// ─── Instance Method — recalculate progress ───────────────────────────────────
enrollmentSchema.methods.calculateProgress = function (totalLessons) {
  if (!totalLessons || totalLessons === 0) {
    this.progressPercent = 0
    return
  }

  this.progressPercent = Math.round(
    (this.completedLessons.length / totalLessons) * 100
  )

  // Auto-mark as completed when all lessons done
  if (this.progressPercent === 100) {
    this.isCompleted = true
    if (!this.completedAt) {
      this.completedAt = new Date()
    }
  }
}

const Enrollment = mongoose.model('Enrollment', enrollmentSchema)

export default Enrollment