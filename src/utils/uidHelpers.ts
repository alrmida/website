
import { supabase } from '@/integrations/supabase/client';

export interface UIDAssignment {
  machine_id: string;
  machine_name: string;
  assigned_at: string;
}

export const fetchUidAssignment = async (uid: string): Promise<UIDAssignment | null> => {
  if (!uid || uid.trim() === '') return null;

  try {
    const { data, error } = await supabase
      .from('machine_microcontrollers')
      .select(`
        assigned_at,
        machines!inner (
          machine_id,
          name
        )
      `)
      .eq('microcontroller_uid', uid.trim())
      .is('unassigned_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      machine_id: data.machines.machine_id,
      machine_name: data.machines.name,
      assigned_at: data.assigned_at,
    };
  } catch (error) {
    console.error('Error fetching UID assignment:', error);
    return null;
  }
};
