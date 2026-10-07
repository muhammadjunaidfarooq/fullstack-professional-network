import Link from "next/link";
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "@/Components/Avatar";
import { PlusIcon, TrashIcon, XIcon } from "@/Components/Icons";
import { useToast } from "@/Components/Toast";
import {
  removeProfilePicture,
  updateAccount,
  updateProfileData,
  uploadProfilePicture,
} from "@/config/redux/action/authAction";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import { validateImageFile } from "@/utils/files";
import styles from "./styles.module.css";

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;
const MAX_SKILLS = 30;
const MAX_ENTRIES = 20;

let rowCounter = 0;
const withKey = (item) => ({ ...item, _key: item._id || `new-${(rowCounter += 1)}` });
const stripKey = ({ _key, _id, ...rest }) => rest;

const EMPTY_WORK = { company: "", position: "", years: "" };
const EMPTY_EDUCATION = { school: "", degree: "", fieldOfStudy: "", years: "" };

/* ---------------- Profile photo ---------------- */
const PhotoSection = ({ user }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await dispatch(uploadProfilePicture(file)).unwrap();
      toast.success("Profile photo updated");
    } catch (err) {
      setError(err?.message || "Could not upload the picture");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await dispatch(removeProfilePicture()).unwrap();
      toast.success("Profile photo removed");
    } catch (err) {
      setError(err?.message || "Could not remove the picture");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`card card-padded ${styles.section}`} aria-labelledby="photo-heading">
      <h2 id="photo-heading" className="section-title">
        Profile photo
      </h2>
      <div className={styles.photoRow}>
        <Avatar src={user.profilePicture} name={user.name} size={96} />
        <div className={styles.photoActions}>
          <p className="muted text-sm">JPG, PNG, WebP, GIF or AVIF, up to 5 MB.</p>
          <div className={styles.buttonRow}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? "Saving…" : "Upload new photo"}
            </button>
            {user.profilePicture && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemove} disabled={busy}>
                Remove
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            hidden
            onChange={handleFile}
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

/* ---------------- Skills input ---------------- */
const SkillsInput = ({ skills, onChange }) => {
  const [value, setValue] = useState("");

  const addSkill = () => {
    const skill = value.trim().replace(/,$/, "");
    if (!skill) return;
    const exists = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (!exists && skills.length < MAX_SKILLS) onChange([...skills, skill.slice(0, 40)]);
    setValue("");
  };

  return (
    <div className="field">
      <label className="label" htmlFor="skill-input">
        Skills <span className="muted text-xs">({skills.length}/{MAX_SKILLS})</span>
      </label>
      {skills.length > 0 && (
        <ul className={styles.skillList}>
          {skills.map((skill) => (
            <li key={skill} className="chip">
              {skill}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => onChange(skills.filter((s) => s !== skill))}
                aria-label={`Remove ${skill}`}
              >
                <XIcon size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.inlineInput}>
        <input
          id="skill-input"
          className="input"
          value={value}
          placeholder="Type a skill and press Enter"
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addSkill();
            }
          }}
          disabled={skills.length >= MAX_SKILLS}
        />
        <button type="button" className="btn btn-outline btn-sm" onClick={addSkill} disabled={!value.trim()}>
          Add
        </button>
      </div>
    </div>
  );
};

/* ---------------- Repeating entries (experience / education) ---------------- */
const EntryList = ({ title, items, fields, emptyItem, onChange, addLabel }) => {
  const update = (key, field, value) =>
    onChange(items.map((item) => (item._key === key ? { ...item, [field]: value } : item)));

  return (
    <section className={`card card-padded ${styles.section}`}>
      <h2 className="section-title">{title}</h2>
      {items.length === 0 && <p className="muted text-sm">Nothing added yet.</p>}
      <div className={styles.entries}>
        {items.map((item, index) => (
          <fieldset key={item._key} className={styles.entry}>
            <legend className="visually-hidden">
              {title} {index + 1}
            </legend>
            <div className={styles.entryGrid}>
              {fields.map(({ name, label, placeholder }) => (
                <div key={name} className="field">
                  <label className="label" htmlFor={`${item._key}-${name}`}>
                    {label}
                  </label>
                  <input
                    id={`${item._key}-${name}`}
                    className="input"
                    value={item[name]}
                    placeholder={placeholder}
                    maxLength={120}
                    onChange={(e) => update(item._key, name, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${styles.removeEntry}`}
              onClick={() => onChange(items.filter((i) => i._key !== item._key))}
            >
              <TrashIcon size={16} /> Remove
            </button>
          </fieldset>
        ))}
      </div>
      {items.length < MAX_ENTRIES && (
        <button
          type="button"
          className={`btn btn-outline btn-sm ${styles.addEntry}`}
          onClick={() => onChange([...items, withKey(emptyItem)])}
        >
          <PlusIcon size={16} /> {addLabel}
        </button>
      )}
    </section>
  );
};

/* ---------------- Page ---------------- */
const SettingsForm = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector((state) => state.auth.user);
  const profile = useSelector((state) => state.auth.profile);

  const [form, setForm] = useState(() => ({
    name: user.name,
    username: user.username,
    currentPost: profile?.currentPost || "",
    location: profile?.location || "",
    bio: profile?.bio || "",
    skills: profile?.skills || [],
    pastWork: (profile?.pastWork || []).map(withKey),
    education: (profile?.education || []).map(withKey),
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const setFromEvent = (field) => (event) => set(field)(event.target.value);

  const validate = () => {
    const found = {};
    if (form.name.trim().length < 2) found.name = "Name must be at least 2 characters";
    if (!USERNAME_REGEX.test(form.username.trim())) {
      found.username = "3–30 characters: letters, numbers, dots or underscores";
    }
    return found;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const accountChanges = {};
      if (form.name.trim() !== user.name) accountChanges.name = form.name.trim();
      if (form.username.trim().toLowerCase() !== user.username) {
        accountChanges.username = form.username.trim().toLowerCase();
      }
      if (Object.keys(accountChanges).length) {
        await dispatch(updateAccount(accountChanges)).unwrap();
      }

      await dispatch(
        updateProfileData({
          currentPost: form.currentPost,
          location: form.location,
          bio: form.bio,
          skills: form.skills,
          pastWork: form.pastWork.map(stripKey),
          education: form.education.map(stripKey),
        })
      ).unwrap();
      toast.success("Profile saved");
    } catch (error) {
      setFormError(error?.message || "Could not save your profile");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const textField = (name, label, props = {}) => (
    <div className="field">
      <label className="label" htmlFor={`settings-${name}`}>
        {label}
      </label>
      <input
        id={`settings-${name}`}
        className="input"
        value={form[name]}
        onChange={setFromEvent(name)}
        aria-invalid={Boolean(errors[name])}
        {...props}
      />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </div>
  );

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Edit profile</h1>
        <Link href={`/profile/${user.username}`} className="btn btn-ghost btn-sm">
          View profile
        </Link>
      </div>

      <PhotoSection user={user} />

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}

        <section className={`card card-padded ${styles.section}`}>
          <h2 className="section-title">Basic information</h2>
          <div className={styles.grid2}>
            {textField("name", "Full name *", { maxLength: 60, autoComplete: "name" })}
            {textField("username", "Username *", { maxLength: 30, autoCapitalize: "none" })}
          </div>
          {textField("currentPost", "Headline", {
            maxLength: 120,
            placeholder: "e.g. Software Engineer at Acme",
          })}
          {textField("location", "Location", { maxLength: 100, placeholder: "e.g. Lahore, Pakistan" })}
          <div className="field">
            <label className="label" htmlFor="settings-bio">
              About
            </label>
            <textarea
              id="settings-bio"
              className="textarea"
              rows={5}
              maxLength={2000}
              value={form.bio}
              onChange={setFromEvent("bio")}
              placeholder="Tell people about your background, interests and goals."
            />
            <span className="muted text-xs">{form.bio.length}/2000</span>
          </div>
          <SkillsInput skills={form.skills} onChange={set("skills")} />
        </section>

        <EntryList
          title="Experience"
          items={form.pastWork}
          emptyItem={EMPTY_WORK}
          onChange={set("pastWork")}
          addLabel="Add experience"
          fields={[
            { name: "position", label: "Title", placeholder: "e.g. Frontend Developer" },
            { name: "company", label: "Company", placeholder: "e.g. Acme Inc." },
            { name: "years", label: "Period", placeholder: "e.g. 2024 – Present" },
          ]}
        />

        <EntryList
          title="Education"
          items={form.education}
          emptyItem={EMPTY_EDUCATION}
          onChange={set("education")}
          addLabel="Add education"
          fields={[
            { name: "school", label: "School", placeholder: "e.g. University of Lahore" },
            { name: "degree", label: "Degree", placeholder: "e.g. BS" },
            { name: "fieldOfStudy", label: "Field of study", placeholder: "e.g. Software Engineering" },
            { name: "years", label: "Period", placeholder: "e.g. 2022 – 2026" },
          ]}
        />

        <div className={styles.saveBar}>
          <Link href={`/profile/${user.username}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </>
  );
};

const SettingsPage = () => (
  <UserLayout title="Edit profile">
    <DashboardLayout showSuggestions={false}>
      <SettingsForm />
    </DashboardLayout>
  </UserLayout>
);

export default SettingsPage;
