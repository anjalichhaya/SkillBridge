import nodemailer from 'nodemailer'

// ── Create transporter ────────────────────────────────────────────────────────
// A "transporter" is the connection to your email server.
// We use Gmail SMTP with App Password (not your regular Gmail password).

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,       // smtp.gmail.com
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,                     // true for port 465, false for 587
    auth: {
      user: process.env.SMTP_EMAIL,    // your Gmail address
      pass: process.env.SMTP_PASSWORD  // Gmail App Password (NOT your login password)
    },
    tls: {
      rejectUnauthorized: false        // allow self-signed certs in dev
    }
  })
}

// ── Main send function ────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'SkillBridge India'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '') // plain text fallback
  }

  const info = await transporter.sendMail(mailOptions)
  console.log(`✅ Email sent to ${to} — Message ID: ${info.messageId}`)
  return info
}

// ── Email Templates ───────────────────────────────────────────────────────────

// Shared header/footer for all emails
const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #F0F3FA; color: #0D1B3E; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(13,27,62,0.08); }
    .header { background: #0D1B3E; padding: 28px 32px; text-align: center; position: relative; }
    .header-stripe { height: 4px; display: flex; }
    .s1 { flex: 1; background: #FF6B00; }
    .s2 { flex: 1; background: rgba(255,255,255,0.3); }
    .s3 { flex: 1; background: #138808; }
    .logo { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
    .logo span { color: #FF6B00; }
    .body { padding: 32px; }
    .title { font-size: 22px; font-weight: 700; color: #0D1B3E; margin-bottom: 10px; }
    .text { font-size: 14px; color: #5A6A85; line-height: 1.7; margin-bottom: 16px; }
    .btn { display: inline-block; padding: 13px 28px; background: #FF6B00; color: #fff !important; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 8px 0 16px; }
    .divider { height: 1px; background: #E4E9F2; margin: 20px 0; }
    .small { font-size: 12px; color: #9AAABB; line-height: 1.6; }
    .footer { background: #0D1B3E; padding: 20px 32px; text-align: center; }
    .footer p { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }
    .footer-brand { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); }
    .footer-brand span { color: #FF6B00; }
    .highlight-box { background: #FFF3EA; border-left: 3px solid #FF6B00; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #0D1B3E; }
    .token { font-family: monospace; font-size: 13px; background: #EEF2FA; padding: 8px 12px; border-radius: 6px; word-break: break-all; color: #1A2F5E; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header-stripe"><div class="s1"></div><div class="s2"></div><div class="s3"></div></div>
    <div class="header">
      <div class="logo">Skill<span>Bridge</span> India</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <div class="footer-brand">Skill<span>Bridge</span> India</div>
      <p>India's platform for skill development & employment</p>
      <p style="margin-top:6px">© ${new Date().getFullYear()} SkillBridge India. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

// ── 1. Forgot Password Email ──────────────────────────────────────────────────
export const sendPasswordResetEmail = async ({ name, email, resetUrl }) => {
  const html = emailWrapper(`
    <div class="title">Reset your password 🔐</div>
    <p class="text">Hi <strong>${name}</strong>,</p>
    <p class="text">We received a request to reset your SkillBridge password. Click the button below to choose a new password.</p>

    <div style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" class="btn">Reset My Password</a>
    </div>

    <div class="divider"></div>

    <div class="highlight-box">
      ⏰ <strong>This link expires in 15 minutes.</strong> If you don't reset your password within this time, you'll need to request a new link.
    </div>

    <p class="text">If the button above doesn't work, copy and paste this URL into your browser:</p>
    <div class="token">${resetUrl}</div>

    <div class="divider"></div>
    <p class="small">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
  `)

  return sendEmail({
    to: email,
    subject: '🔐 Reset your SkillBridge password',
    html
  })
}

// ── 2. Welcome Email ──────────────────────────────────────────────────────────
export const sendWelcomeEmail = async ({ name, email, role }) => {
  const roleMessages = {
    student: 'Start browsing courses, track your progress, and earn certifications.',
    instructor: 'Create your first course and start inspiring thousands of learners.',
    employer: 'Post your first job and connect with skilled, certified candidates.',
    admin: 'Your admin account is ready. Manage the platform from your dashboard.'
  }
  const dashboardUrls = {
    student: `${process.env.FRONTEND_URL}/pages/student-dashboard.html`,
    instructor: `${process.env.FRONTEND_URL}/pages/instructor-dashboard.html`,
    employer: `${process.env.FRONTEND_URL}/pages/employer-dashboard.html`,
    admin: `${process.env.FRONTEND_URL}/pages/admin-dashboard.html`,
  }

  const html = emailWrapper(`
    <div class="title">Welcome to SkillBridge! 🎉</div>
    <p class="text">Hi <strong>${name}</strong>,</p>
    <p class="text">Your account has been created successfully. You're now part of India's growing skill development platform.</p>

    <div class="highlight-box">
      <strong>Your role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}<br/>
      <span style="color:#5A6A85;font-size:13px">${roleMessages[role] || 'Welcome aboard!'}</span>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${dashboardUrls[role] || process.env.FRONTEND_URL + '/pages/login.html'}" class="btn">Go to My Dashboard →</a>
    </div>

    <div class="divider"></div>
    <p class="small">If you didn't create this account, please contact us immediately at support@skillbridge.in</p>
  `)

  return sendEmail({
    to: email,
    subject: '🎉 Welcome to SkillBridge India!',
    html
  })
}

// ── 3. Certificate Issued Email ───────────────────────────────────────────────
export const sendCertificateEmail = async ({ name, email, courseName, certificateId }) => {
  const html = emailWrapper(`
    <div class="title">Your certificate is ready! 🎓</div>
    <p class="text">Congratulations <strong>${name}</strong>!</p>
    <p class="text">You've successfully completed <strong>${courseName}</strong> on SkillBridge India. Your verified certificate has been issued.</p>

    <div style="background:linear-gradient(135deg,#0D1B3E,#1A2F5E);border-radius:10px;padding:20px;text-align:center;margin:20px 0">
      <div style="font-size:28px;margin-bottom:8px">🏆</div>
      <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px">${courseName}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);font-family:monospace">${certificateId}</div>
    </div>

    <div style="text-align:center;margin:20px 0">
      <a href="${process.env.FRONTEND_URL}/pages/student-dashboard.html" class="btn">Download Certificate →</a>
    </div>

    <div class="divider"></div>
    <p class="small">Share your certificate with employers on LinkedIn and job applications. Your Certificate ID <strong>${certificateId}</strong> can be independently verified by any employer on the SkillBridge platform.</p>
  `)

  return sendEmail({
    to: email,
    subject: `🎓 Your SkillBridge Certificate — ${courseName}`,
    html
  })
}

// ── 4. Application Status Update Email ───────────────────────────────────────
export const sendApplicationStatusEmail = async ({ name, email, jobTitle, company, status, note }) => {
  const statusConfig = {
    reviewed:    { emoji: '👁',  color: '#0891B2', text: 'Your application has been reviewed' },
    shortlisted: { emoji: '⭐', color: '#FF6B00', text: 'Great news — you\'ve been shortlisted!' },
    rejected:    { emoji: '📋', color: '#DC2626', text: 'Application status update' },
    hired:       { emoji: '🎉', color: '#138808', text: 'Congratulations — you\'re hired!' },
  }
  const config = statusConfig[status] || { emoji: '📋', color: '#5A6A85', text: 'Application update' }

  const html = emailWrapper(`
    <div class="title">${config.emoji} ${config.text}</div>
    <p class="text">Hi <strong>${name}</strong>,</p>
    <p class="text">There's an update on your application for <strong>${jobTitle}</strong> at <strong>${company}</strong>.</p>

    <div style="background:${config.color}15;border-left:3px solid ${config.color};border-radius:6px;padding:14px 18px;margin:20px 0">
      <div style="font-size:13px;font-weight:700;color:${config.color};text-transform:capitalize">Status: ${status}</div>
      ${note ? `<div style="font-size:13px;color:#5A6A85;margin-top:6px">${note}</div>` : ''}
    </div>

    <div style="text-align:center;margin:20px 0">
      <a href="${process.env.FRONTEND_URL}/pages/student-dashboard.html" class="btn">View My Applications →</a>
    </div>

    <div class="divider"></div>
    <p class="small">Keep your SkillBridge profile updated with new skills and certificates to improve your chances.</p>
  `)

  return sendEmail({
    to: email,
    subject: `${config.emoji} Application update: ${jobTitle} at ${company}`,
    html
  })
}

export default sendEmail