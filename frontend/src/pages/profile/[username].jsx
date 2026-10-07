import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Avatar from "@/Components/Avatar";
import ConnectionButton from "@/Components/ConnectionButton";
import { ErrorState, PageLoader, StateMessage } from "@/Components/Feedback";
import {
  AcademicCapIcon,
  BriefcaseIcon,
  DownloadIcon,
  MapPinIcon,
  PencilIcon,
  UserIcon,
} from "@/Components/Icons";
import PostList from "@/Components/PostList";
import { useToast } from "@/Components/Toast";
import { clientServer, getErrorMessage } from "@/config";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import { downloadBlob } from "@/utils/files";
import { pluralize } from "@/utils/format";
import styles from "./styles.module.css";

const Section = ({ title, children, action }) => (
  <section className={`card card-padded ${styles.section}`}>
    <div className={styles.sectionHeader}>
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const EditLink = ({ label }) => (
  <Link href="/settings" className="btn btn-ghost btn-sm" aria-label={label} title={label}>
    <PencilIcon size={18} />
  </Link>
);

const ProfileContent = ({ username }) => {
  const toast = useToast();
  const [state, setState] = useState({ data: null, error: "", notFound: false });
  const [reloadKey, setReloadKey] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    clientServer
      .get(`/api/users/${encodeURIComponent(username)}`)
      .then((response) => {
        if (!cancelled) setState({ data: response.data, error: "", notFound: false });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          data: null,
          error: getErrorMessage(error),
          notFound: error?.response?.status === 404,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [username, reloadKey]);

  if (state.notFound) {
    return (
      <div className="card">
        <StateMessage
          icon={<UserIcon size={40} />}
          title="This profile doesn't exist"
          description={`We couldn't find anyone with the username @${username}.`}
          action={
            <Link href="/discover" className="btn btn-outline btn-sm">
              Search people
            </Link>
          }
        />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="card">
        <ErrorState message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    );
  }

  if (!state.data) return <PageLoader label="Loading profile" />;

  const { user, profile, connection, stats, isSelf } = state.data;

  const updateConnection = (next) => {
    const wasConnected = connection.status === "connected";
    const isConnected = next.status === "connected";
    setState({
      ...state,
      data: {
        ...state.data,
        connection: next,
        stats: {
          ...stats,
          connections: stats.connections + (isConnected && !wasConnected ? 1 : 0) - (wasConnected && !isConnected ? 1 : 0),
        },
      },
    });
  };

  const downloadResume = async () => {
    setDownloading(true);
    try {
      const response = await clientServer.get(`/api/users/${user._id}/resume`, { responseType: "blob" });
      downloadBlob(response.data, `${user.username}-resume.pdf`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not download the resume"));
    } finally {
      setDownloading(false);
    }
  };

  const hasDetails =
    profile.bio || profile.skills.length || profile.pastWork.length || profile.education.length;

  return (
    <>
      <section className={`card ${styles.header}`}>
        <div className={styles.banner} />
        <div className={styles.headerBody}>
          <Avatar src={user.profilePicture} name={user.name} size={128} className={styles.avatar} />
          <div className={styles.headerTop}>
            <div className={styles.identity}>
              <h1 className={styles.name}>{user.name}</h1>
              <p className={styles.headline}>{profile.currentPost || (isSelf ? "Add a headline to tell people what you do" : "")}</p>
              <p className={styles.meta}>
                <span>@{user.username}</span>
                {profile.location && (
                  <span className={styles.location}>
                    <MapPinIcon size={15} /> {profile.location}
                  </span>
                )}
              </p>
              <p className={styles.stats}>
                <span>{pluralize(stats.connections, "connection")}</span>
                <span aria-hidden="true">·</span>
                <span>{pluralize(stats.posts, "post")}</span>
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            {isSelf ? (
              <Link href="/settings" className="btn btn-primary">
                <PencilIcon size={16} /> Edit profile
              </Link>
            ) : (
              <ConnectionButton
                key={`${connection.status}-${connection.requestId}`}
                userId={user._id}
                name={user.name}
                connection={connection}
                onChange={updateConnection}
                size="md"
              />
            )}
            <button type="button" className="btn btn-secondary" onClick={downloadResume} disabled={downloading}>
              <DownloadIcon size={16} /> {downloading ? "Preparing…" : "Resume PDF"}
            </button>
          </div>
        </div>
      </section>

      {!hasDetails && isSelf && (
        <section className={`card card-padded ${styles.section}`}>
          <h2 className="section-title">Complete your profile</h2>
          <p className="muted">
            Add an about section, your skills, experience and education so people know who you are.
          </p>
          <Link href="/settings" className="btn btn-outline btn-sm" style={{ marginTop: "0.75rem" }}>
            Add profile details
          </Link>
        </section>
      )}

      {profile.bio && (
        <Section title="About" action={isSelf && <EditLink label="Edit about" />}>
          <p className={styles.bio}>{profile.bio}</p>
        </Section>
      )}

      {profile.skills.length > 0 && (
        <Section title="Skills" action={isSelf && <EditLink label="Edit skills" />}>
          <ul className={styles.skills}>
            {profile.skills.map((skill) => (
              <li key={skill} className="chip">
                {skill}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {profile.pastWork.length > 0 && (
        <Section title="Experience" action={isSelf && <EditLink label="Edit experience" />}>
          <ul className={styles.entries}>
            {profile.pastWork.map((work) => (
              <li key={work._id || `${work.company}-${work.position}`} className={styles.entry}>
                <span className={styles.entryIcon}>
                  <BriefcaseIcon size={22} />
                </span>
                <div>
                  <p className={styles.entryTitle}>{work.position || "Role"}</p>
                  <p>{work.company}</p>
                  {work.years && <p className="muted text-sm">{work.years}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {profile.education.length > 0 && (
        <Section title="Education" action={isSelf && <EditLink label="Edit education" />}>
          <ul className={styles.entries}>
            {profile.education.map((edu) => (
              <li key={edu._id || `${edu.school}-${edu.degree}`} className={styles.entry}>
                <span className={styles.entryIcon}>
                  <AcademicCapIcon size={22} />
                </span>
                <div>
                  <p className={styles.entryTitle}>{edu.school || "School"}</p>
                  {(edu.degree || edu.fieldOfStudy) && (
                    <p>{[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}</p>
                  )}
                  {edu.years && <p className="muted text-sm">{edu.years}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <h2 className={styles.activityTitle}>Activity</h2>
      <PostList
        author={user._id}
        emptyTitle={isSelf ? "You haven't posted yet" : `${user.name} hasn't posted yet`}
        emptyDescription={isSelf ? "Share your first update from the feed." : undefined}
      />
    </>
  );
};

const ProfilePage = () => {
  const router = useRouter();
  const username = typeof router.query.username === "string" ? router.query.username : "";

  return (
    <UserLayout title={username ? `@${username}` : "Profile"}>
      <DashboardLayout showSidebar={false}>
        {router.isReady && username ? <ProfileContent key={username} username={username} /> : null}
      </DashboardLayout>
    </UserLayout>
  );
};

export default ProfilePage;
