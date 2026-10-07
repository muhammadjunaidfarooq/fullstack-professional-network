import Head from "next/head";
import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { ToastProvider } from "@/Components/Toast";
import { getToken, setUnauthorizedHandler } from "@/config";
import { getAboutUser, logoutUser } from "@/config/redux/action/authAction";
import { SESSION_EXPIRED, setAuthChecked } from "@/config/redux/reducer/authReducer";
import { store } from "@/config/redux/store";
import "@/styles/globals.css";

/** Restores the session from the stored token once, when the app loads. */
const AuthBootstrap = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // If any request comes back 401 (expired/revoked session), clear all user
    // data. Protected pages (DashboardLayout) then redirect to the login page.
    setUnauthorizedHandler(() => {
      dispatch(logoutUser.fulfilled(true, SESSION_EXPIRED));
    });

    if (getToken()) dispatch(getAboutUser());
    else dispatch(setAuthChecked());
  }, [dispatch]);

  return null;
};

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <ToastProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Professional Network</title>
        </Head>
        <AuthBootstrap />
        <Component {...pageProps} />
      </ToastProvider>
    </Provider>
  );
}
