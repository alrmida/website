
import React from 'react';
import { MachineWithClient, getDisplayModelName } from '@/types/machine';

interface SelectedMachineInfoProps {
  selectedMachine: MachineWithClient;
}

const SelectedMachineInfo = ({ selectedMachine }: SelectedMachineInfoProps) => {
  return (
    <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 overflow-hidden">
      <h3 className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">
        Selected Machine
      </h3>
      <div className="mt-1 space-y-1">
        <p className="text-blue-800 dark:text-blue-200 text-sm sm:text-base font-mono break-all">
          {selectedMachine.machine_id} - {getDisplayModelName(selectedMachine)}
        </p>
        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-300 break-words">
          Location: {selectedMachine.location || 'Not specified'}
        </p>
      </div>
    </div>
  );
};

export default SelectedMachineInfo;
