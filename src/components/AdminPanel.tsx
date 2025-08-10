
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import SecureAdminTabs from './admin/SecureAdminTabs';
import { Profile, Invitation } from './admin/types';
import { useMachineData } from '@/hooks/useMachineData';
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
  
  // Use the fixed useMachineData hook instead of custom fetching
  const { machines, loading: machinesLoading, refetch: refetchMachines } = useMachineData();
  
  // State for other tabs (not machines)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (open && profile?.role === 'admin') {
      fetchNonMachineData();
    }
  }, [open, profile]);

  const fetchNonMachineData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching admin data (profiles and invitations)...');
      
      // Fetch profiles using the secure function
      const { data: profilesData, error: profilesError } = await supabase.rpc('get_users_with_auth_emails');
      
      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }
      
      // Map database profiles to frontend format
      const mappedProfiles = profilesData?.map(p => ({
        ...p,
        role: mapDatabaseRoleToFrontend(p.role)
      })) || [];

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
        machines: machines?.length || 0, 
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

  const handleRefresh = () => {
    fetchNonMachineData();
    refetchMachines();
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
            <Button onClick={handleRefresh} className="mt-2">
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
          <DialogTitle>Secure Admin Panel</DialogTitle>
          <DialogDescription>
            Enhanced security mode - All operations are validated and audited
          </DialogDescription>
        </DialogHeader>

        <SecureAdminTabs
          profiles={profiles}
          machines={machines}
          invitations={invitations}
          profile={profile}
          loading={loading}
          machinesLoading={machinesLoading}
          onRefresh={handleRefresh}
          refetchMachines={refetchMachines}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AdminPanel;
