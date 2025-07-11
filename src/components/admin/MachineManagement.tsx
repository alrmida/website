import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Pencil, Wifi, WifiOff, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient, MachineFormData, isValidMachineId, isValidMicrocontrollerUID, getDisplayModelName, getOperatingSince, hasLiveDataCapability, generateMachineId } from '@/types/machine';
import { Profile } from './types';
import ResetMetricsButton from '../ResetMetricsButton';

interface MachineManagementProps {
  machines: MachineWithClient[];
  profiles: Profile[];
  profile: any;
  loading: boolean;
  onRefresh: () => void;
}

// Extended form data to include client assignment
interface ExtendedMachineFormData extends MachineFormData {
  client_id: string;
  machine_number: number;
}

const MachineManagement = ({ machines, profiles, profile, loading, onRefresh }: MachineManagementProps) => {
  const { toast } = useToast();
  
  const [newMachine, setNewMachine] = useState<ExtendedMachineFormData>({
    machine_id: '',
    machine_model: '',
    name: '',
    location: '',
    purchase_date: '',
    microcontroller_uid: '',
    client_id: 'unassigned',
    machine_number: 1
  });

  const [editingMachine, setEditingMachine] = useState<MachineWithClient | null>(null);
  const [editMachineData, setEditMachineData] = useState<Omit<ExtendedMachineFormData, 'machine_id' | 'machine_number'>>({
    machine_model: '',
    name: '',
    location: '',
    purchase_date: '',
    microcontroller_uid: '',
    client_id: 'unassigned'
  });

  // Get client profiles only
  const clientProfiles = profiles.filter(p => p.role === 'client');

  // Generate machine ID when model or number changes
  useEffect(() => {
    if (newMachine.machine_model && newMachine.machine_number) {
      try {
        const generatedId = generateMachineId(newMachine.machine_model, newMachine.machine_number);
        setNewMachine(prev => ({ ...prev, machine_id: generatedId }));
      } catch (error) {
        console.error('Error generating machine ID:', error);
      }
    }
  }, [newMachine.machine_model, newMachine.machine_number]);

  const validateMachineForm = (data: ExtendedMachineFormData): string | null => {
    if (!data.machine_model.trim()) {
      return 'Machine model is required';
    }
    
    if (!data.machine_number || data.machine_number < 1) {
      return 'Machine number must be a positive integer';
    }
    
    // Owner name is now optional - removed this validation
    // if (!data.name.trim()) {
    //   return 'Owner name is required';
    // }

    if (data.microcontroller_uid.trim() && !isValidMicrocontrollerUID(data.microcontroller_uid)) {
      return 'Microcontroller UID must be 24 hexadecimal characters (e.g., 353636343034510C003F0046)';
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
        name: newMachine.name.trim() || 'Unassigned Machine', // Default name if empty
        location: newMachine.location.trim() || null,
        machine_model: newMachine.machine_model.trim(),
        purchase_date: newMachine.purchase_date || null,
        microcontroller_uid: newMachine.microcontroller_uid.trim() || null,
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
      
      setNewMachine({ 
        machine_id: '', 
        machine_model: '',
        name: '', 
        location: '', 
        purchase_date: '',
        microcontroller_uid: '',
        client_id: 'unassigned',
        machine_number: 1
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
      microcontroller_uid: machine.microcontroller_uid || '',
      client_id: machine.client_id || 'unassigned',
    });
  };

  const updateMachine = async () => {
    if (!editingMachine) {
      return;
    }

    // Owner name validation is now optional for updates too
    if (editMachineData.microcontroller_uid.trim() && !isValidMicrocontrollerUID(editMachineData.microcontroller_uid)) {
      toast({
        title: 'Validation Error',
        description: 'Microcontroller UID must be 24 hexadecimal characters',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      console.log('Updating machine:', editingMachine.id, editMachineData);
      
      const updateData = {
        name: editMachineData.name.trim() || 'Unassigned Machine', // Default name if empty
        location: editMachineData.location.trim() || null,
        machine_model: editMachineData.machine_model.trim() || null,
        purchase_date: editMachineData.purchase_date || null,
        microcontroller_uid: editMachineData.microcontroller_uid.trim() || null,
        client_id: editMachineData.client_id === 'unassigned' ? null : editMachineData.client_id,
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
        purchase_date: '',
        microcontroller_uid: '',
        client_id: 'unassigned'
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

  const updateMachineId = async (machineId: number, newId: string) => {
    try {
      console.log('Updating machine ID from database id:', machineId, 'to new machine_id:', newId);
      
      const { error } = await supabase
        .from('machines')
        .update({ 
          machine_id: newId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', machineId);

      if (error) {
        console.error('Update machine ID error:', error);
        throw error;
      }

      console.log('Machine ID updated successfully');

      toast({
        title: 'Success',
        description: `Machine ID updated to ${newId}`,
      });
      
      onRefresh();
    } catch (error: any) {
      console.error('Error updating machine ID:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Fix the specific machine ID from 79 to 97
  useEffect(() => {
    const fixMachineId = async () => {
      const machineToFix = machines.find(m => m.machine_id === 'KU001619000079');
      if (machineToFix) {
        console.log('Found machine with ID 79, updating to 97...');
        await updateMachineId(machineToFix.id, 'KU001619000097');
      }
    };

    if (machines.length > 0) {
      fixMachineId();
    }
  }, [machines]);

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

  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Unassigned';
    const client = clientProfiles.find(p => p.id === clientId);
    return client?.username || 'Unknown Client';
  };

  const getMachineOwnerDisplay = (machine: MachineWithClient) => {
    // If machine has no owner/name or default name, show as unassigned
    if (!machine.name || machine.name === 'Unassigned Machine') {
      return 'Unassigned';
    }
    return machine.name;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add New Machine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machineModel">Model *</Label>
              <Select
                value={newMachine.machine_model}
                onValueChange={(value) => {
                  setNewMachine({ ...newMachine, machine_model: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amphore">Amphore</SelectItem>
                  <SelectItem value="BoKs">BoKs</SelectItem>
                  <SelectItem value="Water Dispenser">Water Dispenser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineNumber">Machine Number *</Label>
              <Input
                id="machineNumber"
                type="number"
                min="1"
                value={newMachine.machine_number}
                onChange={(e) => {
                  setNewMachine({ ...newMachine, machine_number: parseInt(e.target.value) || 1 });
                }}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="generatedId">Generated ID</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="generatedId"
                  value={newMachine.machine_id}
                  readOnly
                  className="bg-gray-50"
                  placeholder="KU001619000001"
                />
                <Lightbulb className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="microcontrollerUid">Microcontroller UID</Label>
            <Input
              id="microcontrollerUid"
              value={newMachine.microcontroller_uid}
              onChange={(e) => setNewMachine({ ...newMachine, microcontroller_uid: e.target.value })}
              placeholder="353636343034510C003F0046"
              className={newMachine.microcontroller_uid && !isValidMicrocontrollerUID(newMachine.microcontroller_uid) ? 'border-red-500' : ''}
            />
            {newMachine.microcontroller_uid && !isValidMicrocontrollerUID(newMachine.microcontroller_uid) && (
              <p className="text-sm text-red-500">Must be 24 hexadecimal characters</p>
            )}
            <p className="text-sm text-gray-500">Required for live data functionality</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machineName">Owner (Optional)</Label>
              <Input
                id="machineName"
                value={newMachine.name}
                onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                placeholder="French Embassy (leave empty if unassigned)"
              />
              <p className="text-sm text-gray-500">Leave empty for machines not yet sold</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSelect">Assign to Client (Optional)</Label>
              <Select
                value={newMachine.client_id}
                onValueChange={(value) => setNewMachine({ ...newMachine, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">No client assigned</SelectItem>
                  {clientProfiles.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            disabled={loading || !newMachine.machine_model || !newMachine.machine_number}
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
                <Select
                  value={editMachineData.machine_model}
                  onValueChange={(value) => setEditMachineData({ ...editMachineData, machine_model: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Amphore">Amphore</SelectItem>
                    <SelectItem value="BoKs">BoKs</SelectItem>
                    <SelectItem value="Water Dispenser">Water Dispenser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMachineName">Owner (Optional)</Label>
                <Input
                  id="editMachineName"
                  value={editMachineData.name}
                  onChange={(e) => setEditMachineData({ ...editMachineData, name: e.target.value })}
                  placeholder="French Embassy (leave empty if unassigned)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editMicrocontrollerUid">Microcontroller UID</Label>
              <Input
                id="editMicrocontrollerUid"
                value={editMachineData.microcontroller_uid}
                onChange={(e) => setEditMachineData({ ...editMachineData, microcontroller_uid: e.target.value })}
                placeholder="353636343034510C003F0046"
                className={editMachineData.microcontroller_uid && !isValidMicrocontrollerUID(editMachineData.microcontroller_uid) ? 'border-red-500' : ''}
              />
              {editMachineData.microcontroller_uid && !isValidMicrocontrollerUID(editMachineData.microcontroller_uid) && (
                <p className="text-sm text-red-500">Must be 24 hexadecimal characters</p>
              )}
              <p className="text-sm text-gray-500">Required for live data functionality</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editClientSelect">Assign to Client</Label>
                <Select
                  value={editMachineData.client_id}
                  onValueChange={(value) => setEditMachineData({ ...editMachineData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">No client assigned</SelectItem>
                    {clientProfiles.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMachineLocation">Location</Label>
                <Input
                  id="editMachineLocation"
                  value={editMachineData.location}
                  onChange={(e) => setEditMachineData({ ...editMachineData, location: e.target.value })}
                  placeholder="Paris, France"
                />
              </div>
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

            <div className="flex gap-2">
              <Button onClick={updateMachine} disabled={loading}>
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
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Live Data</TableHead>
                  <TableHead>Operating Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-mono">{machine.machine_id}</TableCell>
                    <TableCell>{getDisplayModelName(machine)}</TableCell>
                    <TableCell>{getMachineOwnerDisplay(machine)}</TableCell>
                    <TableCell>{getClientName(machine.client_id)}</TableCell>
                    <TableCell>{machine.location || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasLiveDataCapability(machine) ? (
                          <>
                            <Wifi className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Available</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">No UID</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getOperatingSince(machine)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditMachine(machine)}
                          disabled={loading}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <ResetMetricsButton 
                          machineId={machine.machine_id}
                          onResetComplete={onRefresh}
                        />
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
