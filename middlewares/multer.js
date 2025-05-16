// middlewares/multer.js
import multer from "multer";

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

export const multerUpload = multer({
  storage, // ✅ this is important
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB limit
  },
});
