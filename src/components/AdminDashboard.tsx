
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from './admin/UserManagement';
import MachineManagement from './admin/MachineManagement';
import InvitationManagement from './admin/InvitationManagement';
import RawDataManagement from './admin/RawDataManagement';
import AdminDataPanel from './admin/AdminDataPanel';
import { Users, Settings, Mail, Database, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMachineData } from '@/hooks/useMachineData';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Invitation } from './admin/types';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { machines, loading: machinesLoading, refetch: refetchMachines } = useMachineData();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    if (!profile || profile.role !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        // Map database roles to frontend roles with proper typing
        const mappedProfiles: Profile[] = profilesData?.map(p => ({
          ...p,
          role: (p.role === 'kumulus_personnel' ? 'commercial' : 
                p.role === 'kumulus_admin' ? 'admin' : 'client') as 'client' | 'commercial' | 'admin'
        })) || [];
        setProfiles(mappedProfiles);
      }

      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
      } else {
        // Map database roles to frontend roles with proper typing
        const mappedInvitations: Invitation[] = invitationsData?.map(inv => ({
          ...inv,
          role: (inv.role === 'kumulus_personnel' ? 'commercial' : 
                inv.role === 'kumulus_admin' ? 'admin' : 'client') as 'client' | 'commercial' | 'admin'
        })) || [];
        setInvitations(mappedInvitations);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [profile]);

  const handleRefresh = () => {
    fetchAdminData();
    refetchMachines();
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            You don't have permission to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

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
            <UserManagement 
              profiles={profiles}
            />
          </TabsContent>

          <TabsContent value="machines">
            <MachineManagement 
              machines={machines}
              profiles={profiles}
              profile={profile}
              loading={machinesLoading}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="invitations">
            <InvitationManagement 
              invitations={invitations}
              profile={profile}
              loading={loading}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="data">
            <RawDataManagement 
              loading={loading}
              onRefresh={handleRefresh}
            />
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
