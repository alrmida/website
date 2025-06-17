
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

  // Only true admin role gets admin dashboard
  if (profile?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Commercial users and clients both get client dashboard
  return <ClientDashboard />;
};

export default AWGDashboard;
