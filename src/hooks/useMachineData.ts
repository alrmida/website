
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
        // First try to get machines with client profiles
        const { data: machinesWithProfiles, error: profilesError } = await supabase
          .from('machines')
          .select(`
            *,
            client_profile:profiles!client_id (
              username
            )
          `);
        
        console.log('Machines with profiles data:', machinesWithProfiles, 'Error:', profilesError);
        
        // If that fails or returns empty, try to get all machines without the join
        if (!machinesWithProfiles || machinesWithProfiles.length === 0) {
          console.log('No machines with profiles found, trying to get all machines...');
          const { data: allMachines, error: allMachinesError } = await supabase
            .from('machines')
            .select('*');
          
          console.log('All machines data:', allMachines, 'Error:', allMachinesError);
          
          if (allMachines) {
            const validMachines = allMachines.filter(machine => isValidMachineId(machine.machine_id));
            console.log('Valid machines after filtering:', validMachines);
            setMachines(validMachines);
          }
        } else {
          const validMachines = machinesWithProfiles.filter(machine => isValidMachineId(machine.machine_id));
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
