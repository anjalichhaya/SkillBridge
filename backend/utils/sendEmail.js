import nodemailer from 'nodemailer'


console.log("SMTP EMAIL:", process.env.SMTP_EMAIL)
console.log("SMTP PASSWORD EXISTS:", !!process.env.SMTP_PASSWORD)
// ── Is email configured? ──────────────────────────────────────────────────────
const isConfigured = () => {
  return (
    process.env.SMTP_EMAIL &&
    process.env.SMTP_PASSWORD &&
    !process.env.SMTP_EMAIL.includes('your_gmail') &&
    !process.env.SMTP_PASSWORD.includes('your_gmail')
  )
}

// ── Create transporter ────────────────────────────────────────────────────────
// Using 'service: gmail' instead of host/port — this works on Render
// because it handles SSL/TLS internally without being blocked
// const createTransporter = () => {
//   return nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.SMTP_EMAIL,
//       pass: process.env.SMTP_PASSWORD  // 16-char Gmail App Password, no spaces
//     }
//   })
// }
// const createTransporter = () => {
//   return nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 587,
//     secure: false,
//     family: 4,

//     auth: {
//       user: process.env.SMTP_EMAIL,
//       pass: process.env.SMTP_PASSWORD
//     },

//     connectionTimeout: 10000,
//     greetingTimeout: 10000,
//     socketTimeout: 10000,

//     tls: {
//       rejectUnauthorized: false
//     }
//   })
// }
// const createTransporter = () => {
//   return nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     secure: false,

//     auth: {
//       user: process.env.SMTP_EMAIL,
//       pass: process.env.SMTP_PASSWORD
//     }
//   })
// }
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465,
    secure: true,

    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  })
}

// ── Verify on startup ─────────────────────────────────────────────────────────
export const verifyEmailConfig = async () => {
  if (!isConfigured()) {
    console.log('⚠️  Email not configured — password reset emails will log to console instead')
    return false
  }
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log(`✅ Email service ready: ${process.env.SMTP_EMAIL}`)
    return true
  } catch (err) {
    console.error(`❌ Email config error: ${err.message}`)
    return false
  }
  console.log(process.env.SMTP_EMAIL)
  console.log(process.env.SMTP_PASSWORD ? "PASSWORD EXISTS" : "NO PASSWORD")
}

// ── Main send function ────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  if (!isConfigured()) {
    // Log to console in dev so you can still test without real email
    console.log(`\n📧 EMAIL (not sent — configure SMTP_EMAIL & SMTP_PASSWORD in .env)`)
    console.log(`   To: ${to}`)
    console.log(`   Subject: ${subject}\n`)
    return null
  }

//   const transporter = createTransporter()
// //   const info = await transporter.sendMail({
// //     from: `"${process.env.FROM_NAME || 'SkillBridge India'}" <${process.env.SMTP_EMAIL}>`,
// //     to,
// //     subject,
// //     html,
// //     text: text || html.replace(/<[^>]*>/g, '')
// //   })
// console.log("📨 Attempting to send email...")
    const transporter = createTransporter()

    try {
    console.log("📨 Attempting to send email...")

    const info = await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'SkillBridge India'}" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
    })

    console.log("✅ Email successfully sent")
    console.log(info)

    return info

    } catch (err) {
    console.error("❌ NODEMAILER ERROR:")
    console.error(err)
    throw err
    }
}

// const info = await transporter.sendMail({
//     from: `"${process.env.FROM_NAME || 'SkillBridge India'}" <${process.env.SMTP_EMAIL}>`,
//     to,
//     subject,
//     html,
//     text: text || html.replace(/<[^>]*>/g, '')
// })

// console.log("✅ Email successfully sent")

//   console.log(`✅ Email sent → ${to} (${info.messageId})`)
//   return info
// }

// ── Email template wrapper ────────────────────────────────────────────────────
const wrap = (body) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F3FA}
.w{max-width:540px;margin:28px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(13,27,62,0.08)}
.stripe{height:4px;display:flex}.s1{flex:1;background:#FF6B00}.s2{flex:1;background:rgba(255,255,255,0.3)}.s3{flex:1;background:#138808}
.hd{background:#0D1B3E;padding:22px 32px;text-align:center}
.logo{font-size:19px;font-weight:700;color:#fff}.logo span{color:#FF6B00}
.bd{padding:30px 32px}
.title{font-size:21px;font-weight:700;color:#0D1B3E;margin-bottom:10px}
.txt{font-size:14px;color:#5A6A85;line-height:1.7;margin-bottom:14px}
.btn{display:inline-block;padding:12px 26px;background:#FF6B00;color:#fff!important;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin:8px 0 14px}
.box{background:#FFF3EA;border-left:3px solid #FF6B00;border-radius:6px;padding:11px 15px;margin:14px 0;font-size:13px;color:#0D1B3E}
.code{font-family:monospace;font-size:12px;background:#EEF2FA;padding:10px 14px;border-radius:6px;word-break:break-all;color:#1A2F5E;margin:10px 0}
.hr{height:1px;background:#E4E9F2;margin:18px 0}
.sm{font-size:12px;color:#9AAABB;line-height:1.6}
.ft{background:#0D1B3E;padding:16px 32px;text-align:center}
.ft p{font-size:11px;color:rgba(255,255,255,0.3);margin-top:3px}
.fb{font-size:13px;font-weight:600;color:rgba(255,255,255,0.55)}.fb span{color:#FF6B00}
</style></head>
<body><div class="w">
<div class="stripe"><div class="s1"></div><div class="s2"></div><div class="s3"></div></div>
<div class="hd"><div class="logo">Skill<span>Bridge</span> India</div></div>
<div class="bd">${body}</div>
<div class="ft"><div class="fb">Skill<span>Bridge</span> India</div>
<p>India's platform for skill development &amp; employment</p>
<p>© ${new Date().getFullYear()} SkillBridge India</p></div>
</div></body></html>`

// ── 1. Password reset ─────────────────────────────────────────────────────────
export const sendPasswordResetEmail = async ({ name, email, resetUrl }) => {
  const html = wrap(`
    <div class="title">Reset your password 🔐</div>
    <p class="txt">Hi <strong>${name}</strong>,</p>
    <p class="txt">We received a request to reset your SkillBridge password. Click below to set a new one.</p>
    <div style="text-align:center;margin:22px 0">
      <a href="${resetUrl}" class="btn">Reset My Password →</a>
    </div>
    <div class="box">⏰ <strong>This link expires in 15 minutes.</strong></div>
    <p class="txt">Or copy this link into your browser:</p>
    <div class="code">${resetUrl}</div>
    <div class="hr"></div>
    <p class="sm">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
  `)
  return sendEmail({ to: email, subject: '🔐 Reset your SkillBridge password', html })
}

// ── 2. Welcome email ──────────────────────────────────────────────────────────
export const sendWelcomeEmail = async ({ name, email, role }) => {
  const msgs = {
    student: 'Browse courses, earn certificates, and apply for jobs.',
    instructor: 'Create your first course and inspire learners across India.',
    employer: 'Post jobs and connect with certified, skilled candidates.',
    admin: 'Your admin account is ready to manage the platform.'
  }
  const frontendUrl = process.env.FRONTEND_URL || 'https://skillbridge-india26.netlify.app'
  const html = wrap(`
    <div class="title">Welcome to SkillBridge! 🎉</div>
    <p class="txt">Hi <strong>${name}</strong>, your account is ready.</p>
    <div class="box">
      <strong>Your role:</strong> ${role.charAt(0).toUpperCase()+role.slice(1)}<br/>
      <span style="color:#5A6A85;font-size:13px">${msgs[role]||'Welcome aboard!'}</span>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="${frontendUrl}/pages/login.html" class="btn">Go to Dashboard →</a>
    </div>
    <div class="hr"></div>
    <p class="sm">If you didn't create this account, contact us at support@skillbridge.in</p>
  `)
  return sendEmail({ to: email, subject: '🎉 Welcome to SkillBridge India!', html })
}

// ── 3. Certificate issued ─────────────────────────────────────────────────────
export const sendCertificateEmail = async ({ name, email, courseName, certificateId }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://skillbridge-india26.netlify.app'
  const html = wrap(`
    <div class="title">Your certificate is ready! 🎓</div>
    <p class="txt">Congratulations <strong>${name}</strong>! You completed <strong>${courseName}</strong>.</p>
    <div style="background:linear-gradient(135deg,#0D1B3E,#1A2F5E);border-radius:10px;padding:18px;text-align:center;margin:18px 0">
      <div style="font-size:26px;margin-bottom:6px">🏆</div>
      <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:3px">${courseName}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.45);font-family:monospace">${certificateId}</div>
    </div>
    <div style="text-align:center;margin:16px 0">
      <a href="${frontendUrl}/pages/student-dashboard.html" class="btn">Download Certificate →</a>
    </div>
    <div class="hr"></div>
    <p class="sm">Certificate ID <strong>${certificateId}</strong> can be verified by any employer on SkillBridge.</p>
  `)
  return sendEmail({ to: email, subject: `🎓 Your SkillBridge Certificate — ${courseName}`, html })
}

export default sendEmail