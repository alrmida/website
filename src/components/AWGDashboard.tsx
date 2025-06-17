
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientDashboard from './ClientDashboard';
import AdminDashboard from './AdminDashboard';

const AWGDashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  if (profile?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Default to client dashboard for commercial users and clients
  return <ClientDashboard />;
};

export default AWGDashboard;
