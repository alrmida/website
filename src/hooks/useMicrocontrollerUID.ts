
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MicrocontrollerAssignment } from '@/types/machine';

export const useMicrocontrollerUID = (machineId?: number) => {
  const [currentUID, setCurrentUID] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<MicrocontrollerAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUID = async () => {
    if (!machineId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_current_microcontroller_uid', {
        p_machine_id: machineId
      });

      if (error) {
        console.error('Error fetching current UID:', error);
        setError(error.message);
        return;
      }

      setCurrentUID(data);
    } catch (err) {
      console.error('Error fetching current UID:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!machineId) return;

    try {
      const { data, error } = await supabase
        .from('machine_microcontrollers')
        .select('*')
        .eq('machine_id', machineId)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const assignUID = async (uid: string, notes?: string) => {
    if (!machineId) return;

    try {
      const { error } = await supabase.rpc('assign_microcontroller_uid', {
        p_machine_id: machineId,
        p_microcontroller_uid: uid,
        p_notes: notes
      });

      if (error) {
        console.error('Error assigning UID:', error);
        throw error;
      }

      // Refresh data after assignment
      await fetchCurrentUID();
      await fetchAssignments();
    } catch (err) {
      console.error('Error assigning UID:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (machineId) {
      fetchCurrentUID();
      fetchAssignments();
    }
  }, [machineId]);

  return {
    currentUID,
    assignments,
    loading,
    error,
    assignUID,
    refetch: () => {
      fetchCurrentUID();
      fetchAssignments();
    }
  };
};
