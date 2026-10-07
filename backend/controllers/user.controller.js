import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Post from "../models/posts.model.js";
import ConnectionRequest from "../models/connections.model.js";
import { badRequest, conflict, notFound } from "../utils/httpError.js";
import { publicUser, selfUser, serializeProfile } from "../utils/serializers.js";
import {
  assertValidUsername,
  assertObjectId,
  escapeRegex,
  optionalString,
  parsePagination,
  requiredString,
} from "../utils/validation.js";
import { getConnectedUserIds, getRelationships } from "../services/connection.service.js";
import { deleteImageByPath, loadImageAsPng, saveImage } from "../services/media.service.js";
import { writeResumePdf } from "../services/pdf.service.js";

const MAX_LIST_ITEMS = 20;
const MAX_SKILLS = 30;

/** Build the cards shown in search results and suggestions. */
const toUserCards = async (viewerId, users) => {
  const ids = users.map((u) => u._id);
  const [profiles, relationships] = await Promise.all([
    Profile.find({ userId: { $in: ids } }).select("userId currentPost location").lean(),
    getRelationships(viewerId, ids),
  ]);
  const profileByUser = new Map(profiles.map((p) => [p.userId.toString(), p]));

  return users.map((user) => {
    const profile = profileByUser.get(user._id.toString());
    return {
      user: publicUser(user),
      headline: profile?.currentPost || "",
      location: profile?.location || "",
      connection: relationships.get(user._id.toString()),
    };
  });
};

/** GET /api/users?search=&page=&limit= — search people by name, username, headline, skills or location. */
export const listUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12, maxLimit: 50 });
  const search = optionalString(req.query.search, "Search", 100) || "";

  const filter = { active: { $ne: false }, _id: { $ne: req.user._id } };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    const profileMatches = await Profile.find({
      $or: [{ currentPost: pattern }, { skills: pattern }, { location: pattern }],
    })
      .select("userId")
      .limit(500)
      .lean();
    filter.$or = [
      { name: pattern },
      { username: pattern },
      { _id: { $in: profileMatches.map((p) => p.userId) } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    users: await toUserCards(req.user._id, users),
    page,
    limit,
    total,
    hasMore: skip + users.length < total,
  });
};

/** GET /api/users/suggestions — a few people the user has no connection with yet. */
export const getSuggestions = async (req, res) => {
  const me = req.user._id.toString();
  const related = await ConnectionRequest.find({
    $or: [{ userId: me }, { connectionId: me }],
    status_accepted: { $ne: false },
  }).lean();
  const exclude = related.map((r) =>
    r.userId.toString() === me ? r.connectionId : r.userId
  );

  const users = await User.find({
    _id: { $nin: [req.user._id, ...exclude] },
    active: { $ne: false },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  res.json({ users: await toUserCards(req.user._id, users) });
};

/** GET /api/users/:username — full profile of any user. */
export const getProfileByUsername = async (req, res) => {
  const username = String(req.params.username || "").toLowerCase();
  const user = await User.findOne({ username, active: { $ne: false } }).lean();
  if (!user) throw notFound("User not found");

  const isSelf = user._id.toString() === req.user._id.toString();
  const [profile, relationships, connectedIds, postsCount] = await Promise.all([
    Profile.findOne({ userId: user._id }).lean(),
    getRelationships(req.user._id, [user._id]),
    getConnectedUserIds(user._id),
    Post.countDocuments({ userId: user._id, active: { $ne: false } }),
  ]);

  res.json({
    user: isSelf ? selfUser(user) : publicUser(user),
    profile: serializeProfile(profile),
    connection: relationships.get(user._id.toString()),
    stats: { connections: connectedIds.length, posts: postsCount },
    isSelf,
  });
};

/** PATCH /api/users/me — update account fields (name, username). */
export const updateMe = async (req, res) => {
  const updates = {};

  if (req.body.name !== undefined) {
    updates.name = requiredString(req.body.name, "Name", { min: 2, max: 60 });
  }
  if (req.body.username !== undefined) {
    const username = requiredString(req.body.username, "Username", { min: 3, max: 30 }).toLowerCase();
    assertValidUsername(username);
    const taken = await User.exists({ username, _id: { $ne: req.user._id } });
    if (taken) throw conflict("This username is already taken");
    updates.username = username;
  }

  if (Object.keys(updates).length === 0) throw badRequest("Nothing to update");

  Object.assign(req.user, updates);
  await req.user.save();
  res.json({ message: "Account updated", user: selfUser(req.user) });
};

const cleanEntries = (items, fields, label) => {
  if (!Array.isArray(items)) throw badRequest(`${label} must be a list`);
  if (items.length > MAX_LIST_ITEMS) {
    throw badRequest(`You can add at most ${MAX_LIST_ITEMS} ${label.toLowerCase()} entries`);
  }
  return items
    .map((item) => {
      if (!item || typeof item !== "object") throw badRequest(`Invalid ${label.toLowerCase()} entry`);
      return Object.fromEntries(
        fields.map((field) => [field, optionalString(item[field], `${label} ${field}`, 120) || ""])
      );
    })
    .filter((item) => fields.some((field) => item[field]));
};

/** PATCH /api/users/me/profile — update professional details. Only listed fields can change. */
export const updateMyProfile = async (req, res) => {
  const { bio, currentPost, location, skills, pastWork, education } = req.body;
  const updates = {};

  if (bio !== undefined) updates.bio = optionalString(bio, "About", 2000);
  if (currentPost !== undefined) updates.currentPost = optionalString(currentPost, "Headline", 120);
  if (location !== undefined) updates.location = optionalString(location, "Location", 100);

  if (skills !== undefined) {
    if (!Array.isArray(skills)) throw badRequest("Skills must be a list");
    const unique = [
      ...new Map(
        skills
          .map((skill) => optionalString(skill, "Skill", 40))
          .filter(Boolean)
          .map((skill) => [skill.toLowerCase(), skill])
      ).values(),
    ];
    if (unique.length > MAX_SKILLS) throw badRequest(`You can add at most ${MAX_SKILLS} skills`);
    updates.skills = unique;
  }
  if (pastWork !== undefined) {
    updates.pastWork = cleanEntries(pastWork, ["company", "position", "years"], "Experience");
  }
  if (education !== undefined) {
    updates.education = cleanEntries(
      education,
      ["school", "degree", "fieldOfStudy", "years"],
      "Education"
    );
  }

  const profile = await Profile.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates, $setOnInsert: { userId: req.user._id } },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  res.json({ message: "Profile updated", profile: serializeProfile(profile) });
};

/** POST /api/users/me/avatar — upload a new profile picture (field: profile_picture). */
export const uploadAvatar = async (req, res) => {
  if (!req.file) throw badRequest("Please choose an image to upload");

  const { path } = await saveImage(req.file, { ownerId: req.user._id, kind: "avatar" });
  const previous = req.user.profilePicture;

  req.user.profilePicture = path;
  await req.user.save();
  await deleteImageByPath(previous);

  res.json({ message: "Profile picture updated", user: selfUser(req.user) });
};

/** DELETE /api/users/me/avatar — go back to the default avatar. */
export const removeAvatar = async (req, res) => {
  const previous = req.user.profilePicture;
  req.user.profilePicture = "";
  await req.user.save();
  await deleteImageByPath(previous);
  res.json({ message: "Profile picture removed", user: selfUser(req.user) });
};

/** GET /api/users/:id/resume — download a user's profile as a PDF. */
export const downloadResume = async (req, res) => {
  assertObjectId(req.params.id, "user id");
  const user = await User.findOne({ _id: req.params.id, active: { $ne: false } }).lean();
  if (!user) throw notFound("User not found");

  const profile = serializeProfile(await Profile.findOne({ userId: user._id }).lean());
  const isSelf = user._id.toString() === req.user._id.toString();
  const avatarPng = await loadImageAsPng(user.profilePicture);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${user.username}-resume.pdf"`);
  // Only include the email address when users download their own resume.
  writeResumePdf(res, { user, profile, email: isSelf ? user.email : null, avatarPng });
};
