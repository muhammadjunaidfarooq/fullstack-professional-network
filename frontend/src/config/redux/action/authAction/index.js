import { clearToken, clientServer, getErrorMessage, setToken } from "@/config";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const toRejectValue = (error, fallback) => ({
  message: getErrorMessage(error, fallback),
  status: error?.response?.status || null,
  details: error?.response?.data?.details || null,
});

export const loginUser = createAsyncThunk("user/login", async (user, thunkAPI) => {
  try {
    const response = await clientServer.post("/api/auth/login", {
      email: user.email,
      password: user.password,
    });
    setToken(response.data.token);
    const me = await clientServer.get("/api/auth/me");
    return me.data;
  } catch (error) {
    clearToken();
    return thunkAPI.rejectWithValue(toRejectValue(error, "Login failed"));
  }
});

export const registerUser = createAsyncThunk("user/register", async (user, thunkAPI) => {
  try {
    const response = await clientServer.post("/api/auth/register", {
      username: user.username,
      password: user.password,
      email: user.email,
      name: user.name,
    });
    // Registration also signs the user in.
    setToken(response.data.token);
    return { user: response.data.user, profile: response.data.profile };
  } catch (error) {
    return thunkAPI.rejectWithValue(toRejectValue(error, "Registration failed"));
  }
});

export const getAboutUser = createAsyncThunk("user/getAboutUser", async (_, thunkAPI) => {
  try {
    const response = await clientServer.get("/api/auth/me");
    return response.data;
  } catch (error) {
    if (error?.response?.status === 401) clearToken();
    return thunkAPI.rejectWithValue(toRejectValue(error));
  }
});

export const logoutUser = createAsyncThunk("user/logout", async () => {
  try {
    await clientServer.post("/api/auth/logout");
  } catch {
    // Even if the request fails, the local session is cleared below.
  } finally {
    clearToken();
  }
  return true;
});

export const updateAccount = createAsyncThunk("user/updateAccount", async (data, thunkAPI) => {
  try {
    const response = await clientServer.patch("/api/users/me", data);
    return response.data.user;
  } catch (error) {
    return thunkAPI.rejectWithValue(toRejectValue(error, "Could not update your account"));
  }
});

export const updateProfileData = createAsyncThunk(
  "user/updateProfileData",
  async (data, thunkAPI) => {
    try {
      const response = await clientServer.patch("/api/users/me/profile", data);
      return response.data.profile;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not update your profile"));
    }
  }
);

export const uploadProfilePicture = createAsyncThunk(
  "user/uploadProfilePicture",
  async (file, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("profile_picture", file);
      const response = await clientServer.post("/api/users/me/avatar", formData);
      return response.data.user;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not upload the picture"));
    }
  }
);

export const removeProfilePicture = createAsyncThunk(
  "user/removeProfilePicture",
  async (_, thunkAPI) => {
    try {
      const response = await clientServer.delete("/api/users/me/avatar");
      return response.data.user;
    } catch (error) {
      return thunkAPI.rejectWithValue(toRejectValue(error, "Could not remove the picture"));
    }
  }
);
