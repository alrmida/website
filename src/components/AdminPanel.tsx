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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Plus } from 'lucide-react';

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Profile {
  id: string;
  username: string;
  role: 'client' | 'commercial' | 'admin';
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
}

interface Machine {
  id: number;
  machine_id: string;
  name: string;
  location: string;
  client_id?: string;
  manager_id?: string;
  client_profile?: {
    username: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: 'client' | 'commercial' | 'admin';
  expires_at: string;
  used_at?: string;
  created_at: string;
}

const AdminPanel = ({ open, onOpenChange }: AdminPanelProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for different tabs
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'client' | 'commercial' | 'admin'>('client');
  
  const [newMachine, setNewMachine] = useState({
    machine_id: '',
    name: '',
    location: '',
    client_id: 'unassigned',
  });

  // Helper function to map database roles to frontend roles
  const mapDatabaseRoleToFrontend = (dbRole: string): 'client' | 'commercial' | 'admin' => {
    switch (dbRole) {
      case 'kumulus_personnel':
        return 'commercial';
      case 'client':
        return 'client';
      default:
        return 'client';
    }
  };

  // Helper function to map frontend roles to database roles for invitations
  const mapFrontendRoleToDatabase = (frontendRole: 'client' | 'commercial' | 'admin'): 'client' | 'kumulus_personnel' => {
    switch (frontendRole) {
      case 'commercial':
      case 'admin':
        return 'kumulus_personnel';
      case 'client':
        return 'client';
      default:
        return 'client';
    }
  };

  useEffect(() => {
    if (open && (profile?.role === 'admin' || profile?.role === 'commercial')) {
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

      // Fetch machines with better error handling
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          id,
          machine_id,
          name,
          location,
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

  const sendInvitation = async () => {
    if (!inviteEmail || !profile) return;
    
    setLoading(true);
    try {
      const dbRole = mapFrontendRoleToDatabase(inviteRole);
      const { data, error } = await supabase.rpc('create_invitation', {
        p_email: inviteEmail,
        p_role: dbRole,
        p_created_by: profile.id
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
      
      setInviteEmail('');
      setInviteRole('client');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const addMachine = async () => {
    if (!newMachine.machine_id || !newMachine.name) {
      toast({
        title: 'Error',
        description: 'Machine ID and Name are required',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Adding machine:', newMachine);
      
      const machineData = {
        machine_id: newMachine.machine_id.trim(),
        name: newMachine.name.trim(),
        location: newMachine.location.trim() || null,
        client_id: newMachine.client_id === 'unassigned' ? null : newMachine.client_id,
        manager_id: profile?.id || null,
      };
      
      console.log('Machine data to insert:', machineData);

      const { data, error } = await supabase
        .from('machines')
        .insert([machineData])
        .select('*');

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Machine added successfully:', data);

      toast({
        title: 'Success',
        description: 'Machine added successfully',
      });
      
      setNewMachine({ machine_id: '', name: '', location: '', client_id: 'unassigned' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding machine:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const deleteMachine = async (id: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('Deleting machine with id:', id);
      
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Machine deleted successfully',
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error deleting machine:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const addKU079Machine = async () => {
    if ((profile?.role !== 'admin' && profile?.role !== 'commercial') || !profile?.id) return;
    
    try {
      // Check if machine already exists
      const { data: existingMachine } = await supabase
        .from('machines')
        .select('*')
        .eq('machine_id', 'KU001619000079')
        .single();
      
      if (!existingMachine) {
        console.log('Adding KU079 machine...');
        const { error } = await supabase
          .from('machines')
          .insert([{
            machine_id: 'KU001619000079',
            name: 'Atmospheric Water Generator KU079',
            location: 'Kumulus-HOUSE',
            manager_id: profile.id,
            client_id: profile.id
          }]);

        if (error) {
          console.error('Error adding KU079 machine:', error);
        } else {
          console.log('KU079 machine added successfully');
          fetchData();
        }
      }
    } catch (error) {
      console.error('Error checking/adding KU079 machine:', error);
    }
  };

  useEffect(() => {
    if (open && (profile?.role === 'admin' || profile?.role === 'commercial')) {
      addKU079Machine();
    }
  }, [open, profile]);

  if (profile?.role !== 'admin' && profile?.role !== 'commercial') {
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact Email</TableHead>
                      <TableHead>Contact Phone</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' || user.role === 'commercial' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.contact_email || '-'}</TableCell>
                        <TableCell>{user.contact_phone || '-'}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="machines" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Machine</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="machineId">Machine ID *</Label>
                    <Input
                      id="machineId"
                      value={newMachine.machine_id}
                      onChange={(e) => setNewMachine({ ...newMachine, machine_id: e.target.value })}
                      placeholder="KU001619000079"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="machineName">Machine Name *</Label>
                    <Input
                      id="machineName"
                      value={newMachine.name}
                      onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                      placeholder="Atmospheric Water Generator 1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="machineLocation">Location</Label>
                    <Input
                      id="machineLocation"
                      value={newMachine.location}
                      onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                      placeholder="Kumulus-HOUSE"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientAssign">Assign to Client (Optional)</Label>
                    <Select value={newMachine.client_id} onValueChange={(value) => setNewMachine({ ...newMachine, client_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No assignment</SelectItem>
                        {profiles.filter(p => p.role === 'client').map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addMachine} disabled={loading || !newMachine.machine_id || !newMachine.name}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Machine
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Machines ({machines.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {machines.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No machines found</p>
                    <Button onClick={fetchData} variant="outline" className="mt-2">
                      Refresh
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machines.map((machine) => (
                        <TableRow key={machine.id}>
                          <TableCell className="font-mono">{machine.machine_id}</TableCell>
                          <TableCell>{machine.name}</TableCell>
                          <TableCell>{machine.location || '-'}</TableCell>
                          <TableCell>{machine.client_profile?.username || 'Unassigned'}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMachine(machine.id)}
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
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Invitation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: 'client' | 'commercial' | 'admin') => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={sendInvitation} disabled={loading}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant={invitation.role === 'admin' || invitation.role === 'commercial' ? 'default' : 'secondary'}>
                            {invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={invitation.used_at ? 'default' : 'outline'}>
                            {invitation.used_at ? 'Used' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(invitation.expires_at).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invitation.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPanel;
