
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from './admin/UserManagement';
import MachineManagement from './admin/MachineManagement';
import InvitationManagement from './admin/InvitationManagement';
import RawDataManagement from './admin/RawDataManagement';
import AdminDataPanel from './admin/AdminDataPanel';
import { Users, Settings, Mail, Database, Activity } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage users, machines, and system operations
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="machines" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Machines</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Invitations</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Raw Data</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Data Pipeline</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="machines">
            <MachineManagement />
          </TabsContent>

          <TabsContent value="invitations">
            <InvitationManagement />
          </TabsContent>

          <TabsContent value="data">
            <RawDataManagement />
          </TabsContent>

          <TabsContent value="pipeline">
            <AdminDataPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
