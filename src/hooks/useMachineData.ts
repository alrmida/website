
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient, isValidMachineId } from '@/types/machine';

export const useMachineData = () => {
  const { profile } = useAuth();
  const [machines, setMachines] = useState<MachineWithClient[]>([]);
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
          const validMachines = machinesData.filter(machine => isValidMachineId(machine.machine_id));
          console.log('Valid machines after filtering:', validMachines);
          setMachines(validMachines);
        }
      } else {
        // Commercial and admin users see all machines
        const { data: machinesData, error: machinesError } = await supabase
          .from('machines')
          .select(`
            *,
            client_profile:profiles!client_id (
              username
            )
          `);
        
        console.log('All machines data:', machinesData, 'Error:', machinesError);
        
        if (machinesData) {
          const validMachines = machinesData.filter(machine => isValidMachineId(machine.machine_id));
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

  return {
    machines,
    loading,
    profile
  };
};
