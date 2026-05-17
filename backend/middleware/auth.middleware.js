import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

// ─── Protect routes — must be logged in ──────────────────────────────────────
export const isAuthenticated = async (req, res, next) => {
  let token

  // Check cookie first, then Authorization header (for API clients / mobile)
  if (req.cookies.token) {
    token = req.cookies.token
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // "Bearer eyJhbGci..." → split on space → take index 1
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Please login to access this resource'
    })
  }

  try {
    // jwt.verify decodes AND validates the token using our secret
    // If token is expired or tampered with, it throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // decoded = { id: '...', role: 'student', iat: ..., exp: ... }
    // Attach the full user object to req so controllers can use it
    req.user = await User.findById(decoded.id)

    next()
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or has expired. Please login again.'
    })
  }
}

// ─── Authorize roles — must have the right role ───────────────────────────────
// This is a HOF (Higher Order Function) — it returns a middleware function
// Usage: authorizeRoles('admin', 'instructor')
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // req.user is set by isAuthenticated above
    // Check if user's role is in the allowed roles array
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not allowed to access this resource`
      })
    }
    next()
  }
}