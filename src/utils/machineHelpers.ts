
export interface Machine {
  id: number;
  machine_id: string;
  name: string;
  location: string;
  client_id: string;
  client_profile?: {
    username: string;
  };
}

// Helper function to get model name based on machine ID
export const getModelName = (machineId: string): string => {
  if (machineId === 'KU001619000079') return 'Amphore'; // Live data machine
  if (machineId.startsWith('KU0016190000')) return 'Amphore';
  if (machineId.startsWith('KU0016191000')) return 'BoKs';
  if (machineId.startsWith('KU0016192000')) return 'Dispenser';
  return 'Amphore'; // Default to Amphore
};

// Helper function to get operating since date
export const getOperatingSince = (machineId: string): string => {
  if (machineId === 'KU001619000079') return '15 March 2024'; // Live data machine
  if (machineId === 'KU001619000001') return '23 June 1999';
  if (machineId === 'KU001619000002') return '15 January 2024';
  if (machineId === 'KU001619000003') return '8 November 2023';
  if (machineId === 'KU001619000004') return '30 September 2023';
  if (machineId === 'KU001619000005') return '12 December 2023';
  if (machineId === 'KU001619000006') return '5 February 2024';
  return '15 March 2024'; // Default date
};

// Helper function to validate machine has valid machine_id
export const isValidMachine = (machine: any): machine is Machine => {
  return machine && 
         machine.machine_id && 
         typeof machine.machine_id === 'string' && 
         machine.machine_id.trim() !== '' &&
         machine.machine_id.trim().length > 0;
};
