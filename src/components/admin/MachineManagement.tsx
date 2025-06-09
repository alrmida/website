
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient, MachineFormData, isValidMachineId, getDisplayModelName, getOperatingSince } from '@/types/machine';
import { Profile } from './types';

interface MachineManagementProps {
  machines: MachineWithClient[];
  profiles: Profile[];
  profile: any;
  loading: boolean;
  onRefresh: () => void;
}

const MachineManagement = ({ machines, profiles, profile, loading, onRefresh }: MachineManagementProps) => {
  const { toast } = useToast();
  
  const [newMachine, setNewMachine] = useState<MachineFormData>({
    machine_id: '',
    machine_model: '',
    name: '',
    location: '',
    purchase_date: ''
  });

  const [editingMachine, setEditingMachine] = useState<MachineWithClient | null>(null);
  const [editMachineData, setEditMachineData] = useState<Omit<MachineFormData, 'machine_id'>>({
    machine_model: '',
    name: '',
    location: '',
    purchase_date: ''
  });

  const validateMachineForm = (data: MachineFormData): string | null => {
    if (!data.machine_id.trim()) {
      return 'Machine ID is required';
    }
    
    if (!isValidMachineId(data.machine_id)) {
      return 'Machine ID must follow format: KU + 12 digits (e.g., KU001619000079)';
    }
    
    if (!data.name.trim()) {
      return 'Owner name is required';
    }
    
    return null;
  };

  const addMachine = async () => {
    const validationError = validateMachineForm(newMachine);
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
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
        machine_model: newMachine.machine_model.trim() || null,
        purchase_date: newMachine.purchase_date || null,
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
        machine_model: '',
        name: '', 
        location: '', 
        purchase_date: ''
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

  const startEditMachine = (machine: MachineWithClient) => {
    setEditingMachine(machine);
    setEditMachineData({
      machine_model: machine.machine_model || '',
      name: machine.name,
      location: machine.location || '',
      purchase_date: machine.purchase_date || '',
    });
  };

  const updateMachine = async () => {
    if (!editingMachine || !editMachineData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Owner name is required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log('Updating machine:', editingMachine.id, editMachineData);
      
      const updateData = {
        name: editMachineData.name.trim(),
        location: editMachineData.location.trim() || null,
        machine_model: editMachineData.machine_model.trim() || null,
        purchase_date: editMachineData.purchase_date || null,
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
        machine_model: '',
        name: '', 
        location: '', 
        purchase_date: ''
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
                className={!isValidMachineId(newMachine.machine_id) && newMachine.machine_id ? 'border-red-500' : ''}
              />
              {newMachine.machine_id && !isValidMachineId(newMachine.machine_id) && (
                <p className="text-sm text-red-500">Format: KU + 12 digits</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineModel">Model</Label>
              <Input
                id="machineModel"
                value={newMachine.machine_model}
                onChange={(e) => setNewMachine({ ...newMachine, machine_model: e.target.value })}
                placeholder="Amphore"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machineName">Owner *</Label>
              <Input
                id="machineName"
                value={newMachine.name}
                onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                placeholder="French Embassy"
              />
            </div>
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
          </div>

          <Button 
            onClick={addMachine} 
            disabled={loading || !newMachine.machine_id || !newMachine.name}
          >
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
                <Label htmlFor="editMachineModel">Model</Label>
                <Input
                  id="editMachineModel"
                  value={editMachineData.machine_model}
                  onChange={(e) => setEditMachineData({ ...editMachineData, machine_model: e.target.value })}
                  placeholder="Amphore"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMachineName">Owner *</Label>
                <Input
                  id="editMachineName"
                  value={editMachineData.name}
                  onChange={(e) => setEditMachineData({ ...editMachineData, name: e.target.value })}
                  placeholder="French Embassy"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  <TableHead>Model</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Operating Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-mono">{machine.machine_id}</TableCell>
                    <TableCell>{getDisplayModelName(machine)}</TableCell>
                    <TableCell>{machine.name}</TableCell>
                    <TableCell>{machine.location || '-'}</TableCell>
                    <TableCell>{getOperatingSince(machine)}</TableCell>
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
