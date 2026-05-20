// Core imports
import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import { verifyEmailConfig } from './utils/sendEmail.js'

await verifyEmailConfig()

// load .env
// This MUST happen before anything else, so process.env.PORT etc. are available
dotenv.config()

// DB connection
import connectDB from "./config/db.js"
import connectCloudinary from './config/cloudinary.js'
// import { verify } from "crypto"
// import { version } from "os"
connectDB()
connectCloudinary()


// App init
const app = express()

// middleware
// Middleware runs on EVERY request, before it hits your routes
app.use(helmet()) // automatically sets secure HTTP headers
app.use(morgan("dev")) // logs: GET /api/users 200 12ms

// app.use(cors({
//     origin: process.env.NODE_ENV === "development"
//         ? "https://skillbridge-india26.netlify.app", // VS Code Live Server default
//         "http://127.0.0.1:5500","http://localhost:5500"
//         : process.env.FRONTEND_URL,
//     credentials: true // allow cookies to be sent cross-origin
// }))
// const allowedOrigins =
//     process.env.NODE_ENV === "development"
//         ? [
//             "http://127.0.0.1:5500",
//             "http://localhost:5500"
//         ]
//         : ["https://skillbridge-india26.netlify.app"];

// app.use(cors({
//     origin: allowedOrigins,
//     credentials: true
// }));

app.set("trust proxy", 1)

const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://skillbridge-india26.netlify.app"
]

app.use(cors({
    origin: function (origin, callback) {

        // allow requests with no origin
        if (!origin) return callback(null, true)

        // allow localhost + production
        if (allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        // allow all netlify preview deploys
        if (origin.endsWith(".netlify.app")) {
            return callback(null, true)
        }

        return callback(new Error("Not allowed by CORS"))
    },
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 10 minutes"
    }
})
app.use("/api/", limiter)

// Routes
import authRoutes from "./routes/auth.routes.js"
app.use("/api/auth", authRoutes)

import courseRoutes from './routes/course.routes.js'
app.use('/api/courses', courseRoutes)

import enrollmentRoutes from './routes/enrollment.routes.js'
app.use('/api/enrollments', enrollmentRoutes)

import jobRoutes from './routes/job.routes.js'
import applicationRoutes from './routes/application.routes.js'

app.use('/api/jobs', jobRoutes)
app.use('/api/applications', applicationRoutes)

import userRoutes from './routes/user.routes.js'
app.use('/api/users', userRoutes)

import adminRoutes from './routes/admin.routes.js'
app.use('/api/admin', adminRoutes)

// Health Check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: '🚀 SkillBridge India API is running',
        version: "1.0.0",
        environment: process.env.NODE_ENV
    })
})

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    })
})

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    })
})

// Start server
const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
    console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
})

// Unhandled rejections
process.on("unhandledRejection", (err) => {
    console.error(`❌ Unhandled Rejection: ${err.message}`)
    server.close(() => process.exit(1))
})