
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useMachineData } from '@/hooks/useMachineData';
import { MachineWithClient, isValidMachineId } from '@/types/machine';
import MachineList from '@/components/MachineList';

interface MachineSelectorProps {
  onMachineSelect: (machine: MachineWithClient) => void;
  selectedMachine: MachineWithClient | null;
}

const MachineSelector = ({ onMachineSelect, selectedMachine }: MachineSelectorProps) => {
  const { machines, loading, profile, refetch } = useMachineData();

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

  const handleRefresh = () => {
    console.log('Refreshing machine data...');
    refetch();
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

  const availableMachines = machines.filter(machine => isValidMachineId(machine.machine_id));

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Select Machine
            <Badge variant={profile?.role === 'commercial' || profile?.role === 'admin' ? 'default' : 'secondary'}>
              {profile?.role === 'commercial' || profile?.role === 'admin' ? 'KUMULUS Personnel' : 'Client'}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Debug information for troubleshooting */}
        {profile?.role === 'admin' && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Profile Role: {profile.role}</p>
            <p>Profile ID: {profile.id}</p>
            <p>Total Machines Found: {machines.length}</p>
            <p>Valid Machines: {availableMachines.length}</p>
            {machines.length > 0 && (
              <p>Machine IDs: {machines.map(m => m.machine_id).join(', ')}</p>
            )}
          </div>
        )}

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
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No machines available.
            </p>
            {profile?.role === 'admin' && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                As an admin, you should see all machines. This might be a database or RBAC configuration issue.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineSelector;
