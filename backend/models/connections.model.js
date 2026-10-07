import mongoose from "mongoose";

/**
 * A connection request from `userId` (sender) to `connectionId` (receiver).
 *
 * status_accepted:
 *   null  -> pending
 *   true  -> accepted (the two users are connected)
 *
 * Rejected, cancelled and removed connections are deleted, so the pair can
 * connect again later. Old documents with `false` (from the first version of
 * the API) are treated as "no relationship".
 */
const connectionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status_accepted: {
      type: Boolean,
      default: null,
    },
  },
  { timestamps: true }
);

connectionRequestSchema.index({ userId: 1, connectionId: 1 }, { unique: true });
connectionRequestSchema.index({ connectionId: 1, status_accepted: 1 });

const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequest;
