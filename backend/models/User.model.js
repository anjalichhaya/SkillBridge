import mongoose from "mongoose";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

// ─── Schema Definition ────────────────────────────────────────────────────────
// A schema is the BLUEPRINT of your document — it defines what fields exist,
// their types, validation rules, and default values.

const userSchema = new mongoose.Schema(
    // basic info
    {
        name: {
            type: String,
            required: [true, "Name is required"], // [rule, error msg]
            trim: true, // removes leading/trailing spaces
            maxlength: [50, "Name cannot exceed 50 characters"]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true, // no two users can have the same email
            lowercase: true, // always stores as lowercase
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please enter a valid email'
            ]
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false // IMPORTANT: password never comes back in queries by default
        },

        role: {
            type: String,
            enum: ['student', 'instructor', 'employer', 'admin'],  // only these 4 values allowed
            default: 'student'
        },

        // Profile
        avatar: {
            public_id: String, // Cloudinary's ID for the image (needed to delete it)
            url: String          // the actual image URL
        },

        phone: {
            type: String,
            match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
        },

        bio: {
            type: String,
            maxlength: [500, 'Bio cannot exceed 500 characters']
        },

        // Student specific fields
        skills: [String], // ['JavaScript', 'React', 'Node.js']

        education: [
            {
                degree: String,
                institution: String,
                year: Number
            }
        ],

        resume: {
            public_id: String,
            url: String
        },

        // Instructor specific fields
        expertise: [String], // ['Web Development', 'Data Science']

        experience: {
            type: Number,             // years of experience
            default: 0
        },

        // Employer specifc fields
        company: {
            name: String,
            website: String,
            logo: {
                public_id: String,
                url: String
            },
            description: String,
            location: String
        },

        // Account Status
        isEmailVerified: {
            type: Boolean,
            default: false
        },

        isActive: {
            type: Boolean,
            default: true
        },

        // Password Reset
        // These fields are only populated when user requests a password reset
        resetPasswordToken: String,
        resetPasswordExpire: Date,

        // Email verification
        emailVerificationToken: String,
        emailVerificationExpire: Date,

        // Tracking
        lastLogin: Date
    },

    {
        // Second argument to schema is options
        timestamps: true // automatically adds createdAt and updatedAt fields
    }
)

// ─── Mongoose Middleware (Hooks) ──────────────────────────────────────────────
// These are functions that run automatically BEFORE or AFTER certain operations.

// BEFORE saving a document, hash the password if it was modified
userSchema.pre("save", async function () {
    // 'this' refers to the current document being saved

    // Handle lastLogin for new documents
    if (this.isNew) {
        this.lastLogin = new Date()
    }

    // If password wasn't changed, skip hashing (important for profile updates)
    if(!this.isModified("password")) return

    // bcrypt.genSalt(10) creates a "salt" — random data added to password before hashing
    // 10 is the "cost factor" — higher = more secure but slower (10 is the sweet spot)
    const salt = await bcrypt.genSalt(10)

    // hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt)
})

// ─── Instance Methods ─────────────────────────────────────────────────────────
// These are functions available on EVERY user document instance
// e.g. const user = await User.findById(id) → user.comparePassword(...)

// Compare entered password with hashed password in DB
userSchema.methods.comparePassword = async function (enteredPassword) {
  // bcrypt.compare hashes enteredPassword the same way and checks if they match
  // We need .select('+password') when querying if we want to use this
  return await bcrypt.compare(enteredPassword, this.password)
}

// Generate JWT token for this user
userSchema.methods.getJWTToken = function () {
  return jwt.sign(
    // PAYLOAD — data encoded inside the token (don't put sensitive data here)
    { id: this._id, role: this.role },

    // SECRET — used to sign the token (only our server knows this)
    process.env.JWT_SECRET,

    // OPTIONS
    { expiresIn: process.env.JWT_EXPIRE }  // token expires in 7d
  )
}

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate a random 20-byte hex string
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Hash it before saving to DB (so even if DB is breached, token is useless)
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // Token expires in 15 minutes
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000

  // Return the UNHASHED token (this goes in the email link)
  return resetToken
}

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString('hex')

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex')

  // Token expires in 24 hours
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000

  return verificationToken
}

// ─── Export ───────────────────────────────────────────────────────────────────
// mongoose.model('User', userSchema) creates the model
// 'User' → MongoDB collection will be named 'users' (auto-pluralized, lowercased)
const User = mongoose.model('User', userSchema)

export default User