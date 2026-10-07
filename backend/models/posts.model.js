import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      default: "",
      maxlength: 3000,
    },
    // "/media/<id>" for current uploads, or a legacy filename.
    media: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    fileType: {
      type: String,
      default: "",
    },
    // Users who liked the post. $addToSet/$pull keep it duplicate-free.
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

postSchema.index({ active: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
