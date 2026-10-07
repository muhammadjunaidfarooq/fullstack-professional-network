import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Avatar from "@/Components/Avatar";
import ConnectionButton from "@/Components/ConnectionButton";
import { ErrorState, Spinner, StateMessage } from "@/Components/Feedback";
import { UsersIcon } from "@/Components/Icons";
import {
  getConnectionRequests,
  getMyConnections,
} from "@/config/redux/action/connectionAction";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import { timeAgoLong } from "@/utils/format";
import styles from "./styles.module.css";

const TABS = [
  {
    id: "connections",
    label: "Connections",
    status: "connected",
    empty: {
      title: "No connections yet",
      description: "Find people you know and send them an invitation.",
    },
    sinceLabel: "Connected",
  },
  {
    id: "received",
    label: "Invitations",
    status: "pending_received",
    empty: { title: "No pending invitations", description: "New invitations will appear here." },
    sinceLabel: "Received",
  },
  {
    id: "sent",
    label: "Sent",
    status: "pending_sent",
    empty: { title: "No sent invitations", description: "Invitations you send will appear here until answered." },
    sinceLabel: "Sent",
  },
];

const MyConnectionsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const lists = useSelector((state) => state.connections);
  const user = useSelector((state) => state.auth.user);

  const activeTab = TABS.find((tab) => tab.id === router.query.tab) || TABS[0];
  const list = lists[activeTab.id];

  const load = (tabId) => {
    if (tabId === "connections") dispatch(getMyConnections());
    else dispatch(getConnectionRequests({ type: tabId }));
  };

  // Refresh all three lists whenever the page is opened.
  useEffect(() => {
    if (!user) return;
    dispatch(getMyConnections());
    dispatch(getConnectionRequests({ type: "received" }));
    dispatch(getConnectionRequests({ type: "sent" }));
  }, [dispatch, user]);

  const selectTab = (tabId) => {
    router.replace({ pathname: "/my_connections", query: { tab: tabId } }, undefined, { shallow: true });
  };

  return (
    <UserLayout title="My Network">
      <DashboardLayout>
        <div className={`card ${styles.card}`}>
          <h1 className={styles.title}>My Network</h1>

          <div className={styles.tabs} role="tablist" aria-label="Network sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={tab.id === activeTab.id}
                aria-controls={`panel-${tab.id}`}
                className={`${styles.tab} ${tab.id === activeTab.id ? styles.tabActive : ""}`}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
                {lists[tab.id].fetched && <span className={styles.count}>{lists[tab.id].items.length}</span>}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${activeTab.id}`} aria-labelledby={`tab-${activeTab.id}`}>
            {list.isLoading && !list.fetched && (
              <div className={styles.loading}>
                <Spinner />
              </div>
            )}

            {list.error && !list.fetched && <ErrorState message={list.error} onRetry={() => load(activeTab.id)} />}

            {list.fetched && list.items.length === 0 && (
              <StateMessage
                icon={<UsersIcon size={40} />}
                title={activeTab.empty.title}
                description={activeTab.empty.description}
                action={
                  activeTab.id !== "received" && (
                    <Link href="/discover" className="btn btn-outline btn-sm">
                      Discover people
                    </Link>
                  )
                }
              />
            )}

            {list.fetched && list.items.length > 0 && (
              <ul className={styles.list}>
                {list.items.map((entry) => (
                  <li key={entry.requestId} className={styles.item}>
                    <Link href={`/profile/${entry.user.username}`} className={styles.person}>
                      <Avatar src={entry.user.profilePicture} name={entry.user.name} size={56} />
                      <div className={styles.personText}>
                        <span className={styles.personName}>{entry.user.name}</span>
                        <span className={styles.personHeadline}>{entry.headline || `@${entry.user.username}`}</span>
                        <span className="muted text-xs">
                          {activeTab.sinceLabel} {timeAgoLong(entry.since)}
                        </span>
                      </div>
                    </Link>
                    <div className={styles.actions}>
                      <ConnectionButton
                        userId={entry.user._id}
                        name={entry.user.name}
                        connection={{ status: activeTab.status, requestId: entry.requestId }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
};

export default MyConnectionsPage;
