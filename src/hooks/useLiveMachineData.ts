
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';
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
  dataSource: 'live' | 'fallback';
  dataAge: number;
  lastConnection?: string;
  compressorOn: boolean;
}

export const useLiveMachineData = (selectedMachine: MachineWithClient | null) => {
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

  useEffect(() => {
    if (!selectedMachine) {
      setIsLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get current user info for role-based debugging
        const { data: currentUser } = await supabase.auth.getUser();
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('role, username')
          .eq('id', currentUser.user?.id)
          .single();

        console.log(`🔍 [${selectedMachine.machine_id}] Fetching live data (10s frequency)`);
        console.log(`👤 User: ${currentProfile?.username} (${currentProfile?.role})`);
        
        // Try to get the most recent raw machine data
        const { data: rawData, error: rawError } = await supabase
          .from('raw_machine_data')
          .select('*')
          .eq('machine_id', selectedMachine.machine_id)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rawError) {
          console.error(`❌ [${selectedMachine.machine_id}] Raw data query error:`, rawError);
          throw new Error(`Database error: ${rawError.message}`);
        }

        if (rawData) {
          const dataAge = new Date().getTime() - new Date(rawData.timestamp_utc).getTime();
          const isDataFresh = dataAge <= DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS;
          
          console.log(`✅ [${selectedMachine.machine_id}] Found raw data:`, {
            timestamp: rawData.timestamp_utc,
            age_seconds: Math.round(dataAge / 1000),
            threshold_seconds: DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000,
            is_fresh: isDataFresh,
            water_level: rawData.water_level_l,
            producing_water: rawData.producing_water,
            full_tank: rawData.full_tank
          });
          
          const processedData = processRawData(rawData);
          setData(processedData);
        } else {
          console.log(`⚠️ [${selectedMachine.machine_id}] No raw data found`);
          setData({
            status: 'Disconnected',
            waterLevel: 0,
            lastUpdated: null,
            isOnline: false,
            dataSource: 'fallback',
            dataAge: Infinity,
            compressorOn: false
          });
        }
      } catch (err: any) {
        console.error(`❌ [${selectedMachine.machine_id}] Failed to fetch data:`, err);
        setError(err.message || 'Failed to fetch machine data');
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

    fetchInitialData();

    // Set up real-time subscription for new data
    const channelName = `raw_machine_data:${selectedMachine.machine_id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'raw_machine_data',
        filter: `machine_id=eq.${selectedMachine.machine_id}`
      }, (payload) => {
        console.log(`🔄 [${selectedMachine.machine_id}] Real-time update:`, {
          timestamp: payload.new.timestamp_utc,
          water_level: payload.new.water_level_l
        });
        if (payload.new) {
          const processedData = processRawData(payload.new);
          setData(processedData);
        }
      })
      .subscribe((status) => {
        console.log(`📡 [${selectedMachine.machine_id}] Subscription status:`, status);
      });

    // Set up 10-second polling as fallback to real-time
    const pollInterval = setInterval(() => {
      console.log(`🔄 [${selectedMachine.machine_id}] Polling for updates (10s interval)`);
      fetchInitialData();
    }, DATA_CONFIG.LIVE_DATA_POLL_INTERVAL_MS);

    return () => {
      console.log(`🔕 [${selectedMachine.machine_id}] Cleaning up subscriptions and polling`);
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [selectedMachine?.machine_id]);

  const processRawData = (rawData: any): LiveMachineData => {
    const dataTimestamp = new Date(rawData.timestamp_utc);
    const now = new Date();
    const dataAge = now.getTime() - dataTimestamp.getTime();
    
    // Check if data is too old (90 seconds threshold)
    const isDisconnected = dataAge > DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS;
    
    console.log(`🔍 [${rawData.machine_id}] Processing data:`, {
      timestamp: rawData.timestamp_utc,
      age_seconds: Math.round(dataAge / 1000),
      threshold_seconds: DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000,
      is_disconnected: isDisconnected,
      water_level: rawData.water_level_l,
      flags: {
        producing_water: rawData.producing_water,
        full_tank: rawData.full_tank,
        defrosting: rawData.defrosting
      }
    });
    
    if (isDisconnected) {
      console.log(`⚠️ [${rawData.machine_id}] Data is stale (>${DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000}s) - marking as disconnected`);
      return {
        status: 'Disconnected',
        waterLevel: rawData.water_level_l || 0,
        lastUpdated: rawData.timestamp_utc,
        isOnline: false,
        dataSource: 'live',
        dataAge,
        lastConnection: rawData.timestamp_utc,
        compressorOn: Boolean(rawData.compressor_on)
      };
    }

    // Calculate status based on available flags
    const status = calculateStatus(rawData);
    
    console.log(`✅ [${rawData.machine_id}] Status calculated:`, {
      status,
      isOnline: true,
      age_seconds: Math.round(dataAge / 1000)
    });
    
    return {
      status,
      waterLevel: rawData.water_level_l || 0,
      lastUpdated: rawData.timestamp_utc,
      isOnline: true,
      dataSource: 'live',
      dataAge,
      compressorOn: Boolean(rawData.compressor_on)
    };
  };

  const calculateStatus = (rawData: any): MachineStatus => {
    console.log(`🎯 [${rawData.machine_id}] Calculating status from flags:`, {
      defrosting: rawData.defrosting,
      full_tank: rawData.full_tank,
      producing_water: rawData.producing_water,
      water_level: rawData.water_level_l
    });

    // Status priority logic
    if (rawData.defrosting === true) {
      console.log(`✅ [${rawData.machine_id}] Status: Defrosting`);
      return 'Defrosting';
    }
    
    if (rawData.full_tank === true) {
      console.log(`✅ [${rawData.machine_id}] Status: Full Water`);
      return 'Full Water';
    }
    
    if (rawData.producing_water === true) {
      console.log(`✅ [${rawData.machine_id}] Status: Producing`);
      return 'Producing';
    }
    
    // Fallback: check water level for full tank
    const waterLevel = rawData.water_level_l || 0;
    if (waterLevel >= 9.5) { // Nearly full
      console.log(`✅ [${rawData.machine_id}] Status: Full Water (based on level)`);
      return 'Full Water';
    }
    
    // Default to Idle if we have recent data but no clear producing flags
    console.log(`✅ [${rawData.machine_id}] Status: Idle (default)`);
    return 'Idle';
  };

  return { data, isLoading, error };
};

export default useLiveMachineData;
