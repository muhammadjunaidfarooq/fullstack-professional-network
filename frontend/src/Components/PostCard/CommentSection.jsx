import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "@/Components/Avatar";
import { Spinner } from "@/Components/Feedback";
import { TrashIcon } from "@/Components/Icons";
import { useToast } from "@/Components/Toast";
import { deleteComment, getAllComments, postComment } from "@/config/redux/action/postAction";
import { fullDate, timeAgo } from "@/utils/format";
import styles from "./styles.module.css";

const EMPTY = { items: [], isLoading: false, error: "" };

const CommentSection = ({ postId, postOwnerId }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const me = useSelector((state) => state.auth.user);
  const comments = useSelector((state) => state.postReducer.comments[postId]) || EMPTY;

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    dispatch(getAllComments({ postId }));
  }, [dispatch, postId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await dispatch(postComment({ postId, body: text })).unwrap();
      setBody("");
    } catch (error) {
      toast.error(error?.message || "Could not add your comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    setDeletingId(commentId);
    try {
      await dispatch(deleteComment({ commentId })).unwrap();
    } catch (error) {
      toast.error(error?.message || "Could not delete the comment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.comments} aria-label="Comments">
      {me && (
        <form className={styles.commentForm} onSubmit={handleSubmit}>
          <Avatar src={me.profilePicture} name={me.name} size={36} />
          <label htmlFor={`comment-${postId}`} className="visually-hidden">
            Add a comment
          </label>
          <input
            id={`comment-${postId}`}
            className={styles.commentInput}
            placeholder="Add a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!body.trim() || submitting}>
            {submitting ? "…" : "Post"}
          </button>
        </form>
      )}

      {comments.isLoading && comments.items.length === 0 && (
        <div className={styles.commentsLoading}>
          <Spinner size={22} label="Loading comments" />
        </div>
      )}

      {comments.error && (
        <p className="alert alert-error">
          {comments.error}{" "}
          <button type="button" className={styles.inlineLink} onClick={() => dispatch(getAllComments({ postId }))}>
            Retry
          </button>
        </p>
      )}

      {!comments.isLoading && !comments.error && comments.items.length === 0 && (
        <p className={`muted text-sm ${styles.noComments}`}>No comments yet. Start the conversation.</p>
      )}

      <ul className={styles.commentList}>
        {comments.items.map((comment) => {
          const author = comment.author || { name: "Deleted user", username: "" };
          const canDelete = me && (author._id === me._id || postOwnerId === me._id);
          return (
            <li key={comment._id} className={styles.comment}>
              <Link href={author.username ? `/profile/${author.username}` : "#"}>
                <Avatar src={author.profilePicture} name={author.name} size={36} />
              </Link>
              <div className={styles.commentBubble}>
                <div className={styles.commentHeader}>
                  <Link href={author.username ? `/profile/${author.username}` : "#"} className={styles.commentAuthor}>
                    {author.name}
                  </Link>
                  <time className="muted text-xs" dateTime={comment.createdAt} title={fullDate(comment.createdAt)}>
                    {timeAgo(comment.createdAt)}
                  </time>
                  {canDelete && (
                    <button
                      type="button"
                      className={styles.commentDelete}
                      onClick={() => handleDelete(comment._id)}
                      disabled={deletingId === comment._id}
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      <TrashIcon size={15} />
                    </button>
                  )}
                </div>
                <p className={styles.commentBody}>{comment.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CommentSection;
