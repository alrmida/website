import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Machine, Profile } from './types';

interface MachineManagementProps {
  machines: Machine[];
  profiles: Profile[];
  profile: any;
  loading: boolean;
  onRefresh: () => void;
}

const MachineManagement = ({ machines, profiles, profile, loading, onRefresh }: MachineManagementProps) => {
  const { toast } = useToast();
  
  const [newMachine, setNewMachine] = useState({
    machine_id: '',
    name: '',
    location: '',
    client_id: 'unassigned',
    owner_entity: '',
    assigned_entity: '',
    machine_model: '',
    serial_number: '',
    purchase_date: '',
    assignment_date: '',
    status: 'active'
  });

  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editMachineData, setEditMachineData] = useState({
    name: '',
    location: '',
    client_id: '',
    owner_entity: '',
    assigned_entity: '',
    machine_model: '',
    serial_number: '',
    purchase_date: '',
    assignment_date: '',
    status: 'active'
  });

  const addMachine = async () => {
    if (!newMachine.machine_id || !newMachine.name) {
      toast({
        title: 'Error',
        description: 'Machine ID and Name are required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log('Adding machine:', newMachine);
      
      const machineData = {
        machine_id: newMachine.machine_id.trim(),
        name: newMachine.name.trim(),
        location: newMachine.location.trim() || null,
        client_id: newMachine.client_id === 'unassigned' ? null : newMachine.client_id,
        owner_entity: newMachine.owner_entity.trim() || null,
        assigned_entity: newMachine.assigned_entity.trim() || null,
        machine_model: newMachine.machine_model.trim() || null,
        serial_number: newMachine.serial_number.trim() || null,
        purchase_date: newMachine.purchase_date || null,
        assignment_date: newMachine.assignment_date || null,
        status: newMachine.status,
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
      
      setNewMachine({ 
        machine_id: '', 
        name: '', 
        location: '', 
        client_id: 'unassigned',
        owner_entity: '',
        assigned_entity: '',
        machine_model: '',
        serial_number: '',
        purchase_date: '',
        assignment_date: '',
        status: 'active'
      });
      onRefresh();
    } catch (error: any) {
      console.error('Error adding machine:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const startEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setEditMachineData({
      name: machine.name,
      location: machine.location || '',
      client_id: machine.client_id || 'unassigned',
      owner_entity: (machine as any).owner_entity || '',
      assigned_entity: (machine as any).assigned_entity || '',
      machine_model: (machine as any).machine_model || '',
      serial_number: (machine as any).serial_number || '',
      purchase_date: (machine as any).purchase_date || '',
      assignment_date: (machine as any).assignment_date || '',
      status: (machine as any).status || 'active',
    });
  };

  const updateMachine = async () => {
    if (!editingMachine || !editMachineData.name) {
      toast({
        title: 'Error',
        description: 'Machine name is required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log('Updating machine:', editingMachine.id, editMachineData);
      
      const updateData = {
        name: editMachineData.name.trim(),
        location: editMachineData.location.trim() || null,
        client_id: editMachineData.client_id === 'unassigned' ? null : editMachineData.client_id,
        owner_entity: editMachineData.owner_entity.trim() || null,
        assigned_entity: editMachineData.assigned_entity.trim() || null,
        machine_model: editMachineData.machine_model.trim() || null,
        serial_number: editMachineData.serial_number.trim() || null,
        purchase_date: editMachineData.purchase_date || null,
        assignment_date: editMachineData.assignment_date || null,
        status: editMachineData.status,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('machines')
        .update(updateData)
        .eq('id', editingMachine.id);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Machine updated successfully');

      toast({
        title: 'Success',
        description: 'Machine updated successfully',
      });
      
      setEditingMachine(null);
      setEditMachineData({ 
        name: '', 
        location: '', 
        client_id: '',
        owner_entity: '',
        assigned_entity: '',
        machine_model: '',
        serial_number: '',
        purchase_date: '',
        assignment_date: '',
        status: 'active'
      });
      onRefresh();
    } catch (error: any) {
      console.error('Error updating machine:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteMachine = async (id: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) {
      return;
    }
    
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
      
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting machine:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
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
              <Label htmlFor="machineModel">Machine Model</Label>
              <Input
                id="machineModel"
                value={newMachine.machine_model}
                onChange={(e) => setNewMachine({ ...newMachine, machine_model: e.target.value })}
                placeholder="Amphore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={newMachine.serial_number}
                onChange={(e) => setNewMachine({ ...newMachine, serial_number: e.target.value })}
                placeholder="SN123456789"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerEntity">Owner Entity</Label>
              <Input
                id="ownerEntity"
                value={newMachine.owner_entity}
                onChange={(e) => setNewMachine({ ...newMachine, owner_entity: e.target.value })}
                placeholder="French Embassy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedEntity">Assigned Entity</Label>
              <Input
                id="assignedEntity"
                value={newMachine.assigned_entity}
                onChange={(e) => setNewMachine({ ...newMachine, assigned_entity: e.target.value })}
                placeholder="International School Paris"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machineLocation">Location</Label>
              <Input
                id="machineLocation"
                value={newMachine.location}
                onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                placeholder="Paris, France"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={newMachine.purchase_date}
                onChange={(e) => setNewMachine({ ...newMachine, purchase_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignmentDate">Assignment Date</Label>
              <Input
                id="assignmentDate"
                type="date"
                value={newMachine.assignment_date}
                onChange={(e) => setNewMachine({ ...newMachine, assignment_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientAssign">Legacy Client Assignment</Label>
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
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={newMachine.status} onValueChange={(value) => setNewMachine({ ...newMachine, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
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

      {editingMachine && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Machine: {editingMachine.machine_id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editMachineName">Machine Name *</Label>
                <Input
                  id="editMachineName"
                  value={editMachineData.name}
                  onChange={(e) => setEditMachineData({ ...editMachineData, name: e.target.value })}
                  placeholder="Atmospheric Water Generator 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMachineModel">Machine Model</Label>
                <Input
                  id="editMachineModel"
                  value={editMachineData.machine_model}
                  onChange={(e) => setEditMachineData({ ...editMachineData, machine_model: e.target.value })}
                  placeholder="Amphore"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editOwnerEntity">Owner Entity</Label>
                <Input
                  id="editOwnerEntity"
                  value={editMachineData.owner_entity}
                  onChange={(e) => setEditMachineData({ ...editMachineData, owner_entity: e.target.value })}
                  placeholder="French Embassy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAssignedEntity">Assigned Entity</Label>
                <Input
                  id="editAssignedEntity"
                  value={editMachineData.assigned_entity}
                  onChange={(e) => setEditMachineData({ ...editMachineData, assigned_entity: e.target.value })}
                  placeholder="International School Paris"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editMachineLocation">Location</Label>
                <Input
                  id="editMachineLocation"
                  value={editMachineData.location}
                  onChange={(e) => setEditMachineData({ ...editMachineData, location: e.target.value })}
                  placeholder="Paris, France"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPurchaseDate">Purchase Date</Label>
                <Input
                  id="editPurchaseDate"
                  type="date"
                  value={editMachineData.purchase_date}
                  onChange={(e) => setEditMachineData({ ...editMachineData, purchase_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAssignmentDate">Assignment Date</Label>
                <Input
                  id="editAssignmentDate"
                  type="date"
                  value={editMachineData.assignment_date}
                  onChange={(e) => setEditMachineData({ ...editMachineData, assignment_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editClientAssign">Legacy Client Assignment</Label>
                <Select value={editMachineData.client_id} onValueChange={(value) => setEditMachineData({ ...editMachineData, client_id: value })}>
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
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editMachineData.status} onValueChange={(value) => setEditMachineData({ ...editMachineData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="deployed">Deployed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={updateMachine} disabled={loading || !editMachineData.name}>
                Update Machine
              </Button>
              <Button variant="outline" onClick={() => setEditingMachine(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Machines ({machines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {machines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No machines found</p>
              <Button onClick={onRefresh} variant="outline" className="mt-2">
                Refresh
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-mono">{machine.machine_id}</TableCell>
                    <TableCell>{machine.name}</TableCell>
                    <TableCell>{(machine as any).owner_entity || machine.client_profile?.username || 'Unassigned'}</TableCell>
                    <TableCell>{(machine as any).assigned_entity || machine.location || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        (machine as any).status === 'active' ? 'bg-green-100 text-green-800' :
                        (machine as any).status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(machine as any).status || 'active'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditMachine(machine)}
                          disabled={loading}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMachine(machine.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default MachineManagement;
