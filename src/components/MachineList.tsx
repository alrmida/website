
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
        <SelectContent 
          position="popper" 
          className="w-full max-w-md z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
        >
          {machines.map((machine) => (
            <SelectItem 
              key={machine.id} 
              value={machine.machine_id} 
              className="w-full py-3 px-4 focus:bg-gray-50 dark:focus:bg-gray-700 cursor-pointer"
            >
              <div className="w-full space-y-1.5">
                {/* Machine ID - prominent */}
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {machine.machine_id}
                </div>
                
                {/* Machine details - compact layout */}
                <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                  <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
                    <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">Model:</span>
                    <span className="break-words">{getDisplayModelName(machine)}</span>
                  </div>
                  
                  <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
                    <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">Name:</span>
                    <span className="break-words">{machine.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
                    <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">Location:</span>
                    <span className="break-words">{machine.location || 'No location'}</span>
                  </div>
                  
                  <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
                    <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">Since:</span>
                    <span className="break-words">{getOperatingSince(machine)}</span>
                  </div>
                  
                  {(userRole === 'commercial' || userRole === 'admin') && machine.client_profile?.username && (
                    <div className="grid grid-cols-[auto_1fr] gap-2 items-start pt-1 border-t border-gray-200 dark:border-gray-600">
                      <span className="font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">Client:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium break-words">
                        {machine.client_profile.username}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default MachineList;
