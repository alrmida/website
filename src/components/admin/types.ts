
export interface Profile {
  id: string;
  username: string;
  role: 'client' | 'commercial' | 'admin';
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
}

export interface Machine {
  id: number;
  machine_id: string;
  name: string;
  location: string;
  client_id?: string;
  manager_id?: string;
  owner_entity?: string;
  assigned_entity?: string;
  machine_model?: string;
  serial_number?: string;
  purchase_date?: string;
  assignment_date?: string;
  status?: string;
  client_profile?: {
    username: string;
  };
}

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
