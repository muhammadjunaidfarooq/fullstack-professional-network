import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../reducer/authReducer";

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
  },
});


