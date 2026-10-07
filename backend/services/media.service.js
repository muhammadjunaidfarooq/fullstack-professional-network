import sharp from "sharp";
import mongoose from "mongoose";
import Media from "../models/media.model.js";
import { badRequest } from "../utils/httpError.js";

const PRESETS = {
  // Square crop for profile pictures.
  avatar: { width: 400, height: 400, fit: "cover" },
  // Keep the aspect ratio for post images, just cap the size.
  post: { width: 1280, height: 1280, fit: "inside", withoutEnlargement: true },
};

/**
 * Decode, resize and re-encode an uploaded image as WebP.
 * Re-encoding strips metadata (EXIF/GPS) and guarantees the stored bytes are a
 * real image, whatever the client claimed the file was.
 */
export const processImage = async (buffer, kind) => {
  try {
    const output = await sharp(buffer, { animated: kind === "post" })
      .rotate() // respect EXIF orientation before metadata is stripped
      .resize(PRESETS[kind])
      .webp({ quality: 80 })
      .toBuffer();
    return { data: output, contentType: "image/webp", size: output.length };
  } catch {
    throw badRequest("The uploaded file is not a valid image");
  }
};

/** Process and store an uploaded file. Returns the URL path to use in the client. */
export const saveImage = async (file, { ownerId, kind }) => {
  const processed = await processImage(file.buffer, kind);
  const media = await Media.create({ ownerId, kind, ...processed });
  return { path: `/media/${media._id}`, contentType: processed.contentType };
};

const mediaIdFromPath = (path) => {
  const match = /^\/media\/([a-f0-9]{24})$/i.exec(path || "");
  return match && mongoose.isValidObjectId(match[1]) ? match[1] : null;
};

/** Delete a stored image by its URL path. Legacy filenames are ignored. */
export const deleteImageByPath = async (path) => {
  const id = mediaIdFromPath(path);
  if (id) await Media.deleteOne({ _id: id });
};

/** Load an image as a PNG buffer (used to embed avatars in PDF resumes). */
export const loadImageAsPng = async (path) => {
  const id = mediaIdFromPath(path);
  if (!id) return null;
  const media = await Media.findById(id).lean();
  if (!media) return null;
  try {
    return await sharp(media.data.buffer ? Buffer.from(media.data.buffer) : media.data)
      .png()
      .toBuffer();
  } catch {
    return null;
  }
};
