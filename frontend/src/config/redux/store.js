import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./reducer/authReducer";
import postReducer from "./reducer/postReducer";
import connectionReducer from "./reducer/connectionReducer";

/**
 * State management steps:
 * 1. Dispatch an async action (thunk) from a component.
 * 2. Handle its pending / fulfilled / rejected cases in the matching reducer.
 * 3. Register the reducer here.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    postReducer: postReducer,
    connections: connectionReducer,
  },
});
