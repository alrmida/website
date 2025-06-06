
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Machine, Profile } from './types';

interface MachineAccess {
  id: string;
  user_id: string;
  machine_id: number;
  access_level: string;
  granted_at: string;
  user_profile: {
    username: string;
    role: string;
  };
}

interface MachineAccessManagementProps {
  machine: Machine;
  profiles: Profile[];
  onRefresh: () => void;
}

const MachineAccessManagement = ({ machine, profiles, onRefresh }: MachineAccessManagementProps) => {
  const { toast } = useToast();
  const [machineAccess, setMachineAccess] = useState<MachineAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAccess, setNewAccess] = useState({
    user_id: '',
    access_level: 'viewer'
  });

  useEffect(() => {
    fetchMachineAccess();
  }, [machine.id]);

  const fetchMachineAccess = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machine_access')
        .select(`
          id,
          user_id,
          machine_id,
          access_level,
          granted_at,
          user_profile:profiles!user_id (
            username,
            role
          )
        `)
        .eq('machine_id', machine.id);

      if (error) throw error;
      setMachineAccess(data || []);
    } catch (error: any) {
      console.error('Error fetching machine access:', error);
      toast({
        title: 'Error',
        description: 'Failed to load machine access data',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const grantAccess = async () => {
    if (!newAccess.user_id) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('machine_access')
        .insert([{
          user_id: newAccess.user_id,
          machine_id: machine.id,
          access_level: newAccess.access_level
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Access granted successfully',
      });

      setNewAccess({ user_id: '', access_level: 'viewer' });
      fetchMachineAccess();
    } catch (error: any) {
      console.error('Error granting access:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const revokeAccess = async (accessId: string) => {
    if (!confirm('Are you sure you want to revoke this access?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('machine_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Access revoked successfully',
      });

      fetchMachineAccess();
    } catch (error: any) {
      console.error('Error revoking access:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateAccessLevel = async (accessId: string, newLevel: string) => {
    try {
      const { error } = await supabase
        .from('machine_access')
        .update({ access_level: newLevel })
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Access level updated successfully',
      });

      fetchMachineAccess();
    } catch (error: any) {
      console.error('Error updating access level:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter out users who already have access
  const availableUsers = profiles.filter(profile => 
    !machineAccess.some(access => access.user_id === profile.id)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Grant Machine Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={newAccess.user_id} onValueChange={(value) => setNewAccess({ ...newAccess, user_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.username} ({profile.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Select value={newAccess.access_level} onValueChange={(value) => setNewAccess({ ...newAccess, access_level: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantAccess} disabled={loading || !newAccess.user_id}>
              <Plus className="w-4 h-4 mr-2" />
              Grant Access
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Access ({machineAccess.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {machineAccess.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users have access to this machine</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineAccess.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell>{access.user_profile?.username}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        access.user_profile?.role === 'admin' ? 'bg-red-100 text-red-800' :
                        access.user_profile?.role === 'commercial' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {access.user_profile?.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={access.access_level} 
                        onValueChange={(value) => updateAccessLevel(access.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(access.granted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeAccess(access.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineAccessManagement;
