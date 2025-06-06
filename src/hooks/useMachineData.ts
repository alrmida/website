
import { useState, useEffect, useRef } from 'react';
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
  const setupInProgress = useRef(false);

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

  const setupDemoAccounts = async () => {
    if (setupInProgress.current) {
      console.log('Setup already in progress, skipping...');
      return;
    }

    setupInProgress.current = true;
    console.log('Setting up demo accounts...');
    
    try {
      const response = await supabase.functions.invoke('setup-demo-accounts');
      console.log('Demo accounts setup result:', response);
      
      if (response.error) {
        console.error('Setup function error:', response.error);
      } else {
        console.log('Setup completed successfully');
        // Wait a bit for the setup to complete fully
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Refetch data after successful setup
        await fetchData();
      }
    } catch (error) {
      console.error('Error setting up demo accounts:', error);
    } finally {
      setupInProgress.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  // Only trigger demo setup once when needed
  useEffect(() => {
    // Only run setup if:
    // 1. We have a profile
    // 2. We have no machines
    // 3. We're not currently loading
    // 4. Setup is not already in progress
    if (profile && machines.length === 0 && !loading && !setupInProgress.current) {
      console.log('Triggering demo accounts setup...');
      setupDemoAccounts();
    }
  }, [profile, machines.length, loading]);

  return {
    machines,
    clients,
    loading: loading || setupInProgress.current,
    profile
  };
};
