
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

interface StatusFlags {
  full_tank?: boolean;
  producing_water?: boolean;
  defrosting?: boolean;
  compressor_on?: number;
}

function calculateMachineStatus(
  waterLevel: number, 
  dataAge: number, 
  statusFlags?: StatusFlags
): { status: string, isOnline: boolean } {
  // For simple_water_snapshots data, use a more lenient threshold (45 minutes)
  // since this data is captured every 15-30 minutes, not real-time
  if (dataAge > 2700000) { // 45 minutes in milliseconds
    return { status: 'Disconnected', isOnline: false };
  }
  
  // Machine is online if we have recent data
  const isOnline = true;
  
  // Use actual status flags if available
  if (statusFlags) {
    if (statusFlags.defrosting === true) {
      return { status: 'Defrosting', isOnline };
    }
    
    if (statusFlags.full_tank === true) {
      return { status: 'Full Water', isOnline };
    }
    
    if (statusFlags.producing_water === true || statusFlags.compressor_on === 1) {
      return { status: 'Producing', isOnline };
    }
    
    // If we have status flags but none of the above conditions, machine is idle
    return { status: 'Idle', isOnline };
  }
  
  // Fallback to water level inference when no status flags available
  if (waterLevel > 9.9) {
    return { status: 'Full Water', isOnline };
  } else {
    // Without status flags, we can't distinguish between producing and idle
    // so we'll assume idle for safety
    return { status: 'Idle', isOnline };
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
      console.log('🔍 Fetching machine data for:', selectedMachine?.machine_id);
      
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

      console.log('📊 Querying both simple_water_snapshots and raw_machine_data for machine:', selectedMachine.machine_id);
      
      // Query both tables simultaneously
      const [snapshotResult, rawDataResult] = await Promise.all([
        // Get most recent water level data (last 24 hours)
        supabase
          .from('simple_water_snapshots')
          .select('*')
          .eq('machine_id', selectedMachine.machine_id)
          .gte('timestamp_utc', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Get most recent raw machine data with status flags (last 6 hours)
        supabase
          .from('raw_machine_data')
          .select('*')
          .eq('machine_id', selectedMachine.machine_id)
          .gte('timestamp_utc', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (snapshotResult.error) {
        console.error('❌ Error querying simple_water_snapshots:', snapshotResult.error);
        throw new Error(`Water snapshots query failed: ${snapshotResult.error.message}`);
      }

      if (rawDataResult.error) {
        console.warn('⚠️ Error querying raw_machine_data:', rawDataResult.error);
        // Don't throw error, just log warning as we can fallback to snapshot data
      }

      const snapshotData = snapshotResult.data;
      const rawData = rawDataResult.data;

      if (!snapshotData) {
        console.log('⚠️ No recent water level data found in last 24 hours for machine:', selectedMachine.machine_id);
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

      console.log('✅ Found recent water level data:', {
        timestamp: snapshotData.timestamp_utc,
        water_level: snapshotData.water_level_l,
        machine_id: snapshotData.machine_id
      });

      if (rawData) {
        console.log('✅ Found recent raw machine data with status flags:', {
          timestamp: rawData.timestamp_utc,
          full_tank: rawData.full_tank,
          producing_water: rawData.producing_water,
          defrosting: rawData.defrosting,
          compressor_on: rawData.compressor_on
        });
      } else {
        console.log('⚠️ No recent raw machine data found, using water level inference');
      }

      // Calculate data age based on snapshot data (most recent)
      const dataTime = new Date(snapshotData.timestamp_utc);
      const now = new Date();
      const dataAge = now.getTime() - dataTime.getTime();

      // Get water level from snapshot
      const waterLevel = snapshotData.water_level_l || 0;
      
      // Prepare status flags from raw data if available
      const statusFlags: StatusFlags | undefined = rawData ? {
        full_tank: rawData.full_tank,
        producing_water: rawData.producing_water,
        defrosting: rawData.defrosting,
        compressor_on: rawData.compressor_on
      } : undefined;
      
      // Calculate machine status using actual flags or fallback
      const { status, isOnline } = calculateMachineStatus(waterLevel, dataAge, statusFlags);

      // Determine compressor status for display
      const compressorOn = statusFlags?.compressor_on || (waterLevel < 10 ? 1 : 0);

      const processedData = {
        waterLevel: waterLevel,
        status: status,
        lastUpdated: snapshotData.timestamp_utc,
        dataAge: dataAge,
        compressorOn: compressorOn,
        isOnline: isOnline,
        lastConnection: isOnline ? snapshotData.timestamp_utc : data.lastConnection || snapshotData.timestamp_utc,
        dataSource: 'live' as const
      };

      console.log('✅ Final processed machine data:', {
        waterLevel: processedData.waterLevel,
        status: processedData.status,
        isOnline: processedData.isOnline,
        dataAge: Math.round(processedData.dataAge / 1000) + 's',
        hasStatusFlags: !!statusFlags
      });
      
      setData(processedData);
      setError(null);

    } catch (err) {
      console.error('❌ Error fetching machine data:', err);
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
    console.log('🚀 Setting up data fetching for machine:', selectedMachine?.machine_id);
    
    // Initial fetch
    fetchData();

    // Only set up polling for machines with live data capability
    if (canFetchLiveData) {
      console.log('⏰ Setting up 10-second polling for machine data');
      const interval = setInterval(fetchData, 10000);
      return () => {
        console.log('🛑 Cleaning up polling interval');
        clearInterval(interval);
      };
    }
  }, [selectedMachine?.id, selectedMachine?.machine_id, canFetchLiveData]);

  return { data, isLoading, error, refetch: fetchData };
};
