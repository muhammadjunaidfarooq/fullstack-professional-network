import Link from "next/link";
import Avatar from "@/Components/Avatar";
import ConnectionButton from "@/Components/ConnectionButton";
import { MapPinIcon } from "@/Components/Icons";
import styles from "./styles.module.css";

/** Person card used by search results. `card` = { user, headline, location, connection }. */
const UserCard = ({ card }) => {
  const { user, headline, location, connection } = card;
  const profileHref = `/profile/${user.username}`;

  return (
    <article className={`card ${styles.card}`}>
      <div className={styles.banner} />
      <Link href={profileHref} className={styles.identity}>
        <Avatar src={user.profilePicture} name={user.name} size={72} className={styles.avatar} />
        <h3 className={styles.name}>{user.name}</h3>
        <p className={styles.username}>@{user.username}</p>
        <p className={styles.headline}>{headline || "Member of Professional Network"}</p>
        {location && (
          <p className={styles.location}>
            <MapPinIcon size={14} /> {location}
          </p>
        )}
      </Link>
      <div className={styles.actions}>
        <ConnectionButton
          key={`${connection?.status}-${connection?.requestId}`}
          userId={user._id}
          name={user.name}
          connection={connection}
          fullWidth
        />
      </div>
    </article>
  );
};

export default UserCard;
