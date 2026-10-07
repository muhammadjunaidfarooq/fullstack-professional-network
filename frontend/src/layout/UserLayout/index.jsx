import Head from "next/head";
import NavbarComponent from "@/Components/Navbar";
import styles from "./styles.module.css";

const UserLayout = ({ children, title }) => {
  const pageTitle = title ? `${title} | Professional Network` : "Professional Network";
  return (
    <div className={styles.page}>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <NavbarComponent />
      <main className={styles.main}>{children}</main>
    </div>
  );
};

export default UserLayout;
