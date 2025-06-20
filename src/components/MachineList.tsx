
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
          <SelectValue placeholder="Choose a machine...">
            {selectedMachine?.machine_id}
          </SelectValue>
        </SelectTrigger>
        <SelectContent 
          position="popper" 
          className="w-full min-w-[600px] max-w-[800px] z-50 bg-white dark:bg-gray-800"
        >
          {machines.map((machine) => (
            <SelectItem key={machine.id} value={machine.machine_id} className="w-full py-3 pl-10 pr-4 min-w-0">
              <div className="flex flex-col w-full min-w-0 space-y-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {machine.machine_id}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium whitespace-nowrap">{getDisplayModelName(machine)}</span>
                    <span className="text-gray-400">•</span>
                    <span className="truncate min-w-0">{machine.name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="whitespace-nowrap">{machine.location || 'No location'}</span>
                    <span className="text-gray-400">•</span>
                    <span className="whitespace-nowrap">{getOperatingSince(machine)}</span>
                  </div>
                </div>
                {(userRole === 'commercial' || userRole === 'admin') && machine.client_profile?.username && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
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
