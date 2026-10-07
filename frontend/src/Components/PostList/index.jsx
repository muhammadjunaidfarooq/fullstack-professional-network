import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ErrorState, Spinner, StateMessage } from "@/Components/Feedback";
import { ChatIcon } from "@/Components/Icons";
import PostCard from "@/Components/PostCard";
import { getAllPosts, listKey } from "@/config/redux/action/postAction";
import { emptyList } from "@/config/redux/reducer/postReducer";
import styles from "./styles.module.css";

/** Paginated list of posts: the main feed, or one user's posts when `author` is set. */
const PostList = ({ author, emptyTitle = "No posts yet", emptyDescription }) => {
  const dispatch = useDispatch();
  const list = useSelector((state) => state.postReducer.lists[listKey(author)]) || emptyList;

  useEffect(() => {
    dispatch(getAllPosts({ page: 1, author }));
  }, [dispatch, author]);

  const loadMore = () => dispatch(getAllPosts({ page: list.page + 1, author }));
  const retry = () => dispatch(getAllPosts({ page: list.fetched ? list.page + 1 : 1, author }));

  if (!list.fetched && list.isError) {
    return (
      <div className="card">
        <ErrorState message={list.message} onRetry={retry} />
      </div>
    );
  }

  if (!list.fetched) {
    return (
      <div className={styles.loading}>
        <Spinner label="Loading posts" />
      </div>
    );
  }

  if (list.ids.length === 0) {
    return (
      <div className="card">
        <StateMessage icon={<ChatIcon size={40} />} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {list.ids.map((id) => (
        <PostCard key={id} postId={id} />
      ))}

      {list.isError && (
        <p className="alert alert-error" role="alert">
          {list.message}{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>
            Retry
          </button>
        </p>
      )}

      {list.hasMore && !list.isError && (
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={loadMore}
          disabled={list.isLoadingMore}
        >
          {list.isLoadingMore ? "Loading…" : "Show more posts"}
        </button>
      )}

      {!list.hasMore && list.ids.length > 3 && (
        <p className={`muted text-sm ${styles.end}`}>You&apos;re all caught up.</p>
      )}
    </div>
  );
};

export default PostList;
