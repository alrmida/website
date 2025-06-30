
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
          console.log('Before validation - client machines:', machinesData);
          const validMachines = machinesData.filter(machine => {
            const isValid = isValidMachineId(machine.machine_id);
            console.log(`Machine ${machine.machine_id} is valid: ${isValid}`);
            return isValid;
          });
          console.log('Valid machines after filtering:', validMachines);
          setMachines(validMachines);
        }
      } else {
        // Commercial and admin users see all machines - simplified approach
        console.log('Fetching all machines for admin/commercial user...');
        const { data: allMachines, error: allMachinesError } = await supabase
          .from('machines')
          .select('*');
        
        console.log('All machines data for admin:', allMachines, 'Error:', allMachinesError);
        
        if (allMachines) {
          console.log('Before validation - all machines:', allMachines);
          const validMachines = allMachines.filter(machine => {
            const isValid = isValidMachineId(machine.machine_id);
            console.log(`Machine ${machine.machine_id} is valid: ${isValid}`, 'Testing against regex: /^KU\\d{12}$/');
            return isValid;
          });
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
