
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Machine, isValidMachine } from '@/utils/machineHelpers';

interface Client {
  id: string;
  username: string;
}

export const useMachineData = () => {
  const { profile } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!profile) return;

    console.log('Fetching data for profile:', profile);
    setLoading(true);

    try {
      if (profile.role === 'client') {
        // Clients see only their machines
        const { data: machinesData, error } = await supabase
          .from('machines')
          .select('*')
          .eq('client_id', profile.id);
        
        console.log('Client machines data:', machinesData, 'Error:', error);
        
        if (machinesData) {
          // Filter out machines with empty machine_id using the helper function
          const validMachines = machinesData.filter(isValidMachine);
          console.log('Valid machines after filtering:', validMachines);
          setMachines(validMachines);
        }
      } else {
        // Commercial and admin users see all machines and clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('role', 'client');
        
        console.log('Clients data:', clientsData, 'Error:', clientsError);
        
        // Fixed query for machines with proper relationship naming
        const { data: machinesData, error: machinesError } = await supabase
          .from('machines')
          .select(`
            *,
            client_profile:profiles!client_id (
              username
            )
          `);
        
        console.log('All machines data:', machinesData, 'Error:', machinesError);
        
        if (clientsData) setClients(clientsData);
        if (machinesData) {
          // Filter out machines with empty machine_id using the helper function
          const validMachines = machinesData.filter(isValidMachine);
          console.log('Valid machines after filtering:', validMachines);
          setMachines(validMachines);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  // Set up demo accounts when hook is first used
  useEffect(() => {
    const setupDemoAccounts = async () => {
      try {
        console.log('Setting up demo accounts...');
        const response = await supabase.functions.invoke('setup-demo-accounts');
        console.log('Demo accounts setup result:', response);
      } catch (error) {
        console.error('Error setting up demo accounts:', error);
      }
    };
    
    // Only run once when the hook first mounts
    setupDemoAccounts();
  }, []);

  return {
    machines,
    clients,
    loading,
    profile
  };
};
