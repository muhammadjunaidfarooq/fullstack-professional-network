import mongoose from "mongoose";
import multer from "multer";
import { env } from "../config/env.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Express recognises error handlers by their 4 arguments, so `next` must stay.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let details = err.details;

  if (err instanceof multer.MulterError) {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller" : err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = "Validation failed";
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    message = field ? `That ${field} is already taken` : "Duplicate value";
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    message = "Request body is not valid JSON";
  } else if (err?.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    // Never leak internal error messages or stack traces in production.
    if (env.isProduction) message = "Internal server error";
  }

  const body = { message };
  if (details) body.details = details;
  res.status(status).json(body);
};
