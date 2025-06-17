import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import AdminPanel from './AdminPanel';
import RealTimeDataTable from './RealTimeDataTable';
import { useAuth } from '@/contexts/AuthContext';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // Only true admins should see this dashboard
  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage machines, users, and monitor real-time data
              </p>
            </div>
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Open Admin Panel
            </button>
          </div>
        </div>

        {/* Real-time Data Collection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Real-time Data Collection
          </h2>
          <RealTimeDataTable />
        </div>

        {/* Admin Panel Modal */}
        <AdminPanel 
          open={adminPanelOpen}
          onOpenChange={setAdminPanelOpen}
        />
      </main>
    </div>
  );
};

export default AdminDashboard;
