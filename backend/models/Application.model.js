import mongoose from 'mongoose'

const applicationSchema = new mongoose.Schema(
  {
    // ── References ─────────────────────────────────────────────────────────────
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── Application Content ────────────────────────────────────────────────────
    coverLetter: {
      type: String,
      maxlength: [1000, 'Cover letter cannot exceed 1000 characters']
    },

    resume: {
      public_id: String,
      url: String
    },

    // Expected salary from applicant
    expectedSalary: {
      type: Number,
      default: 0
    },

    // ── Status Tracking ────────────────────────────────────────────────────────
    // This is the core of the application tracking system
    status: {
      type: String,
      enum: [
        'pending',    // just applied, employer hasn't seen it
        'reviewed',   // employer opened/viewed
        'shortlisted',// employer liked it
        'rejected',   // not selected
        'hired'       // got the job!
      ],
      default: 'pending'
    },

    // History of status changes — like a timeline
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now
        },
        note: String    // employer can add a note e.g. "Strong portfolio"
      }
    ],

    // ── Employer Notes ─────────────────────────────────────────────────────────
    employerNote: {
      type: String,
      maxlength: [500, 'Note cannot exceed 500 characters']
    },

    // ── SkillBridge Advantage ──────────────────────────────────────────────────
    // Certificates earned on SkillBridge relevant to this job
    attachedCertificates: [
      {
        courseTitle: String,
        certificateId: String,
        issuedAt: Date
      }
    ],

    // ── Screening ─────────────────────────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false   // has employer read this application?
    }
  },
  {
    timestamps: true
  }
)

// ── Compound index — one application per job per student ──────────────────────
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true })
applicationSchema.index({ applicant: 1 })
applicationSchema.index({ job: 1, status: 1 })

const Application = mongoose.model('Application', applicationSchema)
export default Application