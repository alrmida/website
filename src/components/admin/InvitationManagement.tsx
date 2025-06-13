
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Invitation } from './types';
import { mapFrontendRoleToDatabase } from './utils';

interface InvitationManagementProps {
  invitations: Invitation[];
  profile: any;
  loading: boolean;
  onRefresh: () => void;
}

const InvitationManagement = ({ invitations, profile, loading, onRefresh }: InvitationManagementProps) => {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'client' | 'commercial' | 'admin'>('client');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const sendInvitation = async () => {
    if (!inviteEmail || !profile) return;
    
    setSending(true);
    try {
      const dbRole = mapFrontendRoleToDatabase(inviteRole);
      
      // Create invitation in database
      const { data, error } = await supabase.rpc('create_invitation', {
        p_email: inviteEmail,
        p_role: dbRole,
        p_created_by: profile.id
      });

      if (error) throw error;

      // Get the created invitation to retrieve the token
      const { data: invitation, error: fetchError } = await supabase
        .from('invitations')
        .select('token')
        .eq('email', inviteEmail.toLowerCase())
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !invitation) {
        throw new Error('Failed to retrieve invitation token');
      }

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteEmail,
          token: invitation.token,
          role: inviteRole
        }
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        toast({
          title: 'Invitation created but email failed',
          description: 'The invitation was created in the database but the email could not be sent. Please share the invitation link manually.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Invitation sent successfully via email',
        });
      }
      
      setInviteEmail('');
      setInviteRole('client');
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    setCancelling(invitationId);
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ 
          used_at: new Date().toISOString() // Mark as used to effectively cancel it
        })
        .eq('id', invitationId)
        .is('used_at', null); // Only update if not already used

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation cancelled successfully',
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to cancel invitation: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-4">
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
          <Button onClick={sendInvitation} disabled={loading || sending}>
            <UserPlus className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Invitation'}
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
                <TableHead>Actions</TableHead>
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
                  <TableCell>
                    {!invitation.used_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelInvitation(invitation.id)}
                        disabled={cancelling === invitation.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {cancelling === invitation.id ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationManagement;
