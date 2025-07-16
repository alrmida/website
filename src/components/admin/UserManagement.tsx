
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Profile } from './types';
import { mapDatabaseRoleToFrontend } from './utils';
import { UserCreateModal } from './UserCreateModal';
import { UserEditModal } from './UserEditModal';
import { UserDeleteDialog } from './UserDeleteDialog';

type UserWithAuthEmail = Profile & { auth_email: string };

interface UserManagementProps {
  profiles: Profile[];
  onRefresh: () => void;
}

const UserManagement = ({ profiles, onRefresh }: UserManagementProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithAuthEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithAuthEmail | null>(null);

  const fetchUsersWithEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users_with_auth_emails');
      
      if (error) {
        throw error;
      }

      // Map database roles to frontend roles
      const mappedUsers: UserWithAuthEmail[] = data?.map(user => ({
        ...user,
        role: mapDatabaseRoleToFrontend(user.role)
      })) || [];

      setUsers(mappedUsers);
    } catch (error: any) {
      console.error('Error fetching users with emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersWithEmails();
  }, [profiles]);

  const handleEdit = (user: UserWithAuthEmail) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDelete = (user: UserWithAuthEmail) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchUsersWithEmails();
    onRefresh();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={fetchUsersWithEmails}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Login Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.auth_email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' || user.role === 'commercial' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.contact_email || '-'}</TableCell>
                  <TableCell>{user.contact_phone || '-'}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      <UserCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleSuccess}
      />

      {selectedUser && (
        <>
          <UserEditModal
            user={selectedUser}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onSuccess={handleSuccess}
          />

          <UserDeleteDialog
            user={selectedUser}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  );
};

export default UserManagement;
