import { getAboutUser } from "@/config/redux/action/authAction";
import { getAllPosts } from "@/config/redux/action/postAction";
import UserLayout from "@/layout/UserLayout";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const Dashboard = () => {

  const dispatch = useDispatch();

  const authState = useSelector((state) => state.auth);

  const router = useRouter();

  const [isTokenThere, setIsTokenThere] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
    }


    setIsTokenThere(true);
  }, []);

  useEffect(() => {
    if (isTokenThere) {
      dispatch(getAllPosts());
      dispatch(getAboutUser({ token: localStorage.getItem("token") }));

    }
  }, [isTokenThere]);
  return (
    <UserLayout>
      {authState.profileFetched ? (
        <div>
          <h1>Welcome, {authState.user.userId.name}</h1>
          <p>Username: {authState.user.userId.username}</p>
          <p>Email: {authState.user.userId.email}</p>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </UserLayout>
  )
};

export default Dashboard;
