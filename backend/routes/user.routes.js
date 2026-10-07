import { Router } from "express";
import {
  downloadResume,
  getProfileByUsername,
  getSuggestions,
  listUsers,
  removeAvatar,
  updateMe,
  updateMyProfile,
  uploadAvatar,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";

const router = Router();

router.use(requireAuth);

router.get("/", listUsers);
router.get("/suggestions", getSuggestions);
router.patch("/me", updateMe);
router.patch("/me/profile", updateMyProfile);
router.post("/me/avatar", imageUpload.single("profile_picture"), uploadAvatar);
router.delete("/me/avatar", removeAvatar);
router.get("/:id/resume", downloadResume);
router.get("/:username", getProfileByUsername);

export default router;
