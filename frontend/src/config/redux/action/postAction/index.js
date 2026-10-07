import { clientServer } from "@/config";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { toRejectValue } from "../authAction";

export const POSTS_PAGE_SIZE = 10;

/** Key of a post list in the store: the main feed or one user's posts. */
export const listKey = (author) => (author ? `user:${author}` : "feed");

export const getAllPosts = createAsyncThunk(
  "post/getAllPosts",
  async ({ page = 1, author } = {}, thunkAPI) => {
    try {
      const response = await clientServer.get("/api/posts", {
        params: { page, limit: POSTS_PAGE_SIZE, author },
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not load posts"));
    }
  }
);

export const createPost = createAsyncThunk("post/createPost", async ({ file, body }, thunkAPI) => {
  try {
    const formData = new FormData();
    formData.append("body", body || "");
    if (file) formData.append("media", file);
    const response = await clientServer.post("/api/posts", formData);
    return response.data.post;
  } catch (error) {
    return thunkAPI.rejectWithValue(toRejectValue(error, "Could not publish your post"));
  }
});

export const updatePost = createAsyncThunk("post/updatePost", async ({ postId, body }, thunkAPI) => {
  try {
    const response = await clientServer.patch(`/api/posts/${postId}`, { body });
    return response.data.post;
  } catch (error) {
    return thunkAPI.rejectWithValue(toRejectValue(error, "Could not save your changes"));
  }
});

export const deletePost = createAsyncThunk("post/deletePost", async ({ postId }, thunkAPI) => {
  try {
    await clientServer.delete(`/api/posts/${postId}`);
    return { postId };
  } catch (error) {
    return thunkAPI.rejectWithValue(toRejectValue(error, "Could not delete the post"));
  }
});

/** Like or unlike. The reducer updates the UI immediately and rolls back on failure. */
export const toggleLike = createAsyncThunk("post/toggleLike", async ({ postId, like }, thunkAPI) => {
  try {
    const response = like
      ? await clientServer.post(`/api/posts/${postId}/like`)
      : await clientServer.delete(`/api/posts/${postId}/like`);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(toRejectValue(error, "Could not update the like"));
  }
});

export const getAllComments = createAsyncThunk(
  "post/getAllComments",
  async ({ postId }, thunkAPI) => {
    try {
      const response = await clientServer.get(`/api/posts/${postId}/comments`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not load comments"));
    }
  }
);

export const postComment = createAsyncThunk(
  "post/postComment",
  async ({ postId, body }, thunkAPI) => {
    try {
      const response = await clientServer.post(`/api/posts/${postId}/comments`, { body });
      return response.data.comment;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not add your comment"));
    }
  }
);

export const deleteComment = createAsyncThunk(
  "post/deleteComment",
  async ({ commentId }, thunkAPI) => {
    try {
      const response = await clientServer.delete(`/api/comments/${commentId}`);
      return { commentId, postId: response.data.postId };
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not delete the comment"));
    }
  }
);
