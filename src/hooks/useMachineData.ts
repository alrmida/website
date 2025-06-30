
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient, isValidMachineId } from '@/types/machine';

export const useMachineData = () => {
  const { profile } = useAuth();
  const [machines, setMachines] = useState<MachineWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!profile) {
      console.log('No profile available, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('Fetching data for profile:', profile);
    console.log('Profile role:', profile.role);
    setLoading(true);

    try {
      // For all users, fetch machines with client profile information
      console.log('Fetching machines with client profiles...');
      const { data: machinesData, error } = await supabase
        .from('machines')
        .select(`
          *,
          client_profile:profiles!client_id (
            username
          )
        `);
      
      console.log('Raw machines data:', machinesData);
      console.log('Query error:', error);

      if (error) {
        console.error('Database error:', error);
        // Fallback: try to fetch without the join
        console.log('Trying fallback query without client profiles...');
        const { data: simpleMachines, error: simpleError } = await supabase
          .from('machines')
          .select('*');
        
        console.log('Simple machines data:', simpleMachines);
        console.log('Simple query error:', simpleError);
        
        if (simpleMachines && !simpleError) {
          const validMachines = simpleMachines.filter(machine => {
            const isValid = isValidMachineId(machine.machine_id);
            console.log(`Machine ${machine.machine_id} validation: ${isValid}`);
            return isValid;
          });
          
          // Filter based on role
          if (profile.role === 'client') {
            const clientMachines = validMachines.filter(machine => machine.client_id === profile.id);
            console.log('Filtered client machines:', clientMachines);
            setMachines(clientMachines);
          } else {
            console.log('Admin/Commercial - showing all machines:', validMachines);
            setMachines(validMachines);
          }
        }
      } else if (machinesData) {
        console.log('Processing machines data with profiles...');
        const validMachines = machinesData.filter(machine => {
          const isValid = isValidMachineId(machine.machine_id);
          console.log(`Machine ${machine.machine_id} validation: ${isValid}`);
          return isValid;
        });

        // Apply role-based filtering
        if (profile.role === 'client') {
          const clientMachines = validMachines.filter(machine => machine.client_id === profile.id);
          console.log('Client machines after filtering:', clientMachines);
          setMachines(clientMachines);
        } else {
          // Admin and commercial users see all machines
          console.log('Admin/Commercial - showing all valid machines:', validMachines);
          setMachines(validMachines);
        }
      }
    } catch (error) {
      console.error('Error fetching machine data:', error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  return {
    machines,
    loading,
    profile,
    refetch: fetchData
  };
};
