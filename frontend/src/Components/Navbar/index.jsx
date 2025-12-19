import React from "react";
import styles from "./styles.module.css";
import { useRouter } from "next/router";

const NavbarComponent = () => {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <h2
          onClick={() => {
            router.push("/");
          }}
          style={{ cursor: "pointer" }}
        >
          Professional Network
        </h2>

        <div className={styles.navBarOptionContainer}>
          <div
            onClick={() => {
              router.push("/login");
            }}
            className={styles.buttonJoin}
          >
            <p>Be a part</p>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default NavbarComponent;
