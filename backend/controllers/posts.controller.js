import Post from "../models/posts.model.js";
import Comment from "../models/comments.model.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { serializeComment, serializePost } from "../utils/serializers.js";
import { assertObjectId, optionalString, parsePagination } from "../utils/validation.js";
import { deleteImageByPath, saveImage } from "../services/media.service.js";

const AUTHOR_FIELDS = "name username profilePicture";
const MAX_POST_LENGTH = 3000;
const MAX_COMMENT_LENGTH = 1000;

export const activeCheck = async (req, res) => {
  return res.status(200).json({ message: "RUNNING" });
};

/** Count comments for many posts with one aggregation (avoids N+1 queries). */
const commentCounts = async (postIds) => {
  if (postIds.length === 0) return new Map();
  const rows = await Comment.aggregate([
    { $match: { postId: { $in: postIds } } },
    { $group: { _id: "$postId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
};

const findActivePost = async (id) => {
  assertObjectId(id, "post id");
  const post = await Post.findOne({ _id: id, active: { $ne: false } });
  if (!post) throw notFound("Post not found");
  return post;
};

const assertOwner = (post, user, action) => {
  if (post.userId.toString() !== user._id.toString()) {
    throw forbidden(`You can only ${action} your own posts`);
  }
};

const serializeOne = async (postId, viewerId) => {
  const post = await Post.findById(postId).populate("userId", AUTHOR_FIELDS).lean();
  const counts = await commentCounts([post._id]);
  return serializePost(post, { viewerId, commentsCount: counts.get(post._id.toString()) || 0 });
};

/** GET /api/posts?page=&limit=&author=<userId> — newest first, paginated. */
export const getAllPosts = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 30 });
  const filter = { active: { $ne: false } };
  if (req.query.author) filter.userId = assertObjectId(req.query.author, "author id");

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);

  const counts = await commentCounts(posts.map((p) => p._id));
  res.json({
    posts: posts
      .filter((post) => post.userId) // skip posts whose author was deleted
      .map((post) =>
        serializePost(post, {
          viewerId: req.user._id,
          commentsCount: counts.get(post._id.toString()) || 0,
        })
      ),
    page,
    limit,
    total,
    hasMore: skip + posts.length < total,
  });
};

/** POST /api/posts (multipart/form-data: body, media) */
export const createPost = async (req, res) => {
  const body = optionalString(req.body.body, "Post", MAX_POST_LENGTH) || "";
  if (!body && !req.file) throw badRequest("Write something or add an image to post");

  let media = "";
  let fileType = "";
  if (req.file) {
    const saved = await saveImage(req.file, { ownerId: req.user._id, kind: "post" });
    media = saved.path;
    fileType = saved.contentType.split("/")[1];
  }

  const post = await Post.create({ userId: req.user._id, body, media, fileType });
  res.status(201).json({
    message: "Post created",
    post: await serializeOne(post._id, req.user._id),
  });
};

/** PATCH /api/posts/:id { body } — edit the text of your own post. */
export const updatePost = async (req, res) => {
  const post = await findActivePost(req.params.id);
  assertOwner(post, req.user, "edit");

  const body = optionalString(req.body.body, "Post", MAX_POST_LENGTH);
  if (body === undefined) throw badRequest("Post text is required");
  if (!body && !post.media) throw badRequest("A post without an image needs some text");

  post.body = body;
  await post.save();
  res.json({ message: "Post updated", post: await serializeOne(post._id, req.user._id) });
};

/** DELETE /api/posts/:id — delete your own post, its comments and its image. */
export const deletePost = async (req, res) => {
  const post = await findActivePost(req.params.id);
  assertOwner(post, req.user, "delete");

  await Promise.all([
    Post.deleteOne({ _id: post._id }),
    Comment.deleteMany({ postId: post._id }),
    deleteImageByPath(post.media),
  ]);
  res.json({ message: "Post deleted", postId: post._id.toString() });
};

const likeState = async (postId, viewerId) => {
  const post = await Post.findById(postId).select("likes").lean();
  const likes = (post?.likes || []).map(String);
  return { postId: postId.toString(), likesCount: likes.length, likedByMe: likes.includes(viewerId.toString()) };
};

/** POST /api/posts/:id/like — idempotent: liking twice still counts once. */
export const likePost = async (req, res) => {
  const post = await findActivePost(req.params.id);
  await Post.updateOne({ _id: post._id }, { $addToSet: { likes: req.user._id } }, { timestamps: false });
  res.json(await likeState(post._id, req.user._id));
};

/** DELETE /api/posts/:id/like */
export const unlikePost = async (req, res) => {
  const post = await findActivePost(req.params.id);
  await Post.updateOne({ _id: post._id }, { $pull: { likes: req.user._id } }, { timestamps: false });
  res.json(await likeState(post._id, req.user._id));
};

/** GET /api/posts/:id/comments — oldest first. */
export const getCommentsByPost = async (req, res) => {
  const post = await findActivePost(req.params.id);
  const comments = await Comment.find({ postId: post._id })
    .sort({ createdAt: 1, _id: 1 })
    .populate("userId", AUTHOR_FIELDS)
    .lean();
  res.json({
    postId: post._id.toString(),
    comments: comments.filter((c) => c.userId).map(serializeComment),
  });
};

/** POST /api/posts/:id/comments { body } */
export const commentPost = async (req, res) => {
  const post = await findActivePost(req.params.id);
  const body = optionalString(req.body.body, "Comment", MAX_COMMENT_LENGTH);
  if (!body) throw badRequest("Comment cannot be empty");

  const comment = await Comment.create({ userId: req.user._id, postId: post._id, body });
  const populated = await Comment.findById(comment._id).populate("userId", AUTHOR_FIELDS).lean();
  res.status(201).json({ message: "Comment added", comment: serializeComment(populated) });
};

/** DELETE /api/comments/:id — the comment author or the post owner can delete it. */
export const deleteComment = async (req, res) => {
  assertObjectId(req.params.id, "comment id");
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw notFound("Comment not found");

  const me = req.user._id.toString();
  const isAuthor = comment.userId.toString() === me;
  const post = isAuthor ? null : await Post.findById(comment.postId).select("userId").lean();
  const isPostOwner = post && post.userId.toString() === me;
  if (!isAuthor && !isPostOwner) {
    throw forbidden("You can only delete your own comments");
  }

  await comment.deleteOne();
  res.json({
    message: "Comment deleted",
    commentId: comment._id.toString(),
    postId: comment.postId.toString(),
  });
};
