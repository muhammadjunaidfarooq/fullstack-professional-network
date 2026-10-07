import ConnectionRequest from "../models/connections.model.js";

/**
 * Relationship of the viewer with another user:
 *   "self" | "none" | "pending_sent" | "pending_received" | "connected"
 */
const statusFor = (request, viewerId) => {
  if (!request || request.status_accepted === false) return "none";
  if (request.status_accepted === true) return "connected";
  return request.userId.toString() === viewerId ? "pending_sent" : "pending_received";
};

/**
 * Look up the viewer's relationship with many users in a single query.
 * Returns a Map of userId -> { status, requestId }.
 */
export const getRelationships = async (viewerId, otherIds) => {
  const viewer = viewerId.toString();
  const ids = otherIds.map((id) => id.toString());
  const result = new Map(ids.map((id) => [id, { status: "none", requestId: null }]));
  if (result.has(viewer)) result.set(viewer, { status: "self", requestId: null });

  const requests = await ConnectionRequest.find({
    $or: [
      { userId: viewer, connectionId: { $in: ids } },
      { connectionId: viewer, userId: { $in: ids } },
    ],
  }).lean();

  for (const request of requests) {
    const otherId =
      request.userId.toString() === viewer
        ? request.connectionId.toString()
        : request.userId.toString();
    const status = statusFor(request, viewer);
    if (status !== "none") {
      result.set(otherId, { status, requestId: request._id.toString() });
    }
  }
  return result;
};

/** IDs of every user the given user is connected to (accepted, either direction). */
export const getConnectedUserIds = async (userId) => {
  const id = userId.toString();
  const accepted = await ConnectionRequest.find({
    status_accepted: true,
    $or: [{ userId: id }, { connectionId: id }],
  }).lean();
  return accepted.map((request) =>
    request.userId.toString() === id ? request.connectionId.toString() : request.userId.toString()
  );
};

/** Find the request (any state) between two users, in either direction. */
export const findRequestBetween = (a, b) =>
  ConnectionRequest.findOne({
    $or: [
      { userId: a, connectionId: b },
      { userId: b, connectionId: a },
    ],
  });
