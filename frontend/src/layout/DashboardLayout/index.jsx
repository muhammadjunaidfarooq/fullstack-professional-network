import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "@/Components/Avatar";
import { ErrorState, PageLoader } from "@/Components/Feedback";
import { HomeIcon, MapPinIcon, SearchIcon, UsersIcon } from "@/Components/Icons";
import { getToken } from "@/config";
import { getAboutUser } from "@/config/redux/action/authAction";
import Suggestions from "./Suggestions";
import styles from "./style.module.css";

const SIDEBAR_LINKS = [
  { href: "/dashboard", label: "Feed", Icon: HomeIcon },
  { href: "/discover", label: "Discover people", Icon: SearchIcon },
  { href: "/my_connections", label: "My Network", Icon: UsersIcon },
];

/**
 * Layout for pages that require a logged-in user. Redirects to /login when
 * there is no valid session and shows a 3-column layout on wide screens.
 */
const DashboardLayout = ({ children, showSidebar = true, showSuggestions = true }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile, authChecked, message, sessionExpired } = useSelector((state) => state.auth);
  const hasToken = authChecked && Boolean(getToken());

  useEffect(() => {
    if (authChecked && !user && !getToken()) {
      router.replace({
        pathname: "/login",
        query: { next: router.asPath, ...(sessionExpired ? { expired: 1 } : {}) },
      });
    }
  }, [authChecked, user, sessionExpired, router]);

  if (!authChecked || (!user && !hasToken)) {
    return <PageLoader label="Checking your session" />;
  }

  if (!user) {
    // We have a token but could not reach the server (network/server error).
    return (
      <div className={styles.errorWrap}>
        <div className="card">
          <ErrorState message={message} onRetry={() => dispatch(getAboutUser())} />
        </div>
      </div>
    );
  }

  const layoutClass = [
    styles.layout,
    showSidebar ? styles.withSidebar : "",
    showSuggestions ? styles.withSuggestions : "",
  ].join(" ");

  return (
    <div className={layoutClass}>
      {showSidebar && (
        <aside className={styles.sidebar} aria-label="Your profile">
          <div className={`card ${styles.profileCard}`}>
            <div className={styles.profileBanner} />
            <Link href={`/profile/${user.username}`} className={styles.profileIdentity}>
              <Avatar src={user.profilePicture} name={user.name} size={64} className={styles.profileAvatar} />
              <span className={styles.profileName}>{user.name}</span>
            </Link>
            <p className={styles.profileHeadline}>
              {profile?.currentPost || (
                <Link href="/settings" className={styles.addHeadline}>
                  + Add a headline
                </Link>
              )}
            </p>
            {profile?.location && (
              <p className={styles.profileLocation}>
                <MapPinIcon size={14} /> {profile.location}
              </p>
            )}
            <hr className="divider" />
            <nav className={styles.sideNav} aria-label="Sections">
              {SIDEBAR_LINKS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.sideNavLink} ${router.pathname === href ? styles.sideNavActive : ""}`}
                >
                  <Icon size={18} /> {label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <div className={styles.content}>{children}</div>

      {showSuggestions && (
        <aside className={styles.suggestions} aria-label="People you may know">
          <Suggestions />
        </aside>
      )}
    </div>
  );
};

export default DashboardLayout;
