import mongoose from "mongoose";

/**
 * Uploaded images (avatars and post images), stored in MongoDB.
 *
 * Images are resized and re-encoded to WebP before saving, so each document is
 * small (typically 20–300 KB). Storing them in the database keeps uploads
 * working on hosts with an ephemeral filesystem (Render, Railway, Fly.io).
 */
const mediaSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kind: {
      type: String,
      enum: ["avatar", "post"],
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

const Media = mongoose.model("Media", mediaSchema);

export default Media;
