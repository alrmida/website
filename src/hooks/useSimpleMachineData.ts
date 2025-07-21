
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';
import { useMicrocontrollerUID } from './useMicrocontrollerUID';

export interface SimpleMachineData {
  uid: string;
  waterLevel: number;
  compressorOn: boolean;
  status: string;
  isOnline: boolean;
  lastUpdate: string | null;
  timestamp: string;
}

export const useSimpleMachineData = (machine: MachineWithClient | null) => {
  const { currentUID, loading: uidLoading } = useMicrocontrollerUID(machine?.id);
  const [data, setData] = useState<SimpleMachineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!machine || !currentUID) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching simple machine data for UID:', currentUID);

      const { data: result, error: functionError } = await supabase.functions.invoke(
        'simple-machine-data',
        {
          body: { uid: currentUID }
        }
      );

      if (functionError) {
        console.error('❌ Function error:', functionError);
        setError(functionError.message);
        return;
      }

      if (result?.error) {
        console.error('❌ Response error:', result.error);
        setError(result.error);
        return;
      }

      console.log('✅ Simple machine data fetched:', result);
      setData(result);

    } catch (err) {
      console.error('❌ Error fetching simple machine data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for UID to be loaded before fetching data
    if (uidLoading) {
      console.log('⏳ Waiting for UID to be loaded...');
      return;
    }

    fetchData();
    
    // Set up interval for real-time updates (every 30 seconds)
    if (currentUID) {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [machine?.id, currentUID, uidLoading]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
