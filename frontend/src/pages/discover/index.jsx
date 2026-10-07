import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { ErrorState, Spinner, StateMessage } from "@/Components/Feedback";
import { SearchIcon, UsersIcon } from "@/Components/Icons";
import UserCard from "@/Components/UserCard";
import { clientServer, getErrorMessage } from "@/config";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import styles from "./styles.module.css";

const PAGE_SIZE = 12;

const fetchPeople = (search, page) =>
  clientServer.get("/api/users", { params: { search: search || undefined, page, limit: PAGE_SIZE } });

const DiscoverContent = ({ initialQuery }) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  const [reloadKey, setReloadKey] = useState(0);
  const [results, setResults] = useState({ key: null, users: [], page: 1, hasMore: false, total: 0, error: "" });
  const [loadingMore, setLoadingMore] = useState(false);

  const requestKey = `${debounced}|${reloadKey}`;
  const loading = results.key !== requestKey;

  // Wait until the user stops typing before searching.
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    fetchPeople(debounced, 1)
      .then((response) => {
        if (cancelled) return;
        const { users, page, hasMore, total } = response.data;
        setResults({ key: requestKey, users, page, hasMore, total, error: "" });
      })
      .catch((error) => {
        if (!cancelled) {
          setResults({ key: requestKey, users: [], page: 1, hasMore: false, total: 0, error: getErrorMessage(error) });
        }
      });

    // Keep the search in the URL so it survives refresh / back navigation.
    const currentQ = typeof router.query.q === "string" ? router.query.q : "";
    if (currentQ !== debounced) {
      router.replace({ pathname: "/discover", query: debounced ? { q: debounced } : {} }, undefined, {
        shallow: true,
      });
    }

    return () => {
      cancelled = true;
    };
    // router is intentionally left out: replacing the URL must not trigger a new search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, reloadKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await fetchPeople(debounced, results.page + 1);
      const seen = new Set(results.users.map((card) => card.user._id));
      setResults({
        ...results,
        users: [...results.users, ...response.data.users.filter((card) => !seen.has(card.user._id))],
        page: response.data.page,
        hasMore: response.data.hasMore,
      });
    } catch (error) {
      setResults({ ...results, error: getErrorMessage(error) });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <div className={`card ${styles.searchCard}`}>
        <h1 className={styles.title}>Discover people</h1>
        <p className="muted text-sm">Search by name, username, headline, skill or location.</p>
        <div className={styles.searchBox}>
          <SearchIcon size={20} className={styles.searchIcon} />
          <label htmlFor="people-search" className="visually-hidden">
            Search people
          </label>
          <input
            id="people-search"
            type="search"
            className={styles.searchInput}
            placeholder="e.g. React developer, Lahore, Ayesha…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            autoComplete="off"
          />
        </div>
        {!loading && !results.error && (
          <p className={`muted text-sm ${styles.count}`} aria-live="polite">
            {results.total === 0
              ? "No people found"
              : `${results.total} ${results.total === 1 ? "person" : "people"}${debounced ? ` matching “${debounced}”` : ""}`}
          </p>
        )}
      </div>

      {loading && (
        <div className={styles.loading}>
          <Spinner label="Searching" />
        </div>
      )}

      {!loading && results.error && results.users.length === 0 && (
        <div className="card">
          <ErrorState message={results.error} onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      )}

      {!loading && !results.error && results.users.length === 0 && (
        <div className="card">
          <StateMessage
            icon={<UsersIcon size={40} />}
            title={debounced ? "No matches" : "No other members yet"}
            description={
              debounced
                ? "Try a different name, skill or location."
                : "When other people join, they will show up here."
            }
          />
        </div>
      )}

      {!loading && results.users.length > 0 && (
        <>
          <div className={styles.grid}>
            {results.users.map((card) => (
              <UserCard key={card.user._id} card={card} />
            ))}
          </div>
          {results.error && <p className="alert alert-error">{results.error}</p>}
          {results.hasMore && (
            <button type="button" className="btn btn-secondary btn-block" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Show more people"}
            </button>
          )}
        </>
      )}
    </>
  );
};

const DiscoverPage = () => {
  const router = useRouter();
  const initialQuery = typeof router.query.q === "string" ? router.query.q : "";

  return (
    <UserLayout title="Discover">
      <DashboardLayout showSuggestions={false}>
        {router.isReady ? <DiscoverContent initialQuery={initialQuery} /> : null}
      </DashboardLayout>
    </UserLayout>
  );
};

export default DiscoverPage;
