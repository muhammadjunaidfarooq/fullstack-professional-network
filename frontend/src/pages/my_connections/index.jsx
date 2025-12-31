import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import React from 'react'

const MyConnectionsPage = () => {
  return (
    <UserLayout>
      <DashboardLayout>
        <div>
          <h1>MyConnectionsPage</h1>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

export default MyConnectionsPage
