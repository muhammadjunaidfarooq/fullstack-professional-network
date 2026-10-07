/**
 * Helpers that turn database documents into the JSON shape the frontend uses.
 * Keeping them in one place guarantees that private fields (password, session
 * hashes, emails of other users) never leak into API responses.
 */

const LEGACY_DEFAULT_PICTURE = "default-profile.png";

/**
 * Convert a stored media reference into a URL path the client can load.
 * - ""                       -> "" (client shows its default avatar)
 * - "/media/<id>" or "http…" -> unchanged (current storage format)
 * - "<file>.png"             -> "/uploads/<file>.png" (legacy disk uploads)
 */
export const mediaPath = (value) => {
  if (!value || value === LEGACY_DEFAULT_PICTURE) return "";
  if (value.startsWith("/") || value.startsWith("http")) return value;
  return `/uploads/${value}`;
};

export const publicUser = (user) => {
  if (!user || !user._id) return null;
  return {
    _id: user._id.toString(),
    name: user.name,
    username: user.username,
    profilePicture: mediaPath(user.profilePicture),
  };
};

/** The logged-in user's own account (includes email). */
export const selfUser = (user) => ({
  ...publicUser(user),
  email: user.email,
  createdAt: user.createdAt,
});

export const serializeProfile = (profile) => ({
  bio: profile?.bio || "",
  currentPost: profile?.currentPost || "",
  location: profile?.location || "",
  skills: profile?.skills || [],
  pastWork: (profile?.pastWork || []).map((work) => ({
    _id: work._id?.toString(),
    company: work.company || "",
    position: work.position || "",
    years: work.years || "",
  })),
  education: (profile?.education || []).map((edu) => ({
    _id: edu._id?.toString(),
    school: edu.school || "",
    degree: edu.degree || "",
    fieldOfStudy: edu.fieldOfStudy || "",
    years: edu.years || "",
  })),
});

export const serializePost = (post, { viewerId, commentsCount = 0 } = {}) => {
  const likes = (post.likes || []).map((id) => id.toString());
  const created = new Date(post.createdAt).getTime();
  const updated = new Date(post.updatedAt || post.createdAt).getTime();
  return {
    _id: post._id.toString(),
    body: post.body || "",
    media: mediaPath(post.media),
    fileType: post.fileType || "",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    edited: updated - created > 1000,
    author: publicUser(post.userId),
    likesCount: likes.length,
    likedByMe: viewerId ? likes.includes(viewerId.toString()) : false,
    commentsCount,
  };
};

export const serializeComment = (comment) => ({
  _id: comment._id.toString(),
  postId: comment.postId.toString(),
  body: comment.body,
  createdAt: comment.createdAt,
  author: publicUser(comment.userId),
});
