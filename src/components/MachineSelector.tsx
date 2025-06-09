
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMachineData } from '@/hooks/useMachineData';
import { Machine, isValidMachine } from '@/utils/machineHelpers';
import MachineList from '@/components/MachineList';

interface MachineSelectorProps {
  onMachineSelect: (machine: Machine) => void;
  selectedMachine: Machine | null;
}

const MachineSelector = ({ onMachineSelect, selectedMachine }: MachineSelectorProps) => {
  const { machines, loading, profile } = useMachineData();

  // Auto-select first machine for clients when machines are loaded
  useEffect(() => {
    if (profile?.role === 'client' && machines.length > 0 && !selectedMachine && !loading) {
      console.log('Auto-selecting first machine for client:', machines[0]);
      onMachineSelect(machines[0]);
    }
  }, [machines, selectedMachine, profile, onMachineSelect, loading]);

  const handleMachineSelect = (machineId: string) => {
    const machine = machines.find(m => m.machine_id === machineId);
    if (machine) {
      console.log('Selecting machine:', machine);
      onMachineSelect(machine);
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
            Loading machine data...
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableMachines = machines.filter(isValidMachine);

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Select Machine
          <Badge variant={profile?.role === 'commercial' || profile?.role === 'admin' ? 'default' : 'secondary'}>
            {profile?.role === 'commercial' || profile?.role === 'admin' ? 'KUMULUS Personnel' : 'Client'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MachineList
          machines={availableMachines}
          clients={[]}
          selectedMachine={selectedMachine}
          selectedClient=""
          userRole={profile?.role || ''}
          onMachineSelect={handleMachineSelect}
          title="Available Machines"
        />

        {availableMachines.length === 0 && !loading && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No machines available.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineSelector;
