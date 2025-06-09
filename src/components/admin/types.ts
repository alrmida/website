
export interface Profile {
  id: string;
  username: string;
  role: 'client' | 'commercial' | 'admin';
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
}

// Re-export machine types from unified location
export type { MachineWithClient as Machine } from '@/types/machine';

export interface Invitation {
  id: string;
  email: string;
  role: 'client' | 'commercial' | 'admin';
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface MachineAccess {
  id: string;
  user_id: string;
  machine_id: number;
  access_level: 'viewer' | 'operator' | 'admin';
  granted_by?: string;
  granted_at: string;
}
