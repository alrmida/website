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
  role: 'client' | 'kumulus_personnel';
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
  role: 'client' | 'kumulus_personnel';
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
  const [inviteRole, setInviteRole] = useState<'client' | 'kumulus_personnel'>('client');
  
  const [newMachine, setNewMachine] = useState({
    machine_id: '',
    name: '',
    location: '',
    client_id: '',
  });

  useEffect(() => {
    if (open && profile?.role === 'kumulus_personnel') {
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
      
      // Fetch machines with client info
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          *,
          client_profile:profiles!client_id (username)
        `)
        .order('created_at', { ascending: false });
      
      if (machinesError) {
        console.error('Machines error:', machinesError);
        throw machinesError;
      }
      
      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('Invitations error:', invitationsError);
        throw invitationsError;
      }

      console.log('Fetched data:', { profiles: profilesData, machines: machinesData, invitations: invitationsData });

      if (profilesData) setProfiles(profilesData);
      if (machinesData) setMachines(machinesData);
      if (invitationsData) setInvitations(invitationsData);
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
      const { data, error } = await supabase.rpc('create_invitation', {
        p_email: inviteEmail,
        p_role: inviteRole,
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
    if (!newMachine.machine_id || !newMachine.name) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('machines')
        .insert([{
          machine_id: newMachine.machine_id,
          name: newMachine.name,
          location: newMachine.location,
          client_id: newMachine.client_id || null,
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Machine added successfully',
      });
      
      setNewMachine({ machine_id: '', name: '', location: '', client_id: '' });
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

  const deleteMachine = async (id: number) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Machine deleted successfully',
      });
      
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

  const addKU079Machine = async () => {
    if (profile?.role !== 'kumulus_personnel' || !profile?.id) return;
    
    try {
      // Check if machine already exists
      const { data: existingMachine } = await supabase
        .from('machines')
        .select('*')
        .eq('machine_id', 'KU079')
        .single();
      
      if (!existingMachine) {
        console.log('Adding KU079 machine...');
        const { error } = await supabase
          .from('machines')
          .insert([{
            machine_id: 'KU079',
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
    if (open && profile?.role === 'kumulus_personnel') {
      addKU079Machine();
    }
  }, [open, profile]);

  if (profile?.role !== 'kumulus_personnel') {
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
                          <Badge variant={user.role === 'kumulus_personnel' ? 'default' : 'secondary'}>
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
                    <Label htmlFor="machineId">Machine ID</Label>
                    <Input
                      id="machineId"
                      value={newMachine.machine_id}
                      onChange={(e) => setNewMachine({ ...newMachine, machine_id: e.target.value })}
                      placeholder="KU079"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="machineName">Machine Name</Label>
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
                        <SelectItem value="">No assignment</SelectItem>
                        {profiles.filter(p => p.role === 'client').map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addMachine} disabled={loading}>
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
                        <TableCell>{machine.machine_id}</TableCell>
                        <TableCell>{machine.name}</TableCell>
                        <TableCell>{machine.location}</TableCell>
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
                    <Select value={inviteRole} onValueChange={(value: 'client' | 'kumulus_personnel') => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="kumulus_personnel">Kumulus Personnel</SelectItem>
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
                          <Badge variant={invitation.role === 'kumulus_personnel' ? 'default' : 'secondary'}>
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
