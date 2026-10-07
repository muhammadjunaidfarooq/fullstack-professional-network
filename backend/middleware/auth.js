import crypto from "crypto";
import User from "../models/user.model.js";
import { unauthorized } from "../utils/httpError.js";

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateToken = () => crypto.randomBytes(32).toString("hex");

const readBearerToken = (req) => {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
};

/**
 * Require a valid session token in the `Authorization: Bearer <token>` header.
 * On success, `req.user` is the logged-in user and `req.tokenHash` identifies
 * the current session (used by logout).
 */
export const requireAuth = async (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) throw unauthorized();

  const tokenHash = hashToken(token);
  const user = await User.findOne({ "sessions.tokenHash": tokenHash }).select("+sessions");
  const session = user?.sessions.find((s) => s.tokenHash === tokenHash);

  if (!user || user.active === false || !session || session.expiresAt <= new Date()) {
    throw unauthorized("Your session has expired. Please log in again.");
  }

  req.user = user;
  req.tokenHash = tokenHash;
  next();
};
