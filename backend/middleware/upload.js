import multer from "multer";
import { badRequest } from "../utils/httpError.js";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Files are kept in memory (not written to disk); the media service validates,
 * resizes and stores them. The client-sent MIME type is only a first filter —
 * sharp decodes the real file content later and rejects anything that is not
 * an image.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(badRequest("Only JPG, PNG, WebP, GIF or AVIF images are allowed"));
    }
    cb(null, true);
  },
});
