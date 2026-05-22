# 🇮🇳 SkillBridge India

SkillBridge India is a full-stack skill development and job-ready platform designed to connect **students, instructors, employers, and admins** in one ecosystem.

It allows users to learn skills, enroll in courses, earn certifications, and apply for jobs — all through a secure role-based system.

---
## 🌐 Deployment Link

👉 Frontend: https://skillbridge-india26.netlify.app  
👉 Backend: https://skillbridge-india.onrender.com  

## 💡 Project Overview

SkillBridge India is built to solve the gap between **learning and employment** by providing:

- Structured skill-based learning
- Course enrollment system
- Certification generation
- Job application system
- Role-based dashboards

---

## 🧱 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | HTML, Tailwind CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| File Uploads | Multer |
| Deployment | Render (Backend), Netlify (Frontend) |

---

## 👥 User Roles

### 🎓 Student
- Browse courses
- Enroll in courses
- Track progress
- Download certificates
- Apply for jobs

### 👨‍🏫 Instructor
- Create courses
- Manage content
- Track student enrollments

### 🏢 Employer
- Post job openings
- View applicants
- Manage applications

### 🛠 Admin
- Full system control
- Manage users, courses, jobs
- View platform analytics

---

## 📦 Features

### 🔐 Authentication System
- User registration & login
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing using bcrypt

---

### 📚 Courses Module
- Create / Read / Update / Delete courses
- Category-based filtering (Tech, Finance, Healthcare, etc.)
- Course enrollment system
- Progress tracking system

---

### 🏆 Certification System
- Auto-generate certificates after completion
- Unique certificate ID generation
- Certificate verification support

---

### 💼 Jobs Module
- Employers can post jobs
- Students can apply with resume upload
- Application tracking:
  - Pending → Reviewed → Accepted/Rejected

---

### 📊 Dashboards (Role-Based)
- Student Dashboard → courses, progress, certificates, applications
- Instructor Dashboard → courses & students
- Employer Dashboard → job posts & applicants
- Admin Dashboard → full system control

---

## 📁 Project Structure
```
skillbridge-india/
├── backend/
│ ├── config/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ ├── utils/
│ └── server.js
├── frontend/
│ ├── index.html 
│ └── pages/
└── README.md
```


---

## 🗄️ Database Design

- Users Collection (students, instructors, employers, admins)
- Courses Collection
- Enrollments Collection
- Jobs Collection
- Applications Collection
- Certificates Collection

---

## 🔄 API Flow

1. Frontend sends request (Login / Signup / Data fetch)
2. Backend validates request
3. Middleware checks authentication (JWT)
4. Controller processes logic
5. MongoDB stores/retrieves data
6. Response sent back to frontend

---

## 🧪 Key Backend Concepts Used

- REST API Development
- JWT Authentication
- Middleware (Auth + Role Guard)
- MVC Architecture
- File Upload Handling (Multer)
- Secure Password Hashing (bcrypt)

---

## 🛣️ Development Roadmap

We will build the project in this order:

1. Project setup (Node.js + folder structure)
2. MongoDB connection
3. User authentication system
4. Middleware (auth & role protection)
5. Courses module (CRUD)
6. Enrollment & progress tracking
7. Certification module
8. Jobs module
9. File uploads (resume/profile images)
10. Frontend integration
11. Deployment

---

## 🚀 Future Improvements

- AI-based course recommendations
- Real-time chat between students & instructors
- Resume builder
- Payment gateway integration
- Advanced analytics dashboard

---

## 📌 Note

This project is built for learning, demonstration, and academic purposes, focusing on real-world full-stack architecture and backend development practices.
