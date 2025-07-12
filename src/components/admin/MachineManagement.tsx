import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Plus, Edit, Save, X } from 'lucide-react';
import { MachineWithClient, MachineFormData, generateMachineId, isValidMachineId, isValidMicrocontrollerUID } from '@/types/machine';
import { useMachineData } from '@/hooks/useMachineData';

export const MachineManagement = () => {
  const { machines, loading, error, refetch } = useMachineData();
  const [editingMachine, setEditingMachine] = useState<MachineWithClient | null>(null);
  const [formData, setFormData] = useState<MachineFormData>({
    machine_id: '',
    name: '',
    location: '',
    machine_model: '',
    purchase_date: '',
    microcontroller_uid: ''
  });
  const [clients, setClients] = useState<Array<{ id: string; username: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('role', 'client');
    
    if (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    } else {
      setClients(data || []);
    }
  };

  const resetForm = () => {
    setFormData({
      machine_id: '',
      name: '',
      location: '',
      machine_model: '',
      purchase_date: '',
      microcontroller_uid: ''
    });
    setSelectedClientId('');
    setEditingMachine(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidMachineId(formData.machine_id)) {
      toast.error('Invalid machine ID format. Use format: KU00[1-3]619XXXXXX');
      return;
    }

    if (formData.microcontroller_uid && !isValidMicrocontrollerUID(formData.microcontroller_uid)) {
      toast.error('Invalid microcontroller UID format. Must be 24 hex characters.');
      return;
    }

    try {
      const { error } = await supabase
        .from('machines')
        .insert([{
          ...formData,
          client_id: selectedClientId || null,
          purchase_date: formData.purchase_date || null,
          microcontroller_uid: formData.microcontroller_uid || null
        }]);

      if (error) {
        console.error('Error creating machine:', error);
        toast.error(`Failed to create machine: ${error.message}`);
        return;
      }

      toast.success('Machine created successfully');
      resetForm();
      refetch();
    } catch (error) {
      console.error('Exception creating machine:', error);
      toast.error('Failed to create machine');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;

    if (!isValidMachineId(formData.machine_id)) {
      toast.error('Invalid machine ID format. Use format: KU00[1-3]619XXXXXX');
      return;
    }

    if (formData.microcontroller_uid && !isValidMicrocontrollerUID(formData.microcontroller_uid)) {
      toast.error('Invalid microcontroller UID format. Must be 24 hex characters.');
      return;
    }

    try {
      const { error } = await supabase
        .from('machines')
        .update({
          ...formData,
          client_id: selectedClientId || null,
          purchase_date: formData.purchase_date || null,
          microcontroller_uid: formData.microcontroller_uid || null
        })
        .eq('id', editingMachine.id);

      if (error) {
        console.error('Error updating machine:', error);
        toast.error(`Failed to update machine: ${error.message}`);
        return;
      }

      toast.success('Machine updated successfully');
      resetForm();
      refetch();
    } catch (error) {
      console.error('Exception updating machine:', error);
      toast.error('Failed to update machine');
    }
  };

  const handleDelete = async (machineId: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) return;

    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machineId);

      if (error) {
        console.error('Error deleting machine:', error);
        toast.error(`Failed to delete machine: ${error.message}`);
        return;
      }

      toast.success('Machine deleted successfully');
      refetch();
    } catch (error) {
      console.error('Exception deleting machine:', error);
      toast.error('Failed to delete machine');
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
    setSelectedClientId(machine.client_id || '');
  };

  if (loading) return <div>Loading machines...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingMachine ? 'Edit Machine' : 'Add New Machine'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={editingMachine ? handleUpdate : handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="machine_id">Machine ID</Label>
                <Input
                  id="machine_id"
                  value={formData.machine_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                  placeholder="KU001619000001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="machine_model">Machine Model</Label>
                <Select
                  value={formData.machine_model}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, machine_model: value }))}
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
              <div>
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="microcontroller_uid">Microcontroller UID</Label>
                <Input
                  id="microcontroller_uid"
                  value={formData.microcontroller_uid}
                  onChange={(e) => setFormData(prev => ({ ...prev, microcontroller_uid: e.target.value }))}
                  placeholder="353636343034510C003F0046"
                />
              </div>
              <div>
                <Label htmlFor="client">Client</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingMachine ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingMachine ? 'Update Machine' : 'Add Machine'}
              </Button>
              {editingMachine && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Machines ({machines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {machines.map((machine) => (
              <div key={machine.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{machine.machine_id}</h3>
                    <p className="text-sm text-gray-600">{machine.name}</p>
                    <p className="text-sm text-gray-600">
                      {machine.machine_model} - {machine.location || 'No location'}
                    </p>
                    {machine.microcontroller_uid && (
                      <p className="text-xs text-blue-600">UID: {machine.microcontroller_uid}</p>
                    )}
                    {machine.client_profile?.username && (
                      <p className="text-xs text-green-600">Client: {machine.client_profile.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(machine)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(machine.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
