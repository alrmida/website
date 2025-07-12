
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MachineWithClient, MachineFormData, generateMachineId, isValidMachineId, isValidMicrocontrollerUID } from '@/types/machine';
import { Profile } from './types';

interface MachineManagementProps {
  machines: MachineWithClient[];
  profiles: Profile[];
  profile: Profile;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

const MachineManagement = ({ machines, profiles, profile, loading, onRefresh }: MachineManagementProps) => {
  const [editingMachine, setEditingMachine] = useState<MachineWithClient | null>(null);
  const [formData, setFormData] = useState<MachineFormData>({
    machine_id: '',
    name: '',
    location: '',
    machine_model: '',
    purchase_date: '',
    microcontroller_uid: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAddMachine = async () => {
    try {
      if (!isValidMachineId(formData.machine_id)) {
        toast({
          title: 'Invalid Machine ID',
          description: 'Machine ID must follow format: KU00[1-3]619XXXXXX (6 digits)',
          variant: 'destructive'
        });
        return;
      }

      if (formData.microcontroller_uid && !isValidMicrocontrollerUID(formData.microcontroller_uid)) {
        toast({
          title: 'Invalid Microcontroller UID',
          description: 'Microcontroller UID must be 24 hexadecimal characters',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('machines')
        .insert({
          machine_id: formData.machine_id,
          name: formData.name,
          location: formData.location,
          machine_model: formData.machine_model,
          purchase_date: formData.purchase_date || null,
          microcontroller_uid: formData.microcontroller_uid || null
        });

      if (error) {
        console.error('Error adding machine:', error);
        toast({
          title: 'Error',
          description: `Failed to add machine: ${error.message}`,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Machine added successfully'
      });

      setFormData({
        machine_id: '',
        name: '',
        location: '',
        machine_model: '',
        purchase_date: '',
        microcontroller_uid: ''
      });
      setIsAdding(false);
      onRefresh();
    } catch (error) {
      console.error('Error adding machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to add machine',
        variant: 'destructive'
      });
    }
  };

  const handleEditMachine = async () => {
    if (!editingMachine) return;

    try {
      if (!isValidMachineId(formData.machine_id)) {
        toast({
          title: 'Invalid Machine ID',
          description: 'Machine ID must follow format: KU00[1-3]619XXXXXX (6 digits)',
          variant: 'destructive'
        });
        return;
      }

      if (formData.microcontroller_uid && !isValidMicrocontrollerUID(formData.microcontroller_uid)) {
        toast({
          title: 'Invalid Microcontroller UID',
          description: 'Microcontroller UID must be 24 hexadecimal characters',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('machines')
        .update({
          machine_id: formData.machine_id,
          name: formData.name,
          location: formData.location,
          machine_model: formData.machine_model,
          purchase_date: formData.purchase_date || null,
          microcontroller_uid: formData.microcontroller_uid || null
        })
        .eq('id', editingMachine.id);

      if (error) {
        console.error('Error updating machine:', error);
        toast({
          title: 'Error',
          description: `Failed to update machine: ${error.message}`,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Machine updated successfully'
      });

      setEditingMachine(null);
      setFormData({
        machine_id: '',
        name: '',
        location: '',
        machine_model: '',
        purchase_date: '',
        microcontroller_uid: ''
      });
      onRefresh();
    } catch (error) {
      console.error('Error updating machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to update machine',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMachine = async (machineId: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) return;

    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machineId);

      if (error) {
        console.error('Error deleting machine:', error);
        toast({
          title: 'Error',
          description: `Failed to delete machine: ${error.message}`,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Machine deleted successfully'
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete machine',
        variant: 'destructive'
      });
    }
  };

  const startEdit = (machine: MachineWithClient) => {
    setEditingMachine(machine);
    setFormData({
      machine_id: machine.machine_id,
      name: machine.name,
      location: machine.location || '',
      machine_model: machine.machine_model || '',
      purchase_date: machine.purchase_date || '',
      microcontroller_uid: machine.microcontroller_uid || ''
    });
  };

  const cancelEdit = () => {
    setEditingMachine(null);
    setIsAdding(false);
    setFormData({
      machine_id: '',
      name: '',
      location: '',
      machine_model: '',
      purchase_date: '',
      microcontroller_uid: ''
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Machine Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading machines...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Machine Management</CardTitle>
        <Button
          onClick={() => setIsAdding(true)}
          disabled={isAdding || editingMachine !== null}
        >
          Add Machine
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {(isAdding || editingMachine) && (
          <Card>
            <CardHeader>
              <CardTitle>
                {isAdding ? 'Add New Machine' : `Edit ${editingMachine?.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="machine_id">Machine ID *</Label>
                  <Input
                    id="machine_id"
                    value={formData.machine_id}
                    onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                    placeholder="KU001619000001"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Machine Name"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Installation Location"
                  />
                </div>
                <div>
                  <Label htmlFor="machine_model">Model</Label>
                  <Select
                    value={formData.machine_model}
                    onValueChange={(value) => setFormData({ ...formData, machine_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Amphore">Amphore</SelectItem>
                      <SelectItem value="BoKs">BoKs</SelectItem>
                      <SelectItem value="Water Dispenser">Water Dispenser</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="microcontroller_uid">Microcontroller UID</Label>
                  <Input
                    id="microcontroller_uid"
                    value={formData.microcontroller_uid}
                    onChange={(e) => setFormData({ ...formData, microcontroller_uid: e.target.value })}
                    placeholder="24-character hex string"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={isAdding ? handleAddMachine : handleEditMachine}
                  disabled={!formData.machine_id || !formData.name}
                >
                  {isAdding ? 'Add Machine' : 'Update Machine'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell className="font-mono text-sm">
                  {machine.machine_id}
                </TableCell>
                <TableCell>{machine.name}</TableCell>
                <TableCell>{machine.machine_model || 'Unknown'}</TableCell>
                <TableCell>{machine.location || '-'}</TableCell>
                <TableCell>
                  {machine.client_profile?.username || 'Unassigned'}
                </TableCell>
                <TableCell>
                  <Badge variant={machine.microcontroller_uid ? 'default' : 'secondary'}>
                    {machine.microcontroller_uid ? 'Connected' : 'Not Connected'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(machine)}
                      disabled={isAdding || editingMachine !== null}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteMachine(machine.id)}
                      disabled={isAdding || editingMachine !== null}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {machines.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No machines found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MachineManagement;
