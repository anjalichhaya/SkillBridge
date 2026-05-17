import { v2 as cloudinary } from 'cloudinary'

// Delete a file from Cloudinary by its public_id
// We need this when user updates their avatar — delete old one first
export const deleteFromCloudinary = async (public_id, resource_type = 'image') => {
  try {
    if (!public_id) return

    await cloudinary.uploader.destroy(public_id, {
      resource_type   // 'image' for images, 'raw' for PDFs
    })

    console.log(`🗑️ Deleted from Cloudinary: ${public_id}`)
  } catch (err) {
    console.error(`❌ Cloudinary delete error: ${err.message}`)
    // Don't throw — a failed delete shouldn't crash the whole request
  }
}