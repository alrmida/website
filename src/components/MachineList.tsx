
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
        <SelectContent position="popper" className="w-full min-w-[var(--radix-select-trigger-width)] max-w-md">
          {machines.map((machine) => (
            <SelectItem key={machine.id} value={machine.machine_id} className="w-full py-3 px-3">
              <div className="flex flex-col w-full space-y-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {machine.machine_id}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="font-medium">{getDisplayModelName(machine)}</span>
                  <span className="mx-1">•</span>
                  <span>{machine.name}</span>
                  <span className="mx-1">•</span>
                  <span>{machine.location || 'No location'}</span>
                  <span className="mx-1">•</span>
                  <span>{getOperatingSince(machine)}</span>
                </div>
                {(userRole === 'commercial' || userRole === 'admin') && machine.client_profile?.username && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
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
