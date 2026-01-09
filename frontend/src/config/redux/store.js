import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/reducer/authReducer/index.js";
import postReducer from "../redux/reducer/postReducer/index.js";
/**
 *
 * STEPS for state management
 * Submit action
 * Handle action in its reducer
 * Register Here -> Reducer
 *
 */

export const store = configureStore({
  reducer: {
    auth: authReducer,
    postReducer: postReducer,
  },
});


