import UserLayout from "@/layout/UserLayout";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./style.module.css";
import { loginUser, registerUser } from "@/config/redux/action/authAction";
import { emptyMessage } from "@/config/redux/reducer/authReducer";

const LoginComponent = () => {
  const authState = useSelector((state) => state.auth);
  const router = useRouter();
  const dispatch = useDispatch();

  // State for toggling between Login and Register
  const [isLoginMode, setIsLoginMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");

  // FIX: Added dependency array [authState.loggedIn, router]
  // to prevent unnecessary re-runs.
  useEffect(() => {
    if (authState.loggedIn) {
      router.push("/dashboard");
    }
  }, [authState.loggedIn, router]);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      router.push("/dashboard");
    }
  }, []);

  useEffect(() => {
    dispatch(emptyMessage());
  }, [isLoginMode]);

  const handleSubmit = () => {
    if (isLoginMode) {
      // This actually logs the user in
      dispatch(loginUser({ email, password }));
    } else {
      // This registers the user
      dispatch(registerUser({ email, password, username, name }));
    }
  };

  return (
    <UserLayout>
      <div className={styles.container}>
        <div className={styles.cardContainer}>
          <div className={styles.cardContainer_left}>
            <p className={styles.cardleft_heading}>
              {isLoginMode ? "Sign In" : "Sign Up"}
            </p>

            {/* Display error/success messages safely */}
            {authState.message && (
              <p style={{ color: authState.isError ? "red" : "green" }}>
                {authState.message.message || authState.message}
              </p>
            )}

            <div className={styles.inputContainers}>
              {/* Show Username/Name ONLY during Registration */}
              {!isLoginMode && (
                <div className={styles.inputRow}>
                  <input
                    className={styles.inputFields}
                    onChange={(e) => setUsername(e.target.value)}
                    type="text"
                    placeholder="Username"
                  />
                  <input
                    className={styles.inputFields}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    placeholder="Name"
                  />
                </div>
              )}

              <input
                className={styles.inputFields}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
              />

              <input
                className={styles.inputFields}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
              />

              <div className={styles.buttonWithOutline} onClick={handleSubmit}>
                <p>{isLoginMode ? "Sign In" : "Sign Up"}</p>
              </div>
            </div>
          </div>

          <div className={styles.cardContainer_right}>
            {isLoginMode ? (
              <p>Don't have an account?</p>
            ) : (
              <p>Already have an account?</p>
            )}
            <div
              style={{ color: "black", textAlign: "center" }}
              className={styles.buttonWithOutline}
              onClick={() => {
                setIsLoginMode(!isLoginMode);
              }}
            >
              <p>{isLoginMode ? "Sign Up" : "Sign In"}</p>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default LoginComponent;
