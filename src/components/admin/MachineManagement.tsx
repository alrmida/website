
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Profile as AdminProfile } from './types';
import { MachineWithClient } from '@/types/machine';
import { useMicrocontrollerUID } from '@/hooks/useMicrocontrollerUID';
import MachineCreateModal from './MachineCreateModal';
import MachineEditModal from './MachineEditModal';
import MachineDeleteDialog from './MachineDeleteDialog';

// Import the Profile type from AuthContext since that's what gets passed as prop
interface AuthProfile {
  id: string;
  username: string;
  role: 'client' | 'commercial' | 'admin';
}

interface MachineManagementProps {
  machines: MachineWithClient[];
  profiles: AdminProfile[];
  profile: AuthProfile;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

const MachineRow = ({ machine, profiles, onEdit, onDelete }: {
  machine: MachineWithClient;
  profiles: AdminProfile[];
  onEdit: (machine: MachineWithClient) => void;
  onDelete: (machine: MachineWithClient) => void;
}) => {
  const { currentUID } = useMicrocontrollerUID(machine.id);

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{machine.machine_id}</TableCell>
      <TableCell className="font-medium">{machine.name}</TableCell>
      <TableCell>{machine.location || '-'}</TableCell>
      <TableCell>{machine.machine_model || '-'}</TableCell>
      <TableCell>
        {machine.client_profile?.username ? (
          <Badge variant="default">{machine.client_profile.username}</Badge>
        ) : (
          <Badge variant="secondary">Unassigned</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge 
          variant={currentUID ? "default" : "secondary"}
        >
          {currentUID ? 'Live Data Active' : 'No UID Assigned'}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">
        {currentUID ? currentUID.substring(0, 8) + '...' : '-'}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(machine)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(machine)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const MachineManagement = ({ machines, profiles, profile, loading, onRefresh }: MachineManagementProps) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);

  const handleEdit = (machine: MachineWithClient) => {
    setSelectedMachine(machine);
    setEditModalOpen(true);
  };

  const handleDelete = (machine: MachineWithClient) => {
    setSelectedMachine(machine);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    onRefresh();
  };

  // Separate assigned and unassigned machines for better display
  const assignedMachines = machines.filter(machine => machine.client_id);
  const unassignedMachines = machines.filter(machine => !machine.client_id);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Machine Management</CardTitle>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="outline">
                  Total: {machines.length}
                </Badge>
                <Badge variant="default">
                  Assigned: {assignedMachines.length}
                </Badge>
                <Badge variant="secondary">
                  Unassigned: {unassignedMachines.length}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2">Loading machines...</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="flex flex-col items-center space-y-4">
                <p className="text-lg">No machines found</p>
                <p className="text-sm text-gray-400">Get started by adding your first machine</p>
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first machine
                </Button>
              </div>
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
                  <TableHead>Live Data Status</TableHead>
                  <TableHead>Current UID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => (
                  <MachineRow
                    key={machine.id}
                    machine={machine}
                    profiles={profiles}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MachineCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        profiles={profiles}
        onSuccess={handleSuccess}
      />

      <MachineEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        machine={selectedMachine}
        profiles={profiles}
        onSuccess={handleSuccess}
      />

      <MachineDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        machine={selectedMachine}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default MachineManagement;
