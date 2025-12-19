import UserLayout from "@/layout/UserLayout";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import styles from "./style.module.css";

const LoginComponent = () => {
  const authState = useSelector((state) => state.auth);

  const router = useRouter();

  const [userLoginMethod, setUserLoginMethod] = useState(false);

  useEffect(() => {
    if (authState.loggedIn) {
      router.push("/dashboard");
    }
  });

  return (
    <UserLayout>
      <div className={styles.container}>
        <div className={styles.cardContainer}>
          <div className={styles.cardContainer_left}>
            <p className={styles.cardleft_heading}>
              {userLoginMethod ? "Sign In" : "Sign Up"}
            </p>

            <div className={styles.inputContainers}>
              <div className={styles.inputRow}>
                <input
                  className={styles.inputFields}
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Username"
                />

                <input
                  className={styles.inputFields}
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Name"
                />
              </div>

              <input
                className={styles.inputFields}
                type="email"
                id="email"
                name="email"
                placeholder="Email"
              />

              <input
                className={styles.inputFields}
                type="password"
                id="password"
                name="password"
                placeholder="Password"
              />

              <div className={styles.buttonWithOutline}>
                <p>{userLoginMethod ? "Sign In" : "Sign Up"}</p>
              </div>
            </div>
          </div>

          <div className={styles.cardContainer_right}></div>
        </div>
      </div>
    </UserLayout>
  );
};

export default LoginComponent;
