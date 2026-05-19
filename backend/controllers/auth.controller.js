import User from '../models/User.model.js'
import sendToken from '../utils/sendToken.js'
import crypto from 'crypto'
import {
  sendPasswordResetEmail,
  sendWelcomeEmail
} from '../utils/sendEmail.js'

// ─── @desc    Register
// ─── @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    const user = await User.create({ name, email, password, role })

    // Non-blocking welcome email
    sendWelcomeEmail({ name, email, role: role || 'student' })
      .catch(err => console.error('Welcome email failed:', err.message))

    sendToken(user, 201, res, 'Registered successfully')
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Login
// ─── @route   POST /api/auth/login
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
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })
    sendToken(user, 200, res, 'Logged in successfully')
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Logout
// ─── @route   GET /api/auth/logout
export const logout = (req, res) => {
  res.cookie('token', null, { expires: new Date(Date.now()), httpOnly: true })
  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

// ─── @desc    Get me
// ─── @route   GET /api/auth/me
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
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id).select('+password')
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' })
    }
    user.password = newPassword
    await user.save()
    sendToken(user, 200, res, 'Password updated successfully')
  } catch (err) {
    next(err)
  }
}

// ─── @desc    Forgot password
// ─── @route   POST /api/auth/password/forgot
// ─── KEY FIX: never returns success:true if email actually failed
export const forgotPassword = async (req, res, next) => {
  let savedUser = null

  try {
    const user = await User.findOne({ email: req.body.email })

    if (!user) {
      // Security: return same message so attackers can't enumerate emails
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.'
      })
    }

    // Generate reset token and save hashed version to DB
    const resetToken = user.getResetPasswordToken()
    await user.save({ validateBeforeSave: false })
    savedUser = user  // keep ref for cleanup if email fails

    // Build the reset URL
    const frontendUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:5500').replace(/\/$/, '')
    const resetUrl = `${frontendUrl}/pages/reset-password.html?token=${resetToken}`

    // Always log to console for debugging (visible in Render logs)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔗 PASSWORD RESET LINK (for debugging):')
    console.log(resetUrl)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Try sending the email — AWAIT it so we catch real failures
    await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetUrl
    })

    // Only reaches here if email sent successfully
    return res.status(200).json({
      success: true,
      message: `Reset link sent to ${user.email}. Please check your inbox and spam folder.`
    })

  } catch (err) {
    // Email failed — clean up the reset token so user can try again
    if (savedUser) {
      try {
        savedUser.resetPasswordToken = undefined
        savedUser.resetPasswordExpire = undefined
        await savedUser.save({ validateBeforeSave: false })
      } catch (cleanupErr) {
        console.error('Token cleanup failed:', cleanupErr.message)
      }
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ FORGOT PASSWORD ERROR:', err.message)
    console.error('   Code:', err.code)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Give a clear error message based on what went wrong
    let message = 'Failed to send email. '
    if (err.code === 'EAUTH') {
      message += 'Gmail authentication failed. Check SMTP_PASSWORD in your environment variables.'
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      message += 'Could not connect to email server. Check SMTP settings.'
    } else if (!process.env.SMTP_EMAIL || process.env.SMTP_EMAIL.includes('your_gmail')) {
      message += 'Email not configured. Set SMTP_EMAIL and SMTP_PASSWORD in environment variables.'
    } else {
      message += err.message
    }

    return res.status(500).json({
      success: false,
      message,
      // Only show technical details in development
      ...(process.env.NODE_ENV === 'development' && { debug: err.message, code: err.code })
    })
  }
}

// ─── @desc    Reset password
// ─── @route   PUT /api/auth/password/reset/:token
export const resetPassword = async (req, res, next) => {
  try {
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
        message: 'Reset link is invalid or has expired. Please request a new one.'
      })
    }

    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    console.log(`✅ Password reset for: ${user.email}`)
    sendToken(user, 200, res, 'Password reset successfully. You are now logged in.')
  } catch (err) {
    next(err)
  }
}