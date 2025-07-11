
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient, hasLiveDataCapability } from '@/types/machine';

interface LiveMachineData {
  waterLevel: number;
  status: string;
  lastUpdated: string;
  dataAge: number;
  compressorOn: number;
  isOnline: boolean;
  lastConnection?: string;
  dataSource: 'live' | 'fallback' | 'none';
}

function calculateMachineStatus(waterLevel: number, compressorOn: number, dataAge: number): { status: string, isOnline: boolean } {
  // If no data for 60+ seconds, machine is disconnected/offline
  if (dataAge > 60000) { // 60 seconds in milliseconds
    return { status: 'Disconnected', isOnline: false };
  }
  
  // Machine is online if we have recent data
  const isOnline = true;
  
  // Calculate status based on water level and compressor state
  if (waterLevel > 9.9) {
    // Tank is full or nearly full
    if (compressorOn === 1) {
      return { status: 'Full Water', isOnline }; // Still producing but tank is full
    } else {
      return { status: 'Full Water', isOnline }; // Tank full, compressor off
    }
  } else {
    // Tank is not full
    if (compressorOn === 1) {
      return { status: 'Producing', isOnline }; // Actively producing water
    } else {
      return { status: 'Idle', isOnline }; // Not producing, waiting
    }
  }
}

export const useLiveMachineData = (selectedMachine?: MachineWithClient) => {
  const [data, setData] = useState<LiveMachineData>({
    waterLevel: 0,
    status: 'Loading...',
    lastUpdated: new Date().toISOString(),
    dataAge: 0,
    compressorOn: 0,
    isOnline: false,
    lastConnection: undefined,
    dataSource: 'none'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if this machine has live data capability
  const canFetchLiveData = selectedMachine && hasLiveDataCapability(selectedMachine);

  const fetchData = async () => {
    try {
      console.log('🔍 [Phase 1] Fetching machine data directly from Supabase for:', selectedMachine?.machine_id);
      
      // If machine doesn't have live data capability, return offline status
      if (!canFetchLiveData) {
        console.log('⚠️ Machine does not have live data capability');
        setData({
          waterLevel: 0,
          status: 'Offline',
          lastUpdated: new Date().toISOString(),
          dataAge: 0,
          compressorOn: 0,
          isOnline: false,
          lastConnection: undefined,
          dataSource: 'none'
        });
        setError(null);
        setIsLoading(false);
        return;
      }

      console.log('📊 [Phase 1] Querying raw_machine_data table for machine:', selectedMachine.machine_id);
      
      // Query Supabase directly for the most recent machine data
      const { data: rawData, error: queryError } = await supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', selectedMachine.machine_id)
        .gte('timestamp_utc', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) {
        console.error('❌ [Phase 1] Supabase query error:', queryError);
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      if (!rawData) {
        console.log('⚠️ [Phase 1] No recent data found in raw_machine_data for machine:', selectedMachine.machine_id);
        setData({
          waterLevel: 0,
          status: 'Disconnected',
          lastUpdated: new Date().toISOString(),
          dataAge: 0,
          compressorOn: 0,
          isOnline: false,
          lastConnection: data.lastConnection,
          dataSource: 'live'
        });
        setError(null);
        setIsLoading(false);
        return;
      }

      console.log('✅ [Phase 1] Found machine data from Supabase:', {
        timestamp: rawData.timestamp_utc,
        water_level: rawData.water_level_l,
        compressor: rawData.compressor_on,
        machine_id: rawData.machine_id
      });

      // Calculate data age
      const dataTime = new Date(rawData.timestamp_utc);
      const now = new Date();
      const dataAge = now.getTime() - dataTime.getTime();

      // Get machine data from all 18 sensor fields
      const waterLevel = rawData.water_level_l || 0;
      const compressorOn = rawData.compressor_on || 0;
      
      console.log('📊 [Phase 1] Processing sensor data:', {
        waterLevel,
        compressorOn,
        dataAge: Math.round(dataAge / 1000) + 's',
        ambient_temp: rawData.ambient_temp_c,
        current: rawData.current_a
      });
      
      // Calculate machine status and online state
      const { status, isOnline } = calculateMachineStatus(waterLevel, compressorOn, dataAge);

      const processedData = {
        waterLevel: waterLevel,
        status: status,
        lastUpdated: rawData.timestamp_utc,
        dataAge: dataAge,
        compressorOn: compressorOn,
        isOnline: isOnline,
        lastConnection: isOnline ? rawData.timestamp_utc : data.lastConnection || rawData.timestamp_utc,
        dataSource: 'live' as const
      };

      console.log('✅ [Phase 1] Processed machine data from direct Supabase query:', {
        waterLevel: processedData.waterLevel,
        status: processedData.status,
        isOnline: processedData.isOnline,
        dataAge: Math.round(processedData.dataAge / 1000) + 's'
      });
      
      setData(processedData);
      setError(null);

    } catch (err) {
      console.error('❌ [Phase 1] Error fetching machine data from Supabase:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
      setError(errorMessage);
      
      // Set disconnected state when there's an error - show 0% water level
      setData({
        waterLevel: 0,
        status: 'Disconnected',
        lastUpdated: new Date().toISOString(),
        dataAge: 0,
        compressorOn: 0,
        isOnline: false,
        lastConnection: data.lastConnection,
        dataSource: 'fallback'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 [Phase 1] Setting up direct Supabase data fetching for machine:', selectedMachine?.machine_id);
    
    // Initial fetch
    fetchData();

    // Only set up polling for machines with live data capability
    if (canFetchLiveData) {
      console.log('⏰ [Phase 1] Setting up 10-second polling for direct Supabase queries');
      const interval = setInterval(fetchData, 10000);
      return () => {
        console.log('🛑 [Phase 1] Cleaning up polling interval');
        clearInterval(interval);
      };
    }
  }, [selectedMachine?.id, selectedMachine?.machine_id, canFetchLiveData]);

  return { data, isLoading, error, refetch: fetchData };
};
