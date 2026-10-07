import ConnectionRequest from "../models/connections.model.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { publicUser } from "../utils/serializers.js";
import { assertObjectId } from "../utils/validation.js";
import { findRequestBetween } from "../services/connection.service.js";

const USER_FIELDS = "name username profilePicture active";

const headlinesFor = async (userIds) => {
  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select("userId currentPost")
    .lean();
  return new Map(profiles.map((p) => [p.userId.toString(), p.currentPost || ""]));
};

const toEntry = (request, otherUser, headlines) => ({
  requestId: request._id.toString(),
  user: publicUser(otherUser),
  headline: headlines.get(otherUser._id.toString()) || "",
  since: request.updatedAt || request.createdAt,
});

/** GET /api/connections — everyone the user is connected with (both directions). */
export const listConnections = async (req, res) => {
  const me = req.user._id.toString();
  const requests = await ConnectionRequest.find({
    status_accepted: true,
    $or: [{ userId: me }, { connectionId: me }],
  })
    .populate("userId", USER_FIELDS)
    .populate("connectionId", USER_FIELDS)
    .sort({ updatedAt: -1 })
    .lean();

  const pairs = requests
    .map((request) => ({
      request,
      other: request.userId?._id?.toString() === me ? request.connectionId : request.userId,
    }))
    .filter(({ other }) => other && other.active !== false);

  const headlines = await headlinesFor(pairs.map(({ other }) => other._id));
  res.json({ connections: pairs.map(({ request, other }) => toEntry(request, other, headlines)) });
};

/** GET /api/connections/requests?type=received|sent — pending requests. */
export const listRequests = async (req, res) => {
  const type = req.query.type === "sent" ? "sent" : "received";
  const filter =
    type === "sent"
      ? { userId: req.user._id, status_accepted: null }
      : { connectionId: req.user._id, status_accepted: null };
  const otherField = type === "sent" ? "connectionId" : "userId";

  const requests = await ConnectionRequest.find(filter)
    .populate(otherField, USER_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
  const valid = requests.filter((r) => r[otherField] && r[otherField].active !== false);
  const headlines = await headlinesFor(valid.map((r) => r[otherField]._id));

  res.json({ type, requests: valid.map((r) => toEntry(r, r[otherField], headlines)) });
};

/** POST /api/connections/requests { userId } — send a connection request. */
export const sendRequest = async (req, res) => {
  const targetId = assertObjectId(req.body.userId, "user id");
  if (targetId === req.user._id.toString()) {
    throw badRequest("You cannot connect with yourself");
  }

  const target = await User.findOne({ _id: targetId, active: { $ne: false } }).lean();
  if (!target) throw notFound("User not found");

  const existing = await findRequestBetween(req.user._id, target._id);
  if (existing) {
    if (existing.status_accepted === true) throw conflict("You are already connected");
    if (existing.status_accepted === null) {
      const sentByMe = existing.userId.toString() === req.user._id.toString();
      throw conflict(
        sentByMe
          ? "You have already sent a request to this user"
          : "This user has already sent you a request. Accept it from My Network."
      );
    }
    // Legacy "rejected" record: clear it so a fresh request can be created.
    await existing.deleteOne();
  }

  const request = await ConnectionRequest.create({
    userId: req.user._id,
    connectionId: target._id,
  });

  res.status(201).json({
    message: "Connection request sent",
    connection: { status: "pending_sent", requestId: request._id.toString() },
  });
};

/** PATCH /api/connections/requests/:id { action: "accept" | "reject" } — receiver only. */
export const respondToRequest = async (req, res) => {
  assertObjectId(req.params.id, "request id");
  const { action } = req.body;
  if (!["accept", "reject"].includes(action)) {
    throw badRequest('action must be "accept" or "reject"');
  }

  const request = await ConnectionRequest.findById(req.params.id);
  if (!request || request.status_accepted !== null) {
    throw notFound("Connection request not found");
  }
  if (request.connectionId.toString() !== req.user._id.toString()) {
    throw forbidden("Only the person who received this request can respond to it");
  }

  if (action === "accept") {
    request.status_accepted = true;
    await request.save();
    return res.json({
      message: "Connection request accepted",
      connection: { status: "connected", requestId: request._id.toString() },
    });
  }

  await request.deleteOne();
  res.json({
    message: "Connection request rejected",
    connection: { status: "none", requestId: null },
  });
};

/** DELETE /api/connections/requests/:id — the sender cancels a pending request. */
export const cancelRequest = async (req, res) => {
  assertObjectId(req.params.id, "request id");
  const request = await ConnectionRequest.findById(req.params.id);
  if (!request || request.status_accepted !== null) {
    throw notFound("Connection request not found");
  }
  if (request.userId.toString() !== req.user._id.toString()) {
    throw forbidden("Only the sender can cancel this request");
  }

  await request.deleteOne();
  res.json({
    message: "Connection request cancelled",
    connection: { status: "none", requestId: null },
  });
};

/** DELETE /api/connections/:userId — remove an existing connection. */
export const removeConnection = async (req, res) => {
  const otherId = assertObjectId(req.params.userId, "user id");
  const request = await findRequestBetween(req.user._id, otherId);
  if (!request || request.status_accepted !== true) {
    throw notFound("You are not connected with this user");
  }

  await request.deleteOne();
  res.json({ message: "Connection removed", connection: { status: "none", requestId: null } });
};
