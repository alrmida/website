
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
  showDirectSelection?: boolean;
  title?: string;
}

const MachineList = ({ 
  machines, 
  clients, 
  selectedMachine, 
  selectedClient, 
  userRole, 
  onMachineSelect,
  showDirectSelection = false,
  title
}: MachineListProps) => {
  const getFilteredMachines = () => {
    if (userRole === 'client') {
      return machines;
    }
    
    if (selectedClient && !showDirectSelection) {
      return machines.filter(machine => machine.client_id === selectedClient);
    }
    
    return machines;
  };

  const filteredMachines = getFilteredMachines();

  const getTitle = () => {
    if (title) return title;
    if ((userRole === 'commercial' || userRole === 'admin') && selectedClient && !showDirectSelection) {
      return `Machines for ${clients.find(c => c.id === selectedClient)?.username}`;
    }
    return 'Available Machines';
  };

  return (
    <div className="space-y-2">
      <Label>
        {showDirectSelection ? 
          'Or select machine directly by ID:' : 
          getTitle()
        }
      </Label>
      <Select 
        value={selectedMachine?.machine_id || undefined} 
        onValueChange={onMachineSelect}
      >
        <SelectTrigger className={showDirectSelection ? "mt-2" : ""}>
          <SelectValue placeholder={showDirectSelection ? "Choose machine ID..." : "Choose a machine..."} />
        </SelectTrigger>
        <SelectContent>
          {filteredMachines.map((machine) => (
            <SelectItem key={machine.id} value={machine.machine_id}>
              {showDirectSelection ? (
                `${machine.machine_id} - ${machine.client_profile?.username}`
              ) : (
                <div className="flex flex-col">
                  <span className="font-medium">{machine.machine_id} - {getModelName(machine.machine_id)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Operating since {getOperatingSince(machine.machine_id)}
                  </span>
                </div>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default MachineList;
