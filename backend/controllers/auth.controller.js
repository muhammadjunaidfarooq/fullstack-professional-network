import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import { env } from "../config/env.js";
import { generateToken, hashToken } from "../middleware/auth.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";
import { selfUser, serializeProfile } from "../utils/serializers.js";
import {
  EMAIL_REGEX,
  assertValidUsername,
  requiredString,
  validatePassword,
} from "../utils/validation.js";

const BCRYPT_ROUNDS = 10;
// Compared against when the email does not exist, so a failed login takes the
// same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

/** Create a new session for the user and return the raw token (sent to the client once). */
const createSession = async (userId) => {
  const user = await User.findById(userId).select("+sessions");
  const now = Date.now();
  const token = generateToken();
  const session = {
    tokenHash: hashToken(token),
    expiresAt: new Date(now + env.sessionTtlDays * 24 * 60 * 60 * 1000),
    createdAt: new Date(now),
  };

  // Drop expired sessions and keep only the most recent few devices.
  const active = (user.sessions || []).filter((s) => s.expiresAt.getTime() > now);
  user.sessions = [...active, session].slice(-env.maxSessionsPerUser);
  await user.save();

  return { token, expiresAt: session.expiresAt };
};

export const register = async (req, res) => {
  const name = requiredString(req.body.name, "Name", { min: 2, max: 60 });
  const username = requiredString(req.body.username, "Username", { min: 3, max: 30 }).toLowerCase();
  const email = requiredString(req.body.email, "Email", { max: 254 }).toLowerCase();
  const password = validatePassword(req.body.password);

  assertValidUsername(username);
  if (!EMAIL_REGEX.test(email)) throw badRequest("Please enter a valid email address");

  const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
  if (existing) {
    throw conflict(
      existing.email === email ? "An account with this email already exists" : "This username is already taken"
    );
  }

  const user = await User.create({
    name,
    username,
    email,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
  });
  const profile = await Profile.create({ userId: user._id });
  const session = await createSession(user._id);

  res.status(201).json({
    message: "Account created",
    token: session.token,
    expiresAt: session.expiresAt,
    user: selfUser(user),
    profile: serializeProfile(profile),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    throw badRequest("Email and password are required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  // Same message for "no such user" and "wrong password" so attackers cannot
  // find out which emails are registered.
  const passwordMatches = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || user.active === false || !passwordMatches) {
    throw unauthorized("Invalid email or password");
  }

  const session = await createSession(user._id);
  res.json({ message: "Logged in", token: session.token, expiresAt: session.expiresAt });
};

export const logout = async (req, res) => {
  // req.user was loaded with its sessions by requireAuth; drop only this one.
  req.user.sessions = req.user.sessions.filter((s) => s.tokenHash !== req.tokenHash);
  await req.user.save();
  res.json({ message: "Logged out" });
};

export const me = async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user._id }).lean();
  res.json({ user: selfUser(req.user), profile: serializeProfile(profile) });
};
