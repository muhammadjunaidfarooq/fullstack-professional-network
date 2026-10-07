import UserLayout from "@/layout/UserLayout";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./style.module.css";
import { loginUser, registerUser } from "@/config/redux/action/authAction";
import { emptyMessage } from "@/config/redux/reducer/authReducer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

/** Only allow redirects to pages of this site (prevents open redirects). */
const safeNext = (next) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

const validate = (form, isLoginMode) => {
  const errors = {};
  if (!isLoginMode) {
    if (form.name.trim().length < 2) errors.name = "Please enter your full name";
    if (!USERNAME_REGEX.test(form.username.trim())) {
      errors.username = "3–30 characters: letters, numbers, dots or underscores";
    }
  }
  if (!EMAIL_REGEX.test(form.email.trim())) errors.email = "Please enter a valid email address";
  if (isLoginMode) {
    if (!form.password) errors.password = "Please enter your password";
  } else if (form.password.length < 8) {
    errors.password = "Use at least 8 characters";
  }
  return errors;
};

const LoginComponent = () => {
  const authState = useSelector((state) => state.auth);
  const router = useRouter();
  const dispatch = useDispatch();

  const isLoginMode = router.query.mode !== "signup";
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  // Logged-in users do not need this page.
  useEffect(() => {
    if (authState.loggedIn) {
      router.replace(safeNext(router.query.next));
    }
  }, [authState.loggedIn, router]);

  const switchMode = () => {
    setErrors({});
    dispatch(emptyMessage());
    router.replace(
      { pathname: "/login", query: { ...router.query, mode: isLoginMode ? "signup" : "signin" } },
      undefined,
      { shallow: true }
    );
  };

  const updateField = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validate(form, isLoginMode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (isLoginMode) {
      dispatch(loginUser({ email: form.email.trim(), password: form.password }));
    } else {
      dispatch(
        registerUser({
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          email: form.email.trim(),
          password: form.password,
        })
      );
    }
  };

  const field = (name, label, props = {}) => (
    <div className="field">
      <label className="label" htmlFor={`auth-${name}`}>
        {label}
      </label>
      <input
        id={`auth-${name}`}
        className="input"
        value={form[name]}
        onChange={updateField(name)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `auth-${name}-error` : undefined}
        {...props}
      />
      {errors[name] && (
        <span id={`auth-${name}-error`} className="field-error">
          {errors[name]}
        </span>
      )}
    </div>
  );

  // The ?mode= query is only known after hydration; avoid flashing the wrong form.
  if (!router.isReady) return <UserLayout title="Sign in" />;

  return (
    <UserLayout title={isLoginMode ? "Sign in" : "Join now"}>
      <div className={styles.container}>
        <div className={styles.cardContainer}>
          <div className={styles.cardContainer_left}>
            <h1 className={styles.cardleft_heading}>{isLoginMode ? "Sign in" : "Join the network"}</h1>
            <p className={styles.cardleft_subheading}>
              {isLoginMode
                ? "Stay updated on your professional world."
                : "Create your profile and start connecting."}
            </p>

            {router.query.expired && isLoginMode && !authState.message && (
              <p className="alert alert-error">Your session has expired. Please sign in again.</p>
            )}

            {authState.isError && authState.message && (
              <p className="alert alert-error" role="alert">
                {authState.message}
              </p>
            )}

            <form className={styles.inputContainers} onSubmit={handleSubmit} noValidate>
              {!isLoginMode && (
                <div className={styles.inputRow}>
                  {field("name", "Full name", { type: "text", autoComplete: "name", maxLength: 60 })}
                  {field("username", "Username", {
                    type: "text",
                    autoComplete: "username",
                    autoCapitalize: "none",
                    maxLength: 30,
                  })}
                </div>
              )}

              {field("email", "Email", { type: "email", autoComplete: "email", autoCapitalize: "none" })}
              {field("password", "Password", {
                type: "password",
                autoComplete: isLoginMode ? "current-password" : "new-password",
                maxLength: 72,
              })}

              <button type="submit" className="btn btn-primary btn-block" disabled={authState.isLoading}>
                {authState.isLoading
                  ? isLoginMode
                    ? "Signing in…"
                    : "Creating account…"
                  : isLoginMode
                    ? "Sign in"
                    : "Agree & join"}
              </button>
            </form>
          </div>

          <div className={styles.cardContainer_right}>
            <p className={styles.switchText}>
              {isLoginMode ? "New to Professional Network?" : "Already have an account?"}
            </p>
            <button type="button" className={styles.switchButton} onClick={switchMode}>
              {isLoginMode ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default LoginComponent;
