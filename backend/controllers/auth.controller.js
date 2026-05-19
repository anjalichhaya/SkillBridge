import User from '../models/User.model.js'
import sendToken from '../utils/sendToken.js'
import crypto from 'crypto'
import {
  sendPasswordResetEmail,
  sendWelcomeEmail
} from '../utils/sendEmail.js'

// ─── @desc    Register a new user
// ─── @route   POST /api/auth/register
// ─── @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    const user = await User.create({ name, email, password, role })

    // Send welcome email (non-blocking — don't fail registration if email fails)
    sendWelcomeEmail({ name, email, role: role || 'student' })
      .catch(err => console.error('Welcome email failed:', err.message))

    sendToken(user, 201, res, 'Registered successfully')
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Login user
// ─── @route   POST /api/auth/login
// ─── @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' })
    }

    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated. Contact support.' })
    }

    const isPasswordMatched = await user.comparePassword(password)
    if (!isPasswordMatched) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

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
  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true
  })
  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

// ─── @desc    Get currently logged in user
// ─── @route   GET /api/auth/me
// ─── @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    res.status(200).json({ success: true, user })
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

    const user = await User.findById(req.user.id).select('+password')
    const isMatched = await user.comparePassword(currentPassword)

    if (!isMatched) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' })
    }

    user.password = newPassword
    await user.save()

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
      return res.status(404).json({ success: false, message: 'No account found with this email address' })
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken()
    await user.save({ validateBeforeSave: false })

    // Build reset URL pointing to frontend reset page
    const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5500'
    const resetUrl = `${frontendUrl}/pages/reset-password.html?token=${resetToken}`

    console.log('🔗 Password reset URL:', resetUrl)  // keep for dev debugging

    // Send the actual email
    await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetUrl
    })

    res.status(200).json({
      success: true,
      message: `Password reset link sent to ${user.email}. Check your inbox (and spam folder).`
    })
  } catch (err) {
    // If email sending fails, clear the reset token so user can try again
    if (err.message?.includes('Email') || err.code === 'EAUTH' || err.code === 'ECONNREFUSED') {
      try {
        const user = await User.findOne({ email: req.body.email })
        if (user) {
          user.resetPasswordToken = undefined
          user.resetPasswordExpire = undefined
          await user.save({ validateBeforeSave: false })
        }
      } catch (e) {}

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please check your SMTP settings in .env file.',
        debug: process.env.NODE_ENV === 'development' ? err.message : undefined
      })
    }
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

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired. Please request a new one.'
      })
    }

    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    sendToken(user, 200, res, 'Password reset successfully')
  } catch (err) {
    next(err)
  }
}