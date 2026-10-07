import { createSlice } from "@reduxjs/toolkit";
import {
  getAboutUser,
  loginUser,
  logoutUser,
  registerUser,
  removeProfilePicture,
  updateAccount,
  updateProfileData,
  uploadProfilePicture,
} from "../../action/authAction";

/** requestId used when the app logs the user out because the server returned 401. */
export const SESSION_EXPIRED = "session-expired";

const initialState = {
  user: null, // the logged-in account: { _id, name, username, email, profilePicture }
  profile: null, // professional details: { bio, currentPost, skills, pastWork, education, ... }
  authChecked: false, // true once we know whether the stored token is valid
  loggedIn: false,
  isLoading: false,
  isError: false,
  message: "",
  sessionExpired: false, // true when the server rejected our token (401)
};

const setSession = (state, action) => {
  state.user = action.payload.user;
  state.profile = action.payload.profile;
  state.loggedIn = true;
  state.authChecked = true;
  state.isLoading = false;
  state.isError = false;
  state.message = "";
  state.sessionExpired = false;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    emptyMessage: (state) => {
      state.message = "";
      state.isError = false;
    },
    setAuthChecked: (state) => {
      state.authChecked = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(loginUser.fulfilled, setSession)
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || "Login failed";
      })
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(registerUser.fulfilled, setSession)
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || "Registration failed";
      })
      .addCase(getAboutUser.fulfilled, setSession)
      .addCase(getAboutUser.rejected, (state, action) => {
        state.authChecked = true;
        // Only a 401 means "logged out"; a network error keeps the token for a retry.
        if (action.payload?.status === 401) {
          state.user = null;
          state.profile = null;
          state.loggedIn = false;
        } else {
          state.isError = true;
          state.message = action.payload?.message || "Could not load your account";
        }
      })
      .addCase(logoutUser.fulfilled, (state, action) => ({
        ...initialState,
        authChecked: true,
        sessionExpired: action.meta.requestId === SESSION_EXPIRED,
      }))
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(uploadProfilePicture.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(removeProfilePicture.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfileData.fulfilled, (state, action) => {
        state.profile = action.payload;
      });
  },
});

export const { emptyMessage, setAuthChecked } = authSlice.actions;

export default authSlice.reducer;
