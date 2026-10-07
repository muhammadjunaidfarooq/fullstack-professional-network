import { Router } from "express";
import {
  commentPost,
  createPost,
  deleteComment,
  deletePost,
  getAllPosts,
  getCommentsByPost,
  likePost,
  unlikePost,
  updatePost,
} from "../controllers/posts.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";

export const postRouter = Router();
postRouter.use(requireAuth);

postRouter.get("/", getAllPosts);
postRouter.post("/", imageUpload.single("media"), createPost);
postRouter.patch("/:id", updatePost);
postRouter.delete("/:id", deletePost);
postRouter.post("/:id/like", likePost);
postRouter.delete("/:id/like", unlikePost);
postRouter.get("/:id/comments", getCommentsByPost);
postRouter.post("/:id/comments", commentPost);

export const commentRouter = Router();
commentRouter.use(requireAuth);

commentRouter.delete("/:id", deleteComment);
