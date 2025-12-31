import { getAllUsers } from "@/config/redux/action/authAction";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const DiscoverPage = () => {
  const authState = useSelector((state) => state.auth);

  const dispatch = useDispatch();

  useEffect(() => {
    // Check token first to ensure we are authorized
    const token = localStorage.getItem("token");

    if (token && !authState.all_profiles_fetched) {
      dispatch(getAllUsers());
    }
  }, [dispatch, authState.all_profiles_fetched]); // Add dependencies to trigger re-run

  return (
    <UserLayout>
      <DashboardLayout>
        <div>
          <h1>Discover</h1>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
};

export default DiscoverPage;
