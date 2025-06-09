
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
}

// Validation function for machine IDs
export const isValidMachineId = (machineId: string): boolean => {
  return /^KU\d{12}$/.test(machineId.trim());
};

// Helper to get display model name (fallback logic)
export const getDisplayModelName = (machine: DatabaseMachine): string => {
  // Use database model if available, otherwise fallback to ID-based logic
  if (machine.machine_model) {
    return machine.machine_model;
  }
  
  // Fallback logic for backwards compatibility
  if (machine.machine_id === 'KU001619000079') return 'Amphore';
  if (machine.machine_id.startsWith('KU0016190000')) return 'Amphore';
  if (machine.machine_id.startsWith('KU0016191000')) return 'BoKs';
  if (machine.machine_id.startsWith('KU0016192000')) return 'Dispenser';
  return 'Unknown';
};

// Helper to get operating since date (should come from purchase_date or created_at)
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
