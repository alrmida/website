
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Machine, getModelName, getOperatingSince } from '@/utils/machineHelpers';

interface Client {
  id: string;
  username: string;
}

interface MachineListProps {
  machines: Machine[];
  clients: Client[];
  selectedMachine: Machine | null;
  selectedClient: string;
  userRole: string;
  onMachineSelect: (machineId: string) => void;
  title?: string;
}

const MachineList = ({ 
  machines, 
  selectedMachine, 
  userRole, 
  onMachineSelect,
  title = "Available Machines"
}: MachineListProps) => {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <Select 
        value={selectedMachine?.machine_id || undefined} 
        onValueChange={onMachineSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a machine..." />
        </SelectTrigger>
        <SelectContent>
          {machines.map((machine) => (
            <SelectItem key={machine.id} value={machine.machine_id}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {machine.machine_id} - {getModelName(machine.machine_id)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {machine.location} • Operating since {getOperatingSince(machine.machine_id)}
                </span>
                {(userRole === 'commercial' || userRole === 'admin') && machine.client_profile?.username && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Client: {machine.client_profile.username}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default MachineList;
