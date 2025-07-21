
// Re-export types from the unified location
export type { DatabaseMachine as Machine, MachineWithClient, MachineFormData, MicrocontrollerAssignment } from '@/types/machine';
export { 
  isValidMachineId as isValidMachine, 
  isValidMicrocontrollerUID,
  getDisplayModelName as getModelName,
  getOperatingSince,
  hasLiveDataCapability
} from '@/types/machine';

// Re-export machine number helpers
export {
  MACHINE_MODELS,
  generateMachineId,
  getModelFromName,
  getModelFromMachineId,
  extractMachineNumber,
  checkMachineNumberExists,
  getNextAvailableMachineNumber,
  validateMachineNumber
} from './machineNumberHelpers';
