// This utility does 3 things:
// 1. Generates a JWT token for the user
// 2. Stores it in a secure HTTP-only cookie
// 3. Sends the response with user data

const sendToken = (user, statusCode, res, message) => {
  // Call the instance method we defined on the User model
  const token = user.getJWTToken()

  // Cookie options
  const cookieOptions = {
    // Convert JWT_COOKIE_EXPIRE days to milliseconds
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),

    // httpOnly: true means JavaScript CANNOT access this cookie
    // This protects against XSS attacks — malicious scripts can't steal the token
    httpOnly: true,

    // secure: true means cookie only sent over HTTPS
    // We only enable this in production (dev uses HTTP)
    secure: process.env.NODE_ENV === 'production',

    // sameSite prevents CSRF attacks
    sameSite: 'strict'
  }

  // Remove password from output even if it was selected
  user.password = undefined

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)  // set the cookie
    .json({
      success: true,
      message,
      token,   // also send in response body (useful for mobile apps / testing)
      user
    })
}

export default sendToken