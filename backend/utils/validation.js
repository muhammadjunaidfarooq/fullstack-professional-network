import mongoose from "mongoose";
import { badRequest } from "./httpError.js";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/;
// Usernames that would clash with routes like /api/users/suggestions or /settings.
export const RESERVED_USERNAMES = new Set([
  "admin", "api", "edit", "login", "logout", "me", "media", "profile", "register",
  "settings", "suggestions", "support", "uploads",
]);

/** Throws a 400 error when the (lowercased) username is not allowed. */
export const assertValidUsername = (username) => {
  if (!USERNAME_REGEX.test(username)) {
    throw badRequest("Username can only contain letters, numbers, dots and underscores");
  }
  if (RESERVED_USERNAMES.has(username)) throw badRequest("This username is reserved");
  return username;
};

/** Escape user input before putting it inside a RegExp (prevents ReDoS / regex injection). */
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const assertObjectId = (value, label = "id") => {
  if (!mongoose.isValidObjectId(value)) {
    throw badRequest(`Invalid ${label}`);
  }
  return value;
};

/**
 * Read an optional string field: trims it and enforces a max length.
 * Returns undefined when the field was not sent, so callers can skip it.
 */
export const optionalString = (value, field, maxLength) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw badRequest(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw badRequest(`${field} must be at most ${maxLength} characters`);
  }
  return trimmed;
};

export const requiredString = (value, field, { min = 1, max = 200 } = {}) => {
  const trimmed = optionalString(value, field, max);
  if (!trimmed || trimmed.length < min) {
    throw badRequest(
      min > 1 ? `${field} must be at least ${min} characters` : `${field} is required`
    );
  }
  return trimmed;
};

export const parsePagination = (query, { defaultLimit = 10, maxLimit = 50 } = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit)
  );
  return { page, limit, skip: (page - 1) * limit };
};

export const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    throw badRequest("Password must be at least 8 characters");
  }
  if (password.length > 72) {
    // bcrypt only uses the first 72 bytes of a password.
    throw badRequest("Password must be at most 72 characters");
  }
  return password;
};
