import CreatePost from "@/Components/CreatePost";
import PostList from "@/Components/PostList";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import React from "react";

const Dashboard = () => {
  return (
    <UserLayout title="Feed">
      <DashboardLayout>
        <h1 className="visually-hidden">Your feed</h1>
        <CreatePost />
        <PostList
          emptyTitle="Your feed is empty"
          emptyDescription="Be the first to share something — write a post above."
        />
      </DashboardLayout>
    </UserLayout>
  );
};

export default Dashboard;
