
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMachineData } from '@/hooks/useMachineData';
import { Machine, isValidMachine } from '@/utils/machineHelpers';
import ClientSelector from '@/components/ClientSelector';
import MachineList from '@/components/MachineList';

interface MachineSelectorProps {
  onMachineSelect: (machine: Machine) => void;
  selectedMachine: Machine | null;
}

const MachineSelector = ({ onMachineSelect, selectedMachine }: MachineSelectorProps) => {
  const { machines, clients, loading, profile } = useMachineData();
  const [selectedClient, setSelectedClient] = useState<string>('');

  // Auto-select first machine for clients when machines are loaded
  useEffect(() => {
    if (profile?.role === 'client' && machines.length > 0 && !selectedMachine && !loading) {
      console.log('Auto-selecting first machine for client:', machines[0]);
      onMachineSelect(machines[0]);
    }
  }, [machines, selectedMachine, profile, onMachineSelect, loading]);

  // Auto-select the Kumulus client when data loads for commercial/admin users
  useEffect(() => {
    if ((profile?.role === 'commercial' || profile?.role === 'admin') && 
        clients.length > 0 && !selectedClient && !loading) {
      const kumulusClient = clients.find(c => c.username === 'Kumulus');
      if (kumulusClient) {
        console.log('Auto-selecting Kumulus client for commercial user');
        setSelectedClient(kumulusClient.id);
      }
    }
  }, [clients, selectedClient, profile, loading]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    // Clear machine selection when client changes
    if (selectedMachine) {
      onMachineSelect(null as any);
    }
  };

  const handleDirectMachineSelect = (machineId: string) => {
    const machine = machines.find(m => m.machine_id === machineId);
    if (machine) {
      console.log('Selecting machine:', machine);
      onMachineSelect(machine);
      // If commercial/admin selects directly, set the client too
      if (profile?.role === 'commercial' || profile?.role === 'admin') {
        setSelectedClient(machine.client_id);
      }
    }
  };

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Loading machines...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            Setting up demo accounts and loading machine data...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get filtered client machines and ensure they all have valid machine_ids
  const getClientMachines = () => {
    if (profile?.role === 'client') {
      return machines;
    }
    
    if (selectedClient) {
      return machines.filter(machine => machine.client_id === selectedClient);
    }
    
    return machines;
  };

  const clientMachines = getClientMachines().filter(isValidMachine);

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Machine Selection
          <Badge variant={profile?.role === 'commercial' || profile?.role === 'admin' ? 'default' : 'secondary'}>
            {profile?.role === 'commercial' || profile?.role === 'admin' ? 'KUMULUS Personnel' : 'Client'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(profile?.role === 'commercial' || profile?.role === 'admin') && (
          <>
            <ClientSelector
              clients={clients}
              selectedClient={selectedClient}
              onClientSelect={handleClientSelect}
            />

            <div className="border-t pt-4">
              <MachineList
                machines={machines.filter(isValidMachine)}
                clients={clients}
                selectedMachine={selectedMachine}
                selectedClient={selectedClient}
                userRole={profile?.role || ''}
                onMachineSelect={handleDirectMachineSelect}
                showDirectSelection={true}
              />
            </div>
          </>
        )}

        <MachineList
          machines={clientMachines}
          clients={clients}
          selectedMachine={selectedMachine}
          selectedClient={selectedClient}
          userRole={profile?.role || ''}
          onMachineSelect={handleDirectMachineSelect}
        />

        {clientMachines.length === 0 && !loading && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            {(profile?.role === 'commercial' || profile?.role === 'admin') && !selectedClient ? 
              'Select a client to view their machines' :
              'No machines available. Demo setup may still be in progress.'
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineSelector;
