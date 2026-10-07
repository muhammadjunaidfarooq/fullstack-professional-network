/* eslint-disable @next/next/no-img-element -- post images are served by our API, already resized */
import Link from "next/link";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "@/Components/Avatar";
import ConfirmDialog from "@/Components/ConfirmDialog";
import { ChatIcon, PencilIcon, ThumbUpIcon, TrashIcon } from "@/Components/Icons";
import { useToast } from "@/Components/Toast";
import { assetUrl } from "@/config";
import { deletePost, toggleLike, updatePost } from "@/config/redux/action/postAction";
import { fullDate, pluralize, timeAgo } from "@/utils/format";
import CommentSection from "./CommentSection";
import styles from "./styles.module.css";

const COLLAPSE_AT = 320;

const PostCard = ({ postId }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const post = useSelector((state) => state.postReducer.entities[postId]);
  const me = useSelector((state) => state.auth.user);

  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!post) return null;

  const author = post.author || { name: "Deleted user", username: "" };
  const isOwner = me && author._id === me._id;
  const isLong = post.body.length > COLLAPSE_AT;
  const visibleBody = isLong && !expanded ? `${post.body.slice(0, COLLAPSE_AT).trimEnd()}…` : post.body;

  const startEditing = () => {
    setDraft(post.body);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await dispatch(updatePost({ postId, body: draft.trim() })).unwrap();
      setEditing(false);
      toast.success("Post updated");
    } catch (error) {
      toast.error(error?.message || "Could not save your changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deletePost({ postId })).unwrap();
      toast.success("Post deleted");
    } catch (error) {
      toast.error(error?.message || "Could not delete the post");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleLike = () => {
    dispatch(toggleLike({ postId, like: !post.likedByMe }))
      .unwrap()
      .catch((error) => toast.error(error?.message || "Could not update the like"));
  };

  const profileHref = author.username ? `/profile/${author.username}` : "#";

  return (
    <article className={`card ${styles.card}`} aria-label={`Post by ${author.name}`}>
      <header className={styles.header}>
        <Link href={profileHref} className={styles.author}>
          <Avatar src={author.profilePicture} name={author.name} size={48} />
          <div className={styles.authorText}>
            <span className={styles.authorName}>{author.name}</span>
            <span className={styles.meta}>
              {author.username && <>@{author.username} · </>}
              <time dateTime={post.createdAt} title={fullDate(post.createdAt)}>
                {timeAgo(post.createdAt)}
              </time>
              {post.edited && <> · edited</>}
            </span>
          </div>
        </Link>

        {isOwner && !editing && (
          <div className={styles.ownerActions}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={startEditing}
              aria-label="Edit post"
              title="Edit post"
            >
              <PencilIcon size={18} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete post"
              title="Delete post"
            >
              <TrashIcon size={18} />
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <div className={styles.editor}>
          <label htmlFor={`edit-${postId}`} className="visually-hidden">
            Edit post
          </label>
          <textarea
            id={`edit-${postId}`}
            className="textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={3000}
            autoFocus
          />
          <div className={styles.editorActions}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={saveEdit}
              disabled={saving || (!draft.trim() && !post.media) || draft === post.body}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        post.body && (
          <p className={styles.body}>
            {visibleBody}
            {isLong && (
              <button type="button" className={styles.seeMore} onClick={() => setExpanded(!expanded)}>
                {expanded ? " see less" : " see more"}
              </button>
            )}
          </p>
        )
      )}

      {post.media && (
        <div className={styles.media}>
          <img src={assetUrl(post.media)} alt={`Image shared by ${author.name}`} loading="lazy" />
        </div>
      )}

      {(post.likesCount > 0 || post.commentsCount > 0) && (
        <div className={styles.stats}>
          <span>
            {post.likesCount > 0 && (
              <>
                <span className={styles.likeBadge}>
                  <ThumbUpIcon size={11} />
                </span>{" "}
                {post.likesCount}
              </>
            )}
          </span>
          {post.commentsCount > 0 && (
            <button type="button" className={styles.statButton} onClick={() => setShowComments(true)}>
              {pluralize(post.commentsCount, "comment")}
            </button>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${post.likedByMe ? styles.liked : ""}`}
          onClick={handleLike}
          aria-pressed={post.likedByMe}
        >
          <ThumbUpIcon size={20} filled={post.likedByMe} /> {post.likedByMe ? "Liked" : "Like"}
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setShowComments(!showComments)}
          aria-expanded={showComments}
        >
          <ChatIcon size={20} /> Comment
        </button>
      </div>

      {showComments && <CommentSection postId={postId} postOwnerId={author._id} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete post?"
        message="This will permanently delete the post and all of its comments."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </article>
  );
};

export default PostCard;
