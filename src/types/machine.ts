
// Core machine type that matches the database schema exactly
export interface DatabaseMachine {
  id: number;
  machine_id: string;
  name: string;
  location: string | null;
  machine_model: string | null;
  purchase_date: string | null;
  client_id: string | null;
  manager_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Extended machine type with client profile for display
export interface MachineWithClient extends DatabaseMachine {
  client_profile?: {
    username: string;
  };
}

// Form data type for adding/editing machines
export interface MachineFormData {
  machine_id: string;
  name: string;
  location: string;
  machine_model: string;
  purchase_date: string;
  microcontroller_uid: string;
}

// Type for microcontroller assignments
export interface MicrocontrollerAssignment {
  id: string;
  machine_id: number;
  microcontroller_uid: string;
  assigned_at: string;
  unassigned_at: string | null;
  assigned_by: string | null;
  unassigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Validation function for machine IDs - Updated to use 6 digits after 619
export const isValidMachineId = (machineId: string): boolean => {
  return /^KU00[123]619\d{6}$/.test(machineId.trim());
};

// Validation function for microcontroller UIDs
export const isValidMicrocontrollerUID = (uid: string): boolean => {
  return /^[0-9A-Fa-f]{24}$/.test(uid.trim());
};

// Helper to get display model name based on machine ID pattern
export const getDisplayModelName = (machine: DatabaseMachine): string => {
  // Use database model if available, otherwise infer from ID
  if (machine.machine_model) {
    return machine.machine_model;
  }
  
  // Infer model from machine ID pattern (6 digits after 619)
  if (machine.machine_id.includes('001619')) return 'Amphore';
  if (machine.machine_id.includes('002619')) return 'BoKs';
  if (machine.machine_id.includes('003619')) return 'Water Dispenser';
  return 'Unknown';
};

// Helper to get operating since date
export const getOperatingSince = (machine: DatabaseMachine): string => {
  if (machine.purchase_date) {
    return new Date(machine.purchase_date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  if (machine.created_at) {
    return new Date(machine.created_at).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  return 'Unknown';
};

// Helper to check if machine has live data capability
export const hasLiveDataCapability = (machine: DatabaseMachine): boolean => {
  // This will now be determined by checking if the machine has an active microcontroller assignment
  // We'll need to pass the current UID separately or fetch it when needed
  return true; // Temporary - will be updated by the hooks that fetch the current UID
};

// Helper to generate machine ID based on model and number
export const generateMachineId = (model: string, machineNumber: number): string => {
  let modelCode = '';
  switch (model.toLowerCase()) {
    case 'amphore':
      modelCode = '001';
      break;
    case 'boks':
      modelCode = '002';
      break;
    case 'water dispenser':
      modelCode = '003';
      break;
    default:
      throw new Error('Invalid model');
  }
  
  const paddedNumber = machineNumber.toString().padStart(6, '0');
  return `KU${modelCode}619${paddedNumber}`;
};
