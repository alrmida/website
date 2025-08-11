
import { supabase } from '@/integrations/supabase/client';

export interface UIDAssignment {
  machine_id: string;
  machine_name: string;
  assigned_at: string;
}

export const fetchUidAssignment = async (uid: string): Promise<UIDAssignment | null> => {
  if (!uid || uid.trim() === '') return null;

  try {
    console.log('🔍 Checking UID assignment for:', uid.trim());

    // Step 1: Find active assignment for this UID
    const { data: assignment, error: assignmentError } = await supabase
      .from('machine_microcontrollers')
      .select('machine_id, assigned_at')
      .eq('microcontroller_uid', uid.trim())
      .is('unassigned_at', null)
      .single();

    if (assignmentError || !assignment) {
      console.log('🔍 No active assignment found for UID:', uid.trim());
      return null;
    }

    console.log('🔍 Found assignment:', assignment);

    // Step 2: Get machine details
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('machine_id, name')
      .eq('id', assignment.machine_id)
      .single();

    if (machineError || !machine) {
      console.log('❌ Machine not found for ID:', assignment.machine_id);
      return null;
    }

    console.log('✅ Found machine details:', machine);

    return {
      machine_id: machine.machine_id,
      machine_name: machine.name,
      assigned_at: assignment.assigned_at,
    };
  } catch (error) {
    console.error('❌ Error fetching UID assignment:', error);
    return null;
  }
};
