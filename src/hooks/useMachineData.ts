
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient, isValidMachineId } from '@/types/machine';

export const useMachineData = () => {
  const { profile } = useAuth();
  const [machines, setMachines] = useState<MachineWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!profile) {
      console.log('No profile available, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('Fetching data for profile:', profile);
    console.log('Profile role:', profile.role);
    setLoading(true);
    setError(null);

    try {
      // For admins, let's first check if there are ANY machines at all
      if (profile.role === 'admin') {
        console.log('🔍 Admin checking total machine count...');
        const { count, error: countError } = await supabase
          .from('machines')
          .select('*', { count: 'exact', head: true });
        
        console.log('Total machines in database:', count);
        if (countError) {
          console.error('Error counting machines:', countError);
        }
      }

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
        setError(`Database error: ${error.message}`);
        
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
          
          // Apply role-based filtering - ADMINS AND COMMERCIAL SEE ALL MACHINES
          if (profile.role === 'admin' || profile.role === 'commercial') {
            console.log('🔑 ADMIN/COMMERCIAL ACCESS: Showing ALL machines (including unassigned):', validMachines);
            setMachines(validMachines);
          } else if (profile.role === 'client') {
            const clientMachines = validMachines.filter(machine => machine.client_id === profile.id);
            console.log('Client machines after filtering:', clientMachines);
            setMachines(clientMachines);
          }
        }
      } else if (machinesData) {
        console.log('Processing machines data with profiles...');
        const validMachines = machinesData.filter(machine => {
          const isValid = isValidMachineId(machine.machine_id);
          console.log(`Machine ${machine.machine_id} validation: ${isValid}`);
          return isValid;
        });

        // Apply role-based filtering - ADMINS AND COMMERCIAL SEE ALL MACHINES
        if (profile.role === 'admin' || profile.role === 'commercial') {
          console.log('🔑 ADMIN/COMMERCIAL ACCESS: Showing ALL machines (including unassigned):', validMachines);
          setMachines(validMachines);
        } else if (profile.role === 'client') {
          const clientMachines = validMachines.filter(machine => machine.client_id === profile.id);
          console.log('Client machines after filtering:', clientMachines);
          setMachines(clientMachines);
        }
      }
    } catch (error) {
      console.error('Error fetching machine data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }

    setLoading(false);
  };

  // Add the missing useEffect to automatically fetch data when profile changes
  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  return {
    machines,
    loading,
    profile,
    error,
    refetch: fetchData
  };
};
