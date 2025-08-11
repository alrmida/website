
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';
import { useMicrocontrollerUID } from './useMicrocontrollerUID';
import { DATA_CONFIG } from '@/config/dataConfig';

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
      console.log('🔄 Fetching simple machine data for UID:', currentUID, '(10s frequency)');

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
      
      // Apply client-side staleness check using new 90-second threshold
      if (result?.lastUpdate) {
        const dataAge = new Date().getTime() - new Date(result.lastUpdate).getTime();
        const isStale = dataAge > DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS;
        
        console.log(`🔍 Data staleness check:`, {
          age_seconds: Math.round(dataAge / 1000),
          threshold_seconds: DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000,
          is_stale: isStale
        });
        
        if (isStale) {
          result.status = 'Offline';
          result.isOnline = false;
          console.log(`⚠️ Data marked as stale (>${DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000}s old)`);
        }
      }
      
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
    
    // Set up interval for real-time updates (every 10 seconds)
    if (currentUID) {
      console.log(`🕒 Setting up 10-second polling for UID: ${currentUID}`);
      const interval = setInterval(fetchData, DATA_CONFIG.SIMPLE_DATA_POLL_INTERVAL_MS);
      return () => {
        console.log(`🔕 Clearing 10-second polling for UID: ${currentUID}`);
        clearInterval(interval);
      };
    }
  }, [machine?.id, currentUID, uidLoading]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
