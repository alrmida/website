
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
        <SelectContent position="popper" className="w-full min-w-[var(--radix-select-trigger-width)]">
          {machines.map((machine) => (
            <SelectItem key={machine.id} value={machine.machine_id} className="w-full py-2">
              <div className="flex flex-col w-full gap-1">
                <div className="font-medium text-sm">
                  {machine.machine_id}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getDisplayModelName(machine)} • {machine.name} • {machine.location || 'No location'} • {getOperatingSince(machine)}
                </div>
                {(userRole === 'commercial' || userRole === 'admin') && machine.client_profile?.username && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Client: {machine.client_profile.username}
                  </div>
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
