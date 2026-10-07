/* eslint-disable @next/next/no-img-element -- local preview of a file chosen by the user */
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "@/Components/Avatar";
import { PhotoIcon, XIcon } from "@/Components/Icons";
import { useToast } from "@/Components/Toast";
import { createPost } from "@/config/redux/action/postAction";
import { validateImageFile } from "@/utils/files";
import styles from "./styles.module.css";

const MAX_LENGTH = 3000;

const CreatePost = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector((state) => state.auth.user);

  const [body, setBody] = useState("");
  const [image, setImage] = useState(null); // { file, previewUrl }
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  // Free the preview URL when the component unmounts.
  useEffect(() => () => previewRef.current && URL.revokeObjectURL(previewRef.current), []);

  const setPreview = (file) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    previewRef.current = previewUrl;
    setImage(file ? { file, previewUrl } : null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setPreview(file);
  };

  const trimmed = body.trim();
  const canSubmit = (trimmed.length > 0 || image) && body.length <= MAX_LENGTH && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await dispatch(createPost({ body: trimmed, file: image?.file })).unwrap();
      setBody("");
      setPreview(null);
      toast.success("Your post is live");
    } catch (err) {
      setError(err?.message || "Could not publish your post");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <form className={`card ${styles.container}`} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <Avatar src={user.profilePicture} name={user.name} size={48} />
        <label htmlFor="new-post" className="visually-hidden">
          Write a post
        </label>
        <textarea
          id="new-post"
          className={styles.textarea}
          placeholder="Share an update, an idea or an achievement…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={body ? 4 : 2}
          maxLength={MAX_LENGTH + 200}
        />
      </div>

      {image && (
        <div className={styles.preview}>
          <img src={image.previewUrl} alt="Selected attachment preview" />
          <button
            type="button"
            className={styles.removeImage}
            onClick={() => setPreview(null)}
            aria-label="Remove image"
          >
            <XIcon size={18} />
          </button>
        </div>
      )}

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting}
        >
          <PhotoIcon size={20} /> Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          hidden
          onChange={handleFileChange}
        />
        <div className={styles.submitGroup}>
          {body.length > MAX_LENGTH - 300 && (
            <span className={`text-xs ${body.length > MAX_LENGTH ? styles.over : "muted"}`}>
              {body.length}/{MAX_LENGTH}
            </span>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={!canSubmit}>
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreatePost;
