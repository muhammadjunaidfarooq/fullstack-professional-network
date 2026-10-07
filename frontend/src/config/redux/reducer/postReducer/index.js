import { createSlice } from "@reduxjs/toolkit";
import {
  createPost,
  deleteComment,
  deletePost,
  getAllComments,
  getAllPosts,
  listKey,
  postComment,
  toggleLike,
  updatePost,
} from "../../action/postAction";
import { logoutUser } from "../../action/authAction";

/**
 * Posts are stored once in `entities` (by id). Lists such as the main feed or
 * a user's profile hold only ids, so liking a post updates it everywhere.
 */
const initialState = {
  entities: {},
  // { [key]: { ids, page, hasMore, isLoading, isLoadingMore, isError, message, fetched } }
  lists: {},
  // Comments are loaded per post when opened: { [postId]: { items, isLoading, error } }
  comments: {},
};

export const emptyList = {
  ids: [],
  page: 0,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  isError: false,
  message: "",
  fetched: false,
};

const ensureList = (state, key) => {
  if (!state.lists[key]) state.lists[key] = { ...emptyList, ids: [] };
  return state.lists[key];
};

const postSlice = createSlice({
  name: "post",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllPosts.pending, (state, action) => {
        const list = ensureList(state, listKey(action.meta.arg?.author));
        if ((action.meta.arg?.page || 1) === 1) list.isLoading = true;
        else list.isLoadingMore = true;
        list.isError = false;
        list.message = "";
      })
      .addCase(getAllPosts.fulfilled, (state, action) => {
        const list = ensureList(state, listKey(action.meta.arg?.author));
        const { posts, page, hasMore } = action.payload;
        posts.forEach((post) => {
          state.entities[post._id] = post;
        });
        const ids = posts.map((p) => p._id);
        if (page === 1) {
          list.ids = ids;
        } else {
          // Skip duplicates in case new posts shifted the pages.
          const seen = new Set(list.ids);
          list.ids.push(...ids.filter((id) => !seen.has(id)));
        }
        list.page = page;
        list.hasMore = hasMore;
        list.isLoading = false;
        list.isLoadingMore = false;
        list.fetched = true;
      })
      .addCase(getAllPosts.rejected, (state, action) => {
        const list = ensureList(state, listKey(action.meta.arg?.author));
        list.isLoading = false;
        list.isLoadingMore = false;
        list.isError = true;
        list.message = action.payload?.message || "Could not load posts";
      })
      .addCase(createPost.fulfilled, (state, action) => {
        const post = action.payload;
        state.entities[post._id] = post;
        [listKey(), listKey(post.author?._id)].forEach((key) => {
          if (state.lists[key]) state.lists[key].ids.unshift(post._id);
        });
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.entities[action.payload._id] = action.payload;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        const { postId } = action.payload;
        delete state.entities[postId];
        delete state.comments[postId];
        Object.values(state.lists).forEach((list) => {
          list.ids = list.ids.filter((id) => id !== postId);
        });
      })
      // Optimistic like/unlike: update now, roll back if the request fails.
      .addCase(toggleLike.pending, (state, action) => {
        const post = state.entities[action.meta.arg.postId];
        const { like } = action.meta.arg;
        if (post && post.likedByMe !== like) {
          post.likedByMe = like;
          post.likesCount += like ? 1 : -1;
        }
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const post = state.entities[action.payload.postId];
        if (post) {
          post.likesCount = action.payload.likesCount;
          post.likedByMe = action.payload.likedByMe;
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        const post = state.entities[action.meta.arg.postId];
        const { like } = action.meta.arg;
        if (post && post.likedByMe === like) {
          post.likedByMe = !like;
          post.likesCount += like ? -1 : 1;
        }
      })
      .addCase(getAllComments.pending, (state, action) => {
        const { postId } = action.meta.arg;
        state.comments[postId] = {
          items: state.comments[postId]?.items || [],
          isLoading: true,
          error: "",
        };
      })
      .addCase(getAllComments.fulfilled, (state, action) => {
        const { postId, comments } = action.payload;
        state.comments[postId] = { items: comments, isLoading: false, error: "" };
        if (state.entities[postId]) state.entities[postId].commentsCount = comments.length;
      })
      .addCase(getAllComments.rejected, (state, action) => {
        const { postId } = action.meta.arg;
        state.comments[postId] = {
          items: state.comments[postId]?.items || [],
          isLoading: false,
          error: action.payload?.message || "Could not load comments",
        };
      })
      .addCase(postComment.fulfilled, (state, action) => {
        const comment = action.payload;
        const entry = state.comments[comment.postId] || { items: [], isLoading: false, error: "" };
        entry.items.push(comment);
        state.comments[comment.postId] = entry;
        if (state.entities[comment.postId]) state.entities[comment.postId].commentsCount += 1;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { commentId, postId } = action.payload;
        const entry = state.comments[postId];
        if (entry) entry.items = entry.items.filter((c) => c._id !== commentId);
        const post = state.entities[postId];
        if (post) post.commentsCount = Math.max(0, post.commentsCount - 1);
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default postSlice.reducer;
