import { Router } from "express";
import { register, login, uploadProfilePicture } from "../controllers/user.controller.js";
import multer from "multer";

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploads = multer({ storage: storage });

router
  .route("/upload_profile_picture")
  .post(uploads.single("profile_picture"), uploadProfilePicture);

router.route("/register").post(register);
router.route("/login").post(login);

export default router;
