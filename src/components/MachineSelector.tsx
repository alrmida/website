
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Machine {
  id: number;
  machine_id: string;
  name: string;
  location: string;
  client_id: string;
  client_profile?: {
    username: string;
  };
}

interface Client {
  id: string;
  username: string;
}

interface MachineSelectorProps {
  onMachineSelect: (machine: Machine) => void;
  selectedMachine: Machine | null;
}

const MachineSelector = ({ onMachineSelect, selectedMachine }: MachineSelectorProps) => {
  const { profile } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Helper function to validate machine has valid machine_id
  const isValidMachine = (machine: any): machine is Machine => {
    return machine && 
           machine.machine_id && 
           typeof machine.machine_id === 'string' && 
           machine.machine_id.trim() !== '' &&
           machine.machine_id.trim().length > 0;
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    console.log('Fetching data for profile:', profile);
    setLoading(true);

    try {
      if (profile.role === 'client') {
        // Clients see only their machines
        const { data: machinesData, error } = await supabase
          .from('machines')
          .select('*')
          .eq('client_id', profile.id);
        
        console.log('Client machines data:', machinesData, 'Error:', error);
        
        if (machinesData) {
          // Filter out machines with empty machine_id using the helper function
          const validMachines = machinesData.filter(isValidMachine);
          console.log('Valid machines after filtering:', validMachines);
          setMachines(validMachines);
          // Auto-select first machine for clients
          if (validMachines.length > 0 && !selectedMachine) {
            onMachineSelect(validMachines[0]);
          }
        }
      } else {
        // Kumulus personnel see all machines and clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('role', 'client');
        
        console.log('Clients data:', clientsData, 'Error:', clientsError);
        
        // Fixed query for machines with proper relationship naming
        const { data: machinesData, error: machinesError } = await supabase
          .from('machines')
          .select(`
            *,
            client_profile:profiles!client_id (
              username
            )
          `);
        
        console.log('All machines data:', machinesData, 'Error:', machinesError);
        
        if (clientsData) setClients(clientsData);
        if (machinesData) {
          // Filter out machines with empty machine_id using the helper function
          const validMachines = machinesData.filter(isValidMachine);
          console.log('Valid machines after filtering:', validMachines);
          setMachines(validMachines);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }

    setLoading(false);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    // Clear machine selection when client changes
    if (selectedMachine) {
      onMachineSelect(null as any);
    }
  };

  const getClientMachines = () => {
    if (profile?.role === 'client') {
      return machines;
    }
    
    if (selectedClient) {
      return machines.filter(machine => machine.client_id === selectedClient);
    }
    
    return machines;
  };

  const handleDirectMachineSelect = (machineId: string) => {
    const machine = machines.find(m => m.machine_id === machineId);
    if (machine) {
      onMachineSelect(machine);
      // If kumulus personnel selects directly, set the client too
      if (profile?.role === 'kumulus_personnel') {
        setSelectedClient(machine.client_id);
      }
    }
  };

  // Set up demo accounts when component mounts
  useEffect(() => {
    const setupDemoAccounts = async () => {
      try {
        console.log('Setting up demo accounts...');
        const response = await supabase.functions.invoke('setup-demo-accounts');
        console.log('Demo accounts setup result:', response);
      } catch (error) {
        console.error('Error setting up demo accounts:', error);
      }
    };
    
    // Only run once when the component first mounts
    setupDemoAccounts();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Loading machines...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Get filtered client machines and ensure they all have valid machine_ids
  const clientMachines = getClientMachines().filter(isValidMachine);

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Machine Selection
          <Badge variant={profile?.role === 'kumulus_personnel' ? 'default' : 'secondary'}>
            {profile?.role === 'kumulus_personnel' ? 'Kumulus Personnel' : 'Client'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.role === 'kumulus_personnel' && (
          <>
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select value={selectedClient || undefined} onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
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

            <div className="border-t pt-4">
              <Label className="text-sm text-gray-600 dark:text-gray-400">
                Or select machine directly by ID:
              </Label>
              <Select 
                value={selectedMachine?.machine_id || undefined} 
                onValueChange={handleDirectMachineSelect}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose machine ID..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.filter(isValidMachine).map((machine) => (
                    <SelectItem key={machine.id} value={machine.machine_id}>
                      {machine.machine_id} - {machine.client_profile?.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>
            {profile?.role === 'kumulus_personnel' && selectedClient ? 
              `Machines for ${clients.find(c => c.id === selectedClient)?.username}` : 
              'Available Machines'
            }
          </Label>
          <Select 
            value={selectedMachine?.machine_id || undefined} 
            onValueChange={handleDirectMachineSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a machine..." />
            </SelectTrigger>
            <SelectContent>
              {clientMachines.map((machine) => (
                <SelectItem key={machine.id} value={machine.machine_id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{machine.machine_id} - {machine.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {machine.location}
                      {profile?.role === 'kumulus_personnel' && machine.client_profile && 
                        ` • Owner: ${machine.client_profile.username}`
                      }
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMachine && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Selected Machine</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {selectedMachine.machine_id} - {selectedMachine.name}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Location: {selectedMachine.location}
            </p>
            {profile?.role === 'kumulus_personnel' && selectedMachine.client_profile && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Owner: {selectedMachine.client_profile.username}
              </p>
            )}
          </div>
        )}

        {clientMachines.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            {profile?.role === 'kumulus_personnel' && !selectedClient ? 
              'Select a client to view their machines' :
              'No machines available'
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineSelector;
