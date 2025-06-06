
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useMachineData } from '@/hooks/useMachineData';
import { Machine, isValidMachine } from '@/utils/machineHelpers';
import ClientSelector from '@/components/ClientSelector';
import MachineList from '@/components/MachineList';
import SelectedMachineInfo from '@/components/SelectedMachineInfo';

interface MachineSelectorProps {
  onMachineSelect: (machine: Machine) => void;
  selectedMachine: Machine | null;
}

const MachineSelector = ({ onMachineSelect, selectedMachine }: MachineSelectorProps) => {
  const { machines, clients, loading, profile } = useMachineData();
  const [selectedClient, setSelectedClient] = useState<string>('');

  // Auto-select first machine for clients
  useEffect(() => {
    if (profile?.role === 'client' && machines.length > 0 && !selectedMachine) {
      onMachineSelect(machines[0]);
    }
  }, [machines, selectedMachine, profile, onMachineSelect]);

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

        {selectedMachine && (
          <SelectedMachineInfo selectedMachine={selectedMachine} />
        )}

        {clientMachines.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            {(profile?.role === 'commercial' || profile?.role === 'admin') && !selectedClient ? 
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
