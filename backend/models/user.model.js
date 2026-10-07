import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    // SHA-256 hash of the session token. The raw token only ever lives in the
    // client, so a database leak does not expose usable tokens.
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Either "" (default avatar), "/media/<id>" (current uploads) or a legacy filename.
    profilePicture: {
      type: String,
      default: "",
    },
    sessions: {
      type: [sessionSchema],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.index({ "sessions.tokenHash": 1 });

const User = mongoose.model("User", userSchema);

export default User;
