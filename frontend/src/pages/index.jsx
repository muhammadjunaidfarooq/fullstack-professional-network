import { Geist, Geist_Mono } from "next/font/google";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {

  const router = useRouter();
  return (
    <>
      <div className={styles.container}>

        <div className={styles.mainContainer}>

          <div className={styles.mainContainer_left}>

            <p>Connect with Friends without any Exaggeration</p>

            <p>A true social media platform, with stories no bluffs.</p>

            <div onClick={() => {
              router.push("/login");
            }} className={styles.joinNowButton}>
              <p>Join Now</p>
            </div>

          </div>

          <div className={styles.mainContainer_right}>

            <img src="images/connections.svg" alt="" />

          </div>

        </div>

      </div>
    </>
  );
}

