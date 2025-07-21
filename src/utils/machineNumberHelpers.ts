
import { supabase } from '@/integrations/supabase/client';

export interface MachineModel {
  name: string;
  code: string;
  prefix: string;
}

export const MACHINE_MODELS: MachineModel[] = [
  { name: 'Amphore', code: '001', prefix: 'KU001619' },
  { name: 'BoKs', code: '002', prefix: 'KU002619' },
  { name: 'Water Dispenser', code: '003', prefix: 'KU003619' },
];

export const generateMachineId = (modelName: string, machineNumber: number): string => {
  const model = MACHINE_MODELS.find(m => m.name === modelName);
  if (!model) {
    throw new Error('Invalid model name');
  }
  
  const paddedNumber = machineNumber.toString().padStart(6, '0');
  return `${model.prefix}${paddedNumber}`;
};

export const getModelFromName = (modelName: string): MachineModel | undefined => {
  return MACHINE_MODELS.find(m => m.name === modelName);
};

export const getModelFromMachineId = (machineId: string): MachineModel | undefined => {
  return MACHINE_MODELS.find(m => machineId.startsWith(m.prefix));
};

export const extractMachineNumber = (machineId: string): number => {
  const model = getModelFromMachineId(machineId);
  if (!model) {
    throw new Error('Invalid machine ID format');
  }
  
  const numberPart = machineId.substring(model.prefix.length);
  return parseInt(numberPart, 10);
};

export const checkMachineNumberExists = async (modelName: string, machineNumber: number): Promise<boolean> => {
  const machineId = generateMachineId(modelName, machineNumber);
  
  const { data, error } = await supabase
    .from('machines')
    .select('id')
    .eq('machine_id', machineId)
    .single();
  
  return !error && data !== null;
};

export const getNextAvailableMachineNumber = async (modelName: string): Promise<number> => {
  const model = getModelFromName(modelName);
  if (!model) {
    throw new Error('Invalid model name');
  }
  
  const { data, error } = await supabase
    .from('machines')
    .select('machine_id')
    .like('machine_id', `${model.prefix}%`)
    .order('machine_id', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('Error fetching last machine number:', error);
    return 1;
  }
  
  if (!data || data.length === 0) {
    return 1;
  }
  
  const lastMachineId = data[0].machine_id;
  const lastNumber = extractMachineNumber(lastMachineId);
  return lastNumber + 1;
};

export const validateMachineNumber = (machineNumber: number): { isValid: boolean; error?: string } => {
  if (!Number.isInteger(machineNumber) || machineNumber <= 0) {
    return { isValid: false, error: 'Machine number must be a positive integer' };
  }
  
  if (machineNumber > 999999) {
    return { isValid: false, error: 'Machine number must be 6 digits or less' };
  }
  
  return { isValid: true };
};
