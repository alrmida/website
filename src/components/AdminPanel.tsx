
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import UserManagement from './admin/UserManagement';
import MachineManagement from './admin/MachineManagement';
import InvitationManagement from './admin/InvitationManagement';
import RawDataManagement from './admin/RawDataManagement';
import { Profile, Invitation } from './admin/types';
import { MachineWithClient } from '@/types/machine';
import { mapDatabaseRoleToFrontend } from './admin/utils';

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminPanel = ({ open, onOpenChange }: AdminPanelProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for different tabs
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [machines, setMachines] = useState<MachineWithClient[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (open && profile?.role === 'admin') {
      fetchData();
    }
  }, [open, profile]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching admin data...');
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }
      
      // Map database profiles to frontend format
      const mappedProfiles = profilesData?.map(p => ({
        ...p,
        role: mapDatabaseRoleToFrontend(p.role)
      })) || [];

      // Fetch machines without microcontroller_uid column
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          id,
          machine_id,
          name,
          location,
          machine_model,
          purchase_date,
          client_id,
          manager_id,
          created_at,
          updated_at,
          client_profile:profiles!client_id (
            username
          )
        `)
        .order('created_at', { ascending: false });
      
      if (machinesError) {
        console.error('Machines error:', machinesError);
        setMachines([]);
      } else {
        console.log('Machines fetched successfully:', machinesData);
        setMachines(machinesData || []);
      }
      
      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('Invitations error:', invitationsError);
        setInvitations([]);
      } else {
        // Map database invitation roles to frontend roles
        const mappedInvitations = invitationsData?.map(inv => ({
          ...inv,
          role: mapDatabaseRoleToFrontend(inv.role)
        })) || [];
        setInvitations(mappedInvitations);
      }

      console.log('Fetched data:', { 
        profiles: mappedProfiles?.length || 0, 
        machines: machinesData?.length || 0, 
        invitations: invitationsData?.length || 0 
      });

      if (mappedProfiles) setProfiles(mappedProfiles);
      
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      setError(`Failed to load admin data: ${error.message}`);
      toast({
        title: 'Error',
        description: `Failed to load admin data: ${error.message}`,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (profile?.role !== 'admin') {
    return null;
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Admin Panel Error</DialogTitle>
            <DialogDescription>
              There was an error loading the admin panel.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">{error}</p>
            <Button onClick={fetchData} className="mt-2">
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admin Panel</DialogTitle>
          <DialogDescription>
            Manage users, machines, and system settings
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading...</p>
          </div>
        )}

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="rawdata">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UserManagement 
              profiles={profiles} 
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="machines" className="space-y-4">
            <MachineManagement 
              machines={machines}
              profiles={profiles}
              profile={profile}
              loading={loading}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <InvitationManagement 
              invitations={invitations}
              profile={profile}
              loading={loading}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="rawdata" className="space-y-4">
            <RawDataManagement 
              loading={loading}
              onRefresh={fetchData}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPanel;
