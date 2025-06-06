
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
