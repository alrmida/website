
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Shield, Wifi, WifiOff } from 'lucide-react';
import { useMachineData } from '@/hooks/useMachineData';
import { MachineWithClient, isValidMachineId, hasLiveDataCapability } from '@/types/machine';
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
  const liveDataMachines = availableMachines.filter(hasLiveDataCapability);

  return (
    <Card className="bg-white dark:bg-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {profile?.role === 'admin' && <Shield className="h-5 w-5 text-blue-600" />}
            Select Machine
            <Badge variant={profile?.role === 'admin' ? 'default' : profile?.role === 'commercial' ? 'default' : 'secondary'}>
              {profile?.role === 'admin' ? 'ADMIN - Full Access' : 
               profile?.role === 'commercial' ? 'KUMULUS Personnel' : 'Client'}
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
        {/* Enhanced debug information for admins */}
        {profile?.role === 'admin' && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <strong className="text-blue-800 dark:text-blue-200">Admin Debug Panel</strong>
            </div>
            <div className="space-y-1 text-blue-700 dark:text-blue-300">
              <p><strong>Profile Role:</strong> {profile.role}</p>
              <p><strong>Profile ID:</strong> {profile.id}</p>
              <p><strong>Username:</strong> {profile.username}</p>
              <p><strong>Total Machines Found:</strong> {machines.length}</p>
              <p><strong>Valid Machines:</strong> {availableMachines.length}</p>
              <p><strong>Live Data Capable:</strong> {liveDataMachines.length}</p>
              {machines.length > 0 && (
                <p><strong>Machine IDs:</strong> {machines.map(m => m.machine_id).join(', ')}</p>
              )}
              <p className="text-xs mt-2 p-2 bg-blue-100 dark:bg-blue-800 rounded">
                As an admin, you should see ALL machines regardless of client assignment. 
                Machines with microcontroller UIDs can provide live data.
              </p>
            </div>
          </div>
        )}

        {/* Live data capability summary */}
        {availableMachines.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 border rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">{liveDataMachines.length} Live Data Capable</span>
                </div>
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">{availableMachines.length - liveDataMachines.length} Offline Only</span>
                </div>
              </div>
              <span className="text-gray-500">Total: {availableMachines.length}</span>
            </div>
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
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <strong>Admin Alert:</strong> You should see all machines in the system. 
                This indicates a database or filtering issue that needs investigation.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineSelector;
