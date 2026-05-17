import User from '../models/User.model.js'
import sendToken from '../utils/sendToken.js'
import crypto from 'crypto'

// ─── @desc    Register a new user
// ─── @route   POST /api/auth/register
// ─── @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      })
    }

    // Create user — password gets hashed automatically via our pre-save hook
    const user = await User.create({ name, email, password, role })

    // Send token — 201 means "Created"
    sendToken(user, 201, res, 'Registered successfully')

  } catch (err) {
    next(err)  // passes error to our global error handler in server.js
  }
}

// ─── @desc    Login user
// ─── @route   POST /api/auth/login
// ─── @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      })
    }

    // Find user by email — explicitly select password (it's hidden by default)
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'  // intentionally vague for security
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.'
      })
    }

    // Compare passwords using our instance method
    const isPasswordMatched = await user.comparePassword(password)

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Update last login time
    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })

    sendToken(user, 200, res, 'Logged in successfully')

  } catch (err) {
    next(err)
  }
}

// ─── @desc    Logout user
// ─── @route   GET /api/auth/logout
// ─── @access  Private
export const logout = (req, res) => {
  // Clear the cookie by setting it to expire immediately
  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true
  })

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  })
}

// ─── @desc    Get currently logged in user
// ─── @route   GET /api/auth/me
// ─── @access  Private
export const getMe = async (req, res, next) => {
  try {
    // req.user is set by our auth middleware (we'll build that next)
    const user = await User.findById(req.user.id)

    res.status(200).json({
      success: true,
      user
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Update password
// ─── @route   PUT /api/auth/password/update
// ─── @access  Private
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Get user WITH password
    const user = await User.findById(req.user.id).select('+password')

    const isMatched = await user.comparePassword(currentPassword)
    if (!isMatched) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    user.password = newPassword
    await user.save()  // pre-save hook will hash the new password

    sendToken(user, 200, res, 'Password updated successfully')
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Forgot password — send reset email
// ─── @route   POST /api/auth/password/forgot
// ─── @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      })
    }

    // Get reset token (also saves hashed version + expiry to DB)
    const resetToken = user.getResetPasswordToken()
    await user.save({ validateBeforeSave: false })

    // Build reset URL — this goes in the email
    const resetUrl = `${process.env.FRONTEND_URL}/pages/reset-password.html?token=${resetToken}`

    // TODO: send email — we'll wire up nodemailer in a later step
    console.log('Reset URL (temp):', resetUrl)

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email',
      resetUrl  // remove this in production — only for dev testing
    })
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Reset password using token
// ─── @route   PUT /api/auth/password/reset/:token
// ─── @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    // Hash the token from URL to compare with DB
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex')

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }  // $gt = greater than
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired'
      })
    }

    // Set new password and clear reset fields
    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save()

    sendToken(user, 200, res, 'Password reset successfully')
  } catch (err) {
    next(err)
  }
}