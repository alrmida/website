
// Re-export types from the unified location
export type { DatabaseMachine as Machine, MachineWithClient, MachineFormData } from '@/types/machine';
export { 
  isValidMachineId as isValidMachine, 
  getDisplayModelName as getModelName,
  getOperatingSince 
} from '@/types/machine';
