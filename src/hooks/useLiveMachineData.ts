
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';
import { useMicrocontrollerUID } from './useMicrocontrollerUID';
import { DATA_CONFIG } from '@/config/dataConfig';

export type MachineStatus = 'Producing' | 'Idle' | 'Full Water' | 'Disconnected' | 'Defrosting';

interface UseLiveMachineDataProps {
  selectedMachine: MachineWithClient | null;
}

interface LiveMachineData {
  status: MachineStatus;
  waterLevel: number;
  lastUpdated: string | null;
  isOnline: boolean;
  dataSource: 'influx' | 'fallback';
  dataAge: number;
  lastConnection?: string;
  compressorOn: boolean;
}

export const useLiveMachineData = (selectedMachine: MachineWithClient | null) => {
  const { currentUID, loading: uidLoading } = useMicrocontrollerUID(selectedMachine?.id);
  const [data, setData] = useState<LiveMachineData>({
    status: 'Disconnected',
    waterLevel: 0,
    lastUpdated: null,
    isOnline: false,
    dataSource: 'fallback',
    dataAge: 0,
    compressorOn: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!selectedMachine || uidLoading) {
      setIsLoading(false);
      return;
    }

    const fetchInfluxData = async () => {
      if (!currentUID) {
        console.log(`⚠️ [${selectedMachine.machine_id}] No UID available, skipping Influx fetch`);
        setData({
          status: 'Disconnected',
          waterLevel: 0,
          lastUpdated: null,
          isOnline: false,
          dataSource: 'fallback',
          dataAge: Infinity,
          compressorOn: false
        });
        setIsLoading(false);
        return;
      }

      try {
        // Get current user info for role-based debugging
        const { data: currentUser } = await supabase.auth.getUser();
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('role, username')
          .eq('id', currentUser.user?.id)
          .single();

        console.log(`🔍 [${selectedMachine.machine_id}] Fetching Influx data via edge function (10s frequency)`);
        console.log(`👤 User: ${currentProfile?.username} (${currentProfile?.role})`);
        console.log(`🔗 Using UID: ${currentUID}`);
        
        const { data: influxData, error: influxError } = await supabase.functions.invoke(
          'simple-machine-data',
          {
            body: { uid: currentUID }
          }
        );

        if (influxError) {
          console.error(`❌ [${selectedMachine.machine_id}] Influx function error:`, influxError);
          throw new Error(`Edge function error: ${influxError.message}`);
        }

        if (influxData?.error) {
          console.error(`❌ [${selectedMachine.machine_id}] Influx response error:`, influxData.error);
          throw new Error(influxData.error);
        }

        console.log(`✅ [${selectedMachine.machine_id}] Influx data received:`, {
          uid: influxData.uid,
          waterLevel: influxData.waterLevel,
          status: influxData.status,
          isOnline: influxData.isOnline,
          lastUpdate: influxData.lastUpdate,
          compressorOn: influxData.compressorOn
        });

        // Calculate data age for client-side staleness check
        const dataAge = influxData.lastUpdate 
          ? new Date().getTime() - new Date(influxData.lastUpdate).getTime()
          : Infinity;

        // Apply client-side staleness check (90 seconds threshold)
        const isDataFresh = dataAge <= DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS;
        const finalStatus = isDataFresh ? influxData.status : 'Disconnected';
        const finalIsOnline = isDataFresh ? influxData.isOnline : false;

        console.log(`🔍 [${selectedMachine.machine_id}] Staleness check:`, {
          age_seconds: Math.round(dataAge / 1000),
          threshold_seconds: DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000,
          is_fresh: isDataFresh,
          edge_function_status: influxData.status,
          final_status: finalStatus
        });

        const processedData: LiveMachineData = {
          status: finalStatus as MachineStatus,
          waterLevel: influxData.waterLevel || 0,
          lastUpdated: influxData.lastUpdate,
          isOnline: finalIsOnline,
          dataSource: 'influx',
          dataAge,
          lastConnection: influxData.lastUpdate,
          compressorOn: Boolean(influxData.compressorOn)
        };

        setData(processedData);
        setError(null);

      } catch (err: any) {
        console.error(`❌ [${selectedMachine.machine_id}] Failed to fetch Influx data:`, err);
        setError(err.message || 'Failed to fetch machine data from Influx');
        setData({
          status: 'Disconnected',
          waterLevel: 0,
          lastUpdated: null,
          isOnline: false,
          dataSource: 'fallback',
          dataAge: Infinity,
          compressorOn: false
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Clean up any existing polling
    if (pollIntervalRef.current) {
      console.log(`🔕 [${selectedMachine.machine_id}] Cleaning up existing poll interval`);
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Initial fetch
    fetchInfluxData();

    // Set up 10-second polling for Influx data
    console.log(`🕒 [${selectedMachine.machine_id}] Setting up 10-second Influx polling`);
    pollIntervalRef.current = setInterval(() => {
      console.log(`🔄 [${selectedMachine.machine_id}] Polling Influx data (10s interval)`);
      fetchInfluxData();
    }, DATA_CONFIG.LIVE_DATA_POLL_INTERVAL_MS);

    return () => {
      console.log(`🔕 [${selectedMachine.machine_id}] Cleaning up Influx polling`);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [selectedMachine?.machine_id, currentUID, uidLoading]);

  return { data, isLoading, error };
};

export default useLiveMachineData;
