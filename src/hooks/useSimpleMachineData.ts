
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';

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
  const [data, setData] = useState<SimpleMachineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!machine?.microcontroller_uid) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching simple machine data for UID:', machine.microcontroller_uid);

      const { data: result, error: functionError } = await supabase.functions.invoke(
        'simple-machine-data',
        {
          body: { uid: machine.microcontroller_uid }
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
    fetchData();
    
    // Set up interval for real-time updates (every 30 seconds)
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [machine?.microcontroller_uid]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
