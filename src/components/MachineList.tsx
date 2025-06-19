
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MachineWithClient, getDisplayModelName, getOperatingSince } from '@/types/machine';

interface Client {
  id: string;
  username: string;
}

interface MachineListProps {
  machines: MachineWithClient[];
  clients: Client[];
  selectedMachine: MachineWithClient | null;
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
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a machine..." />
        </SelectTrigger>
        <SelectContent position="popper" className="w-[--radix-select-trigger-width] min-w-full">
          {machines.map((machine) => (
            <SelectItem key={machine.id} value={machine.machine_id} className="w-full">
              <div className="flex flex-col w-full min-w-0">
                <span className="font-medium truncate">
                  {machine.machine_id} - {getDisplayModelName(machine)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {machine.name} • {machine.location || 'No location'} • Operating since {getOperatingSince(machine)}
                </span>
                {(userRole === 'commercial' || userRole === 'admin') && machine.client_profile?.username && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 truncate">
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
