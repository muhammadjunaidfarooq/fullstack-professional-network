import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";

const router = Router();

// Slow down password guessing and mass sign-ups (per IP).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

export default router;
