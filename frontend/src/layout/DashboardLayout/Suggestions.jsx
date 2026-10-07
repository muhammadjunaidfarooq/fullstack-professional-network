import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/Components/Avatar";
import ConnectionButton from "@/Components/ConnectionButton";
import { Spinner } from "@/Components/Feedback";
import { clientServer, getErrorMessage } from "@/config";
import styles from "./style.module.css";

/** "People you may know": a few members the user is not connected with yet. */
const Suggestions = () => {
  const [state, setState] = useState({ users: [], loading: true, error: "" });

  useEffect(() => {
    let cancelled = false;
    clientServer
      .get("/api/users/suggestions")
      .then((response) => {
        if (!cancelled) setState({ users: response.data.users, loading: false, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setState({ users: [], loading: false, error: getErrorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`card ${styles.suggestionsCard}`}>
      <h2 className={styles.suggestionsTitle}>People you may know</h2>

      {state.loading && (
        <div className={styles.suggestionsLoading}>
          <Spinner size={22} />
        </div>
      )}

      {state.error && <p className="muted text-sm">{state.error}</p>}

      {!state.loading && !state.error && state.users.length === 0 && (
        <p className="muted text-sm">You&apos;re connected with everyone here. Nice!</p>
      )}

      <ul className={styles.suggestionList}>
        {state.users.map(({ user, headline, connection }) => (
          <li key={user._id} className={styles.suggestion}>
            <Link href={`/profile/${user.username}`}>
              <Avatar src={user.profilePicture} name={user.name} size={44} />
            </Link>
            <div className={styles.suggestionText}>
              <Link href={`/profile/${user.username}`} className={styles.suggestionName}>
                {user.name}
              </Link>
              <p className={styles.suggestionHeadline}>{headline || `@${user.username}`}</p>
              <ConnectionButton userId={user._id} name={user.name} connection={connection} />
            </div>
          </li>
        ))}
      </ul>

      <Link href="/discover" className={styles.seeAll}>
        Discover more people →
      </Link>
    </div>
  );
};

export default Suggestions;
