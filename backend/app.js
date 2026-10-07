import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import connectionRoutes from "./routes/connection.routes.js";
import { commentRouter, postRouter } from "./routes/posts.routes.js";
import { getMedia } from "./controllers/media.controller.js";
import { activeCheck } from "./controllers/posts.controller.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createApp = () => {
  const app = express();

  if (env.trustProxy) app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // The frontend runs on a different origin and must be able to load images.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (no Origin header) and configured frontends.
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      exposedHeaders: ["Content-Disposition"],
    })
  );
  if (!env.isTest) app.use(morgan(env.isProduction ? "combined" : "dev"));
  app.use(express.json({ limit: "100kb" }));
  // Express 5 leaves req.body undefined when there is no body; normalise it.
  app.use((req, res, next) => {
    req.body ??= {};
    next();
  });

  app.get("/", activeCheck);
  app.get("/api/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({ status: dbConnected ? "ok" : "degraded", db: dbConnected });
  });

  // Basic protection against scripted abuse of the whole API (per IP).
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: env.isTest ? 100000 : 1000,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "Too many requests. Please slow down and try again shortly." },
    })
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/connections", connectionRoutes);
  app.use("/api/posts", postRouter);
  app.use("/api/comments", commentRouter);
  app.get("/media/:id", getMedia);
  // Files uploaded by the first version of the app (stored on disk).
  app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
