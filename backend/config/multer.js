import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { v2 as cloudinary } from 'cloudinary'

// ─── Avatar Storage ───────────────────────────────────────────────────────────
// Images go to 'skillbridge/avatars' folder on Cloudinary
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillbridge/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' }
      // auto-crops to face, resizes to 300x300 — saves storage & load time
    ]
  }
})

// ─── Resume Storage ───────────────────────────────────────────────────────────
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillbridge/resumes',
    allowed_formats: ['pdf'],
    resource_type: 'raw'   // 'raw' for non-image files like PDFs
  }
})

// ─── Course Thumbnail Storage ─────────────────────────────────────────────────
const thumbnailStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillbridge/thumbnails',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1280, height: 720, crop: 'fill' }   // 16:9 ratio, like YouTube
    ]
  }
})

// ─── Company Logo Storage ─────────────────────────────────────────────────────
const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillbridge/logos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [
      { width: 400, height: 400, crop: 'pad', background: 'white' }
    ]
  }
})

// ─── File size limits ─────────────────────────────────────────────────────────
const limits = {
  avatar: { fileSize: 2 * 1024 * 1024 },      // 2MB
  resume: { fileSize: 5 * 1024 * 1024 },      // 5MB
  thumbnail: { fileSize: 3 * 1024 * 1024 },   // 3MB
  logo: { fileSize: 2 * 1024 * 1024 }         // 2MB
}

// ─── Export individual upload middlewares ─────────────────────────────────────
// Each is a multer instance configured for a specific file type
// .single('fieldName') means expect one file with that form field name
export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: limits.avatar
}).single('avatar')

export const uploadResume = multer({
  storage: resumeStorage,
  limits: limits.resume
}).single('resume')

export const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: limits.thumbnail
}).single('thumbnail')

export const uploadLogo = multer({
  storage: logoStorage,
  limits: limits.logo
}).single('logo')