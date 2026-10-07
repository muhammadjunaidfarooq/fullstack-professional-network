/* eslint-disable @next/next/no-img-element -- static SVG illustration */
import Link from "next/link";
import { useSelector } from "react-redux";
import { BriefcaseIcon, ChatIcon, UsersIcon } from "@/Components/Icons";
import UserLayout from "@/layout/UserLayout";
import styles from "../styles/Home.module.css";

const FEATURES = [
  {
    Icon: BriefcaseIcon,
    title: "Build your profile",
    text: "Show your headline, experience, education and skills — and export it as a PDF resume.",
  },
  {
    Icon: UsersIcon,
    title: "Grow your network",
    text: "Find people by name, role or skill and connect with them in one click.",
  },
  {
    Icon: ChatIcon,
    title: "Share real stories",
    text: "Post updates and photos, and join the conversation with likes and comments.",
  },
];

export default function Home() {
  const { user, authChecked } = useSelector((state) => state.auth);

  return (
    <UserLayout>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Connect with professionals, without the exaggeration.</h1>
          <p className={styles.subtitle}>
            A professional network built on real stories, not bluffs. Create your profile, grow
            your connections and share what you are working on.
          </p>

          <div className={styles.ctaRow}>
            {authChecked && user ? (
              <Link href="/dashboard" className="btn btn-primary">
                Go to your feed
              </Link>
            ) : (
              <>
                <Link href="/login?mode=signup" className="btn btn-primary">
                  Join now — it&apos;s free
                </Link>
                <Link href="/login" className="btn btn-outline">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        <div className={styles.heroImage}>
          <img src="/images/connections.svg" alt="People connected in a network" width={520} height={420} />
        </div>
      </section>

      <section className={styles.features} aria-label="Features">
        {FEATURES.map(({ Icon, title, text }) => (
          <div key={title} className={`card ${styles.feature}`}>
            <span className={styles.featureIcon}>
              <Icon size={26} />
            </span>
            <h2 className={styles.featureTitle}>{title}</h2>
            <p className={styles.featureText}>{text}</p>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Professional Network · Built with Next.js, Express and MongoDB</p>
      </footer>
    </UserLayout>
  );
}
