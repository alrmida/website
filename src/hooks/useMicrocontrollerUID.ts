import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MicrocontrollerAssignment } from '@/types/machine';

export const useMicrocontrollerUID = (machineId?: number) => {
  const [currentUID, setCurrentUID] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<MicrocontrollerAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribingRef = useRef<boolean>(false);

  const fetchCurrentUID = async () => {
    if (!machineId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching current UID for machine:', machineId);

      const { data, error } = await supabase.rpc('get_current_microcontroller_uid', {
        p_machine_id: machineId
      });

      if (error) {
        console.error('❌ Error fetching current UID:', error);
        setError(error.message);
        return;
      }

      console.log('✅ Current UID fetched:', data);
      setCurrentUID(data);
    } catch (err) {
      console.error('❌ Error fetching current UID:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!machineId) return;

    try {
      console.log('📋 Fetching assignments for machine:', machineId);

      const { data, error } = await supabase
        .from('machine_microcontrollers')
        .select('*')
        .eq('machine_id', machineId)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching assignments:', error);
        return;
      }

      console.log('📋 Assignments fetched:', data?.length || 0);
      setAssignments(data || []);
    } catch (err) {
      console.error('❌ Error fetching assignments:', err);
    }
  };

  const assignUID = async (uid: string, notes?: string) => {
    if (!machineId) return;

    try {
      console.log('🔗 Assigning UID:', uid, 'to machine:', machineId);

      const { error } = await supabase.rpc('assign_microcontroller_uid', {
        p_machine_id: machineId,
        p_microcontroller_uid: uid,
        p_notes: notes
      });

      if (error) {
        console.error('❌ Error assigning UID:', error);
        throw error;
      }

      console.log('✅ UID assigned successfully');

      // Refresh data after assignment
      await fetchCurrentUID();
      await fetchAssignments();
    } catch (err) {
      console.error('❌ Error assigning UID:', err);
      throw err;
    }
  };

  // Set up real-time subscription for microcontroller assignments
  useEffect(() => {
    if (!machineId) {
      // Clean up any existing channel when machineId is not available
      if (channelRef.current) {
        console.log('🔕 Cleaning up real-time subscription (no machineId)');
        channelRef.current.unsubscribe();
        channelRef.current = null;
        isSubscribingRef.current = false;
      }
      return;
    }

    // Prevent multiple simultaneous subscriptions
    if (isSubscribingRef.current) {
      console.log('🔄 Subscription already in progress, skipping...');
      return;
    }

    // Clean up existing channel before creating a new one
    if (channelRef.current) {
      console.log('🔕 Cleaning up existing real-time subscription');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Set subscription flag
    isSubscribingRef.current = true;

    console.log('🔔 Setting up real-time subscription for machine:', machineId);

    // Create a unique channel name for this machine
    const channelName = `microcontroller-assignments-${machineId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'machine_microcontrollers',
          filter: `machine_id=eq.${machineId}`,
        },
        (payload) => {
          console.log('🔔 Real-time update received:', payload);
          fetchCurrentUID();
          fetchAssignments();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribingRef.current = false;
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('🔕 Cleaning up real-time subscription');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, [machineId]);

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
