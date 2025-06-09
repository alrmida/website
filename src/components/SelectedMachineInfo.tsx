
import React from 'react';
import { MachineWithClient, getDisplayModelName } from '@/types/machine';

interface SelectedMachineInfoProps {
  selectedMachine: MachineWithClient;
}

const SelectedMachineInfo = ({ selectedMachine }: SelectedMachineInfoProps) => {
  return (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
      <h3 className="font-medium text-blue-900 dark:text-blue-100">Selected Machine</h3>
      <p className="text-blue-800 dark:text-blue-200">{selectedMachine.machine_id} - {getDisplayModelName(selectedMachine)}</p>
      <p className="text-sm text-blue-600 dark:text-blue-300">Location: {selectedMachine.location}</p>
    </div>
  );
};

export default SelectedMachineInfo;
