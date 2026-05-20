import { Resend } from 'resend'

// ── Create Resend client ──────────────────────────────────────────────────────
// Resend uses HTTP API, not SMTP — works on ALL hosting platforms including Render free tier
const getClient = () => new Resend(process.env.RESEND_API_KEY)

// ── Is Resend configured? ─────────────────────────────────────────────────────
const isConfigured = () =>
  process.env.RESEND_API_KEY &&
  process.env.RESEND_API_KEY.startsWith('re_')

// ── Verify on startup ─────────────────────────────────────────────────────────
export const verifyEmailConfig = async () => {
  if (!isConfigured()) {
    console.log('⚠️  Resend API key not set — emails will be logged to console only')
    console.log('   Add RESEND_API_KEY to your environment variables')
    return false
  }
  console.log('✅ Resend email service configured')
  return true
}

// ── Main send function ────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  // If not configured, log to console so you can still see the link in dev
  if (!isConfigured()) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 EMAIL NOT SENT — RESEND_API_KEY not configured')
    console.log(`   To: ${to}`)
    console.log(`   Subject: ${subject}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    return null
  }

  const resend = getClient()
  const fromAddress = `${process.env.FROM_NAME || 'SkillBridge India'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [to],
    subject,
    html
  })

  if (error) {
    console.error('❌ Resend error:', error)
    throw new Error(error.message || 'Failed to send email via Resend')
  }

  console.log(`✅ Email sent → ${to} (id: ${data.id})`)
  return data
}

// ── HTML Email Wrapper ────────────────────────────────────────────────────────
const wrap = (body) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F3FA;-webkit-font-smoothing:antialiased}
.wrap{max-width:540px;margin:32px auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(13,27,62,0.08)}
.stripe{height:4px;display:flex}
.s1{flex:1;background:#FF6B00}.s2{flex:1;background:rgba(200,200,200,0.4)}.s3{flex:1;background:#138808}
.header{background:#0D1B3E;padding:24px 32px;text-align:center}
.logo{font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px}
.logo-accent{color:#FF6B00}
.body{padding:32px}
.title{font-size:22px;font-weight:700;color:#0D1B3E;margin-bottom:10px;line-height:1.3}
.text{font-size:14px;color:#5A6A85;line-height:1.75;margin-bottom:14px}
.btn{display:inline-block;padding:13px 28px;background:#FF6B00;color:#ffffff !important;text-decoration:none !important;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.2px}
.highlight{background:#FFF3EA;border-left:3px solid #FF6B00;border-radius:0 6px 6px 0;padding:12px 16px;margin:16px 0;font-size:13px;color:#0D1B3E}
.code{font-family:'Courier New',monospace;font-size:12px;background:#EEF2FA;padding:12px 16px;border-radius:6px;word-break:break-all;color:#1A2F5E;border:1px solid #DCE4F5;margin:10px 0}
.divider{height:1px;background:#E4E9F2;margin:20px 0}
.small{font-size:12px;color:#9AAABB;line-height:1.6}
.footer{background:#0D1B3E;padding:18px 32px;text-align:center}
.footer-brand{font-size:13px;font-weight:600;color:rgba(255,255,255,0.6)}
.footer-brand span{color:#FF6B00}
.footer-text{font-size:11px;color:rgba(255,255,255,0.28);margin-top:4px}
</style>
</head>
<body>
<div class="wrap">
  <div class="stripe"><div class="s1"></div><div class="s2"></div><div class="s3"></div></div>
  <div class="header"><div class="logo">Skill<span class="logo-accent">Bridge</span> India</div></div>
  <div class="body">${body}</div>
  <div class="footer">
    <div class="footer-brand">Skill<span>Bridge</span> India</div>
    <p class="footer-text">India's platform for skill development &amp; employment</p>
    <p class="footer-text" style="margin-top:3px">© ${new Date().getFullYear()} SkillBridge India. All rights reserved.</p>
  </div>
</div>
</body>
</html>`

// ── 1. Password Reset Email ───────────────────────────────────────────────────
export const sendPasswordResetEmail = async ({ name, email, resetUrl }) => {
  const html = wrap(`
    <div class="title">Reset your password 🔐</div>
    <p class="text">Hi <strong>${name}</strong>,</p>
    <p class="text">
      We received a request to reset the password for your SkillBridge account.
      Click the button below to choose a new password.
    </p>

    <div style="text-align:center;margin:28px 0">
      <a href="${resetUrl}" class="btn">Reset My Password →</a>
    </div>

    <div class="highlight">
      ⏰ <strong>This link expires in 15 minutes.</strong>
      If you don't reset within this time, you'll need to request a new link.
    </div>

    <p class="text">If the button doesn't work, copy and paste this link into your browser:</p>
    <div class="code">${resetUrl}</div>

    <div class="divider"></div>
    <p class="small">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will not change.
    </p>
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
    student: 'Start browsing courses, earn certificates, and apply for jobs.',
    instructor: 'Create your first course and start inspiring learners across India.',
    employer: 'Post jobs and connect with certified, skilled candidates.',
    admin: 'Your admin account is ready. Manage the platform from your dashboard.'
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:5500').replace(/\/$/, '')

  const html = wrap(`
    <div class="title">Welcome to SkillBridge! 🎉</div>
    <p class="text">Hi <strong>${name}</strong>,</p>
    <p class="text">Your account has been created successfully. You're now part of India's growing skill development platform.</p>

    <div class="highlight">
      <strong>Your role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}<br/>
      <span style="color:#5A6A85;font-size:13px;margin-top:3px;display:block">
        ${roleMessages[role] || 'Welcome aboard!'}
      </span>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${frontendUrl}/pages/login.html" class="btn">Go to My Dashboard →</a>
    </div>

    <div class="divider"></div>
    <p class="small">
      If you didn't create this account, please contact us at support@skillbridge.in immediately.
    </p>
  `)

  return sendEmail({
    to: email,
    subject: '🎉 Welcome to SkillBridge India!',
    html
  })
}

// ── 3. Certificate Issued Email ───────────────────────────────────────────────
export const sendCertificateEmail = async ({ name, email, courseName, certificateId }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:5500').replace(/\/$/, '')

  const html = wrap(`
    <div class="title">Your certificate is ready! 🎓</div>
    <p class="text">Congratulations <strong>${name}</strong>!</p>
    <p class="text">
      You've successfully completed <strong>${courseName}</strong> on SkillBridge India.
      Your verified certificate has been issued.
    </p>

    <div style="background:linear-gradient(135deg,#0D1B3E,#1A2F5E);border-radius:10px;padding:22px;text-align:center;margin:20px 0">
      <div style="font-size:32px;margin-bottom:10px">🏆</div>
      <div style="font-size:15px;font-weight:600;color:#ffffff;margin-bottom:5px">${courseName}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.45);font-family:monospace">${certificateId}</div>
    </div>

    <div style="text-align:center;margin:20px 0">
      <a href="${frontendUrl}/pages/student-dashboard.html" class="btn">Download Certificate →</a>
    </div>

    <div class="divider"></div>
    <p class="small">
      Your Certificate ID <strong>${certificateId}</strong> can be independently verified
      by any employer on the SkillBridge platform.
    </p>
  `)

  return sendEmail({
    to: email,
    subject: `🎓 Your SkillBridge Certificate — ${courseName}`,
    html
  })
}

export default sendEmail