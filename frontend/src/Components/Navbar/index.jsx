import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "@/Components/Avatar";
import { HomeIcon, LogoutIcon, SearchIcon, UsersIcon } from "@/Components/Icons";
import { logoutUser } from "@/config/redux/action/authAction";
import { getConnectionRequests } from "@/config/redux/action/connectionAction";
import styles from "./styles.module.css";

const NAV_LINKS = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/discover", label: "Discover", Icon: SearchIcon },
  { href: "/my_connections", label: "My Network", Icon: UsersIcon, badge: "invitations" },
];

const NavbarComponent = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, authChecked } = useSelector((state) => state.auth);
  const received = useSelector((state) => state.connections.received);

  // Load pending invitations once so the "My Network" badge is accurate.
  useEffect(() => {
    if (user && !received.fetched && !received.isLoading && !received.error) {
      dispatch(getConnectionRequests({ type: "received" }));
    }
  }, [user, received.fetched, received.isLoading, received.error, dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.replace("/login");
  };

  const isActive = (href) => router.pathname === href || router.pathname.startsWith(`${href}/`);
  const invitationCount = received.items.length;

  const renderLinks = (className, activeClassName) =>
    NAV_LINKS.map(({ href, label, Icon, badge }) => (
      <Link
        key={href}
        href={href}
        className={`${className} ${isActive(href) ? activeClassName : ""}`}
        aria-current={isActive(href) ? "page" : undefined}
      >
        <span className={styles.iconWrap}>
          <Icon size={22} />
          {badge === "invitations" && invitationCount > 0 && (
            <span className={styles.badge} aria-label={`${invitationCount} pending invitations`}>
              {invitationCount > 9 ? "9+" : invitationCount}
            </span>
          )}
        </span>
        <span>{label}</span>
      </Link>
    ));

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.navbar} aria-label="Main">
          <Link href={user ? "/dashboard" : "/"} className={styles.brand}>
            <span className={styles.logo} aria-hidden="true">
              PN
            </span>
            <span className={styles.brandName}>Professional Network</span>
          </Link>

          {authChecked && user && (
            <div className={styles.right}>
              <div className={styles.desktopLinks}>{renderLinks(styles.navLink, styles.navLinkActive)}</div>
              <Link
                href={`/profile/${user.username}`}
                className={`${styles.navLink} ${
                  router.query.username === user.username ? styles.navLinkActive : ""
                }`}
                aria-label="View your profile"
              >
                <Avatar src={user.profilePicture} name={user.name} size={26} />
                <span className={styles.meLabel}>Me</span>
              </Link>
              <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                <LogoutIcon size={20} />
                <span className={styles.logoutLabel}>Log out</span>
              </button>
            </div>
          )}

          {authChecked && !user && (
            <div className={styles.right}>
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn btn-outline">
                Join now
              </Link>
            </div>
          )}
        </nav>
      </header>

      {authChecked && user && (
        <nav className={styles.bottomNav} aria-label="Mobile">
          {renderLinks(styles.bottomLink, styles.bottomLinkActive)}
        </nav>
      )}
    </>
  );
};

export default NavbarComponent;
