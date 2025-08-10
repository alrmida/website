
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Edit, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { Profile } from './types';
import { SecureUserCreateModal } from './SecureUserCreateModal';
import { UserEditModal } from './UserEditModal';
import { UserDeleteDialog } from './UserDeleteDialog';

interface SecurityAwareUserManagementProps {
  profiles: Profile[];
  onRefresh: () => void;
}

const SecurityAwareUserManagement = ({ profiles, onRefresh }: SecurityAwareUserManagementProps) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile & { auth_email: string } | null>(null);

  const handleEditUser = (user: Profile & { auth_email: string }) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteUser = (user: Profile & { auth_email: string }) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'commercial':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> User creation now uses secure server-side validation. 
          All admin actions are logged for audit purposes.
        </AlertDescription>
      </Alert>

      {profiles.some(p => p.role === 'admin') && profiles.filter(p => p.role === 'admin').length === 1 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Only one admin account exists. Deleting it would lock you out of admin functions.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>User Management (Secure)</CardTitle>
            <Button onClick={() => setCreateModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.username}</TableCell>
                  <TableCell>{(profile as any).auth_email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(profile.role)}>
                      {profile.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {profile.contact_email && <div>{profile.contact_email}</div>}
                      {profile.contact_phone && <div>{profile.contact_phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(profile as Profile & { auth_email: string })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(profile as Profile & { auth_email: string })}
                        disabled={profile.role === 'admin' && profiles.filter(p => p.role === 'admin').length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SecureUserCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={onRefresh}
      />

      {selectedUser && (
        <>
          <UserEditModal
            user={selectedUser}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onSuccess={onRefresh}
          />
          <UserDeleteDialog
            user={selectedUser}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={onRefresh}
          />
        </>
      )}
    </div>
  );
};

export default SecurityAwareUserManagement;
