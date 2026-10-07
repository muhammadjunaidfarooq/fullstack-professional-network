import axios from "axios";

/**
 * Base URL of the backend API. Set NEXT_PUBLIC_API_URL in production
 * (e.g. https://your-api.onrender.com). The localhost fallback is only meant
 * for local development.
 */
export const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090").replace(
  /\/$/,
  ""
);

const TOKEN_KEY = "token";

const storage = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // storage can be blocked (private mode, strict settings)
  }
};

export const getToken = () => storage()?.getItem(TOKEN_KEY) || null;
export const setToken = (token) => storage()?.setItem(TOKEN_KEY, token);
export const clearToken = () => storage()?.removeItem(TOKEN_KEY);

export const clientServer = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

// Attach the session token to every request.
clientServer.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let unauthorizedHandler = null;

/** Called once by the app so an expired session sends the user back to login. */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

clientServer.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

/** Turn any axios error into a message that can be shown to the user. */
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (typeof error === "string") return error;
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (error?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (error?.request && !error?.response) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return error?.message || fallback;
};

/** Build a full URL for an image path returned by the API ("/media/…"). */
export const assetUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL}${path}`;
};
