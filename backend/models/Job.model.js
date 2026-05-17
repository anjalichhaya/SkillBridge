import mongoose from 'mongoose'

const jobSchema = new mongoose.Schema(
  {
    // ── Basic Info ─────────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },

    description: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },

    // ── Employer ───────────────────────────────────────────────────────────────
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Denormalized company info — stored directly so we don't need to
    // populate employer just to show company name on job card
    company: {
      name: {
        type: String,
        required: [true, 'Company name is required']
      },
      logo: String,
      website: String,
      location: String
    },

    // ── Job Details ────────────────────────────────────────────────────────────
    location: {
      type: String,
      required: [true, 'Location is required']
    },

    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'],
      required: [true, 'Job type is required']
    },

    workMode: {
      type: String,
      enum: ['On-site', 'Remote', 'Hybrid'],
      default: 'On-site'
    },

    // ── Salary ─────────────────────────────────────────────────────────────────
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      period: {
        type: String,
        enum: ['monthly', 'yearly', 'hourly', 'fixed'],
        default: 'yearly'
      },
      isNegotiable: { type: Boolean, default: false },
      isDisclosed: { type: Boolean, default: true }
    },

    // ── Requirements ───────────────────────────────────────────────────────────
    experience: {
      min: { type: Number, default: 0 },   // years
      max: { type: Number, default: 5 }
    },

    education: {
      type: String,
      enum: [
        'No requirement',
        '10th Pass',
        '12th Pass',
        'Diploma',
        "Bachelor's",
        "Master's",
        'PhD'
      ],
      default: 'No requirement'
    },

    // Skills required for this job
    skillsRequired: [String],

    // ── Related Course ─────────────────────────────────────────────────────────
    // This is what makes SkillBridge unique — jobs linked to courses
    // "Complete this course → qualify for this job"
    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
    },

    // ── Application Settings ───────────────────────────────────────────────────
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required']
    },

    maxApplications: {
      type: Number,
      default: 100
    },

    totalApplications: {
      type: Number,
      default: 0
    },

    // ── Status ─────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['open', 'closed', 'draft'],
      default: 'open'
    },

    // ── Skill India Tag ────────────────────────────────────────────────────────
    skillIndiaScheme: {
      type: String,
      enum: ['PMKVY', 'DDUGKY', 'NAPS', 'STAR', 'None'],
      default: 'None'
    },

    // ── Perks ──────────────────────────────────────────────────────────────────
    perks: [String]   // ['Health insurance', 'Remote work', 'Stock options']
  },
  {
    timestamps: true
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
jobSchema.index({ title: 'text', description: 'text', skillsRequired: 'text' }, { default_language: 'none' })
jobSchema.index({ status: 1 })
jobSchema.index({ postedBy: 1 })
jobSchema.index({ 'company.location': 1 })
jobSchema.index({ jobType: 1 })
jobSchema.index({ applicationDeadline: 1 })

// ─── Virtual — is deadline passed ─────────────────────────────────────────────
jobSchema.virtual('isExpired').get(function () {
  return this.applicationDeadline < new Date()
})

// ─── Virtual — formatted salary ───────────────────────────────────────────────
jobSchema.virtual('salaryDisplay').get(function () {
  if (!this.salary.isDisclosed) return 'Not disclosed'
  if (this.salary.min === 0 && this.salary.max === 0) return 'Not specified'
  const format = (n) => n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`   // 1200000 → ₹12.0L
    : `₹${(n / 1000).toFixed(0)}K`     // 50000 → ₹50K
  return `${format(this.salary.min)} – ${format(this.salary.max)} per ${this.salary.period}`
})

jobSchema.set('toJSON', { virtuals: true })
jobSchema.set('toObject', { virtuals: true })

const Job = mongoose.model('Job', jobSchema)
export default Job