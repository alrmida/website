
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Profile as AdminProfile } from './types';
import { MachineWithClient } from '@/types/machine';

// Import the Profile type from AuthContext since that's what gets passed as prop
interface AuthProfile {
  id: string;
  username: string;
  role: 'client' | 'commercial' | 'admin';
}

interface MachineManagementProps {
  machines: MachineWithClient[];
  profiles: AdminProfile[];
  profile: AuthProfile; // Use AuthContext Profile type
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

const MachineManagement = ({ machines, profiles, profile, loading, onRefresh }: MachineManagementProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Machine Management</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading machines...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell>{machine.machine_id}</TableCell>
                  <TableCell>{machine.name}</TableCell>
                  <TableCell>{machine.location || '-'}</TableCell>
                  <TableCell>{machine.machine_model || '-'}</TableCell>
                  <TableCell>
                    {machine.client_profile?.username || 'Unassigned'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                    No machines found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineManagement;
