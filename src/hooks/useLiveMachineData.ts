
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';
import { useMicrocontrollerUID } from './useMicrocontrollerUID';

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
  // Check for offline status first - changed to 15 minutes threshold (more lenient)
  if (dataAge > 900000) { // 15 minutes in milliseconds
    console.log('🔴 Machine marked as disconnected - data age:', Math.round(dataAge / 60000), 'minutes');
    return { status: 'Disconnected', isOnline: false };
  }
  
  // Machine is online if we have recent data
  const isOnline = true;
  console.log('🟢 Machine is online - data age:', Math.round(dataAge / 60000), 'minutes');
  
  // Use status flags with improved logic and fallbacks
  if (statusFlags) {
    console.log('📊 Status flags:', statusFlags);
    
    // Priority 1: Defrosting (can override other states)
    if (statusFlags.defrosting) {
      console.log('❄️ Status: Defrosting');
      return { status: 'Defrosting', isOnline };
    }
    
    // Priority 2: Full Water (check this before producing to avoid conflicts)
    if (statusFlags.full_tank === true) {
      console.log('💧 Status: Full Water');
      return { status: 'Full Water', isOnline };
    }
    
    // Priority 3: Producing (compressor is 1 OR producing water is true)
    if (statusFlags.compressor_on === 1 || statusFlags.producing_water === true) {
      console.log('⚡ Status: Producing (compressor:', statusFlags.compressor_on, 'producing_water:', statusFlags.producing_water, ')');
      return { status: 'Producing', isOnline };
    }
    
    // Priority 4: Idle (machine is online but not producing)
    console.log('💤 Status: Idle');
    return { status: 'Idle', isOnline };
  }
  
  // Fallback logic when no status flags are available
  console.log('🔄 No status flags available, using fallback logic');
  // If water level is very low, likely producing
  if (waterLevel < 5) {
    console.log('🔄 Fallback: Producing (low water level)');
    return { status: 'Producing', isOnline };
  }
  // If water level is very high, likely full or idle
  if (waterLevel > 25) {
    console.log('🔄 Fallback: Full Water (high water level)');
    return { status: 'Full Water', isOnline };
  }
  
  // Default to Idle since machine is online
  console.log('🔄 Fallback: Idle (default)');
  return { status: 'Idle', isOnline };
}

// Fetch data directly from edge function for live machines
async function fetchLiveDataFromEdgeFunction(machineUID: string): Promise<any> {
  try {
    console.log('🌐 Calling get-machine-data edge function for UID:', machineUID);
    
    const { data, error } = await supabase.functions.invoke('get-machine-data', {
      body: { uid: machineUID }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data || data.status === 'error') {
      console.error('❌ Edge function returned error:', data);
      throw new Error(data?.message || 'Edge function returned error');
    }

    if (data.status === 'no_data') {
      console.log('⚠️ Edge function reports no data for UID:', machineUID);
      return null;
    }

    console.log('✅ Edge function returned data:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error calling edge function:', error);
    throw error;
  }
}

export const useLiveMachineData = (selectedMachine?: MachineWithClient) => {
  const { currentUID, loading: uidLoading } = useMicrocontrollerUID(selectedMachine?.id);
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
  const canFetchLiveData = selectedMachine && currentUID;

  const fetchData = async () => {
    try {
      console.log('🔍 Fetching machine data for:', selectedMachine?.machine_id);
      
      // If machine doesn't have live data capability, return offline status
      if (!canFetchLiveData) {
        console.log('⚠️ Machine does not have live data capability or no current UID');
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

      // For machines with live capability, try edge function first
      try {
        console.log('🌐 Attempting to fetch live data from edge function');
        const edgeFunctionData = await fetchLiveDataFromEdgeFunction(currentUID);
        
        if (edgeFunctionData && edgeFunctionData.data) {
          const liveData = edgeFunctionData.data;
          const dataTime = new Date(liveData._time);
          const now = new Date();
          const dataAge = now.getTime() - dataTime.getTime();

          // Get water level from edge function data
          const waterLevel = liveData.water_level_L || 0;
          
          // Prepare status flags from edge function data with better validation
          const statusFlags: StatusFlags = {
            full_tank: liveData.full_tank === true || liveData.full_tank === 1,
            producing_water: liveData.producing_water === true || liveData.producing_water === 1,
            defrosting: liveData.defrosting === true || liveData.defrosting === 1,
            compressor_on: typeof liveData.compressor_on === 'number' ? liveData.compressor_on : 
                           (liveData.compressor_on === true ? 1 : 0)
          };
          
          // Calculate machine status with improved logic
          const { status, isOnline } = calculateMachineStatus(waterLevel, dataAge, statusFlags);

          const processedData = {
            waterLevel: waterLevel,
            status: status,
            lastUpdated: liveData._time,
            dataAge: dataAge,
            compressorOn: statusFlags.compressor_on || 0,
            isOnline: isOnline,
            lastConnection: isOnline ? liveData._time : data.lastConnection || liveData._time,
            dataSource: 'live' as const
          };

          console.log('✅ Successfully processed edge function data:', {
            waterLevel: processedData.waterLevel,
            status: processedData.status,
            isOnline: processedData.isOnline,
            dataAge: Math.round(processedData.dataAge / 1000) + 's',
            statusFlags
          });
          
          setData(processedData);
          setError(null);
          setIsLoading(false);
          return;
        }
      } catch (edgeError) {
        console.warn('⚠️ Edge function failed, falling back to Supabase data:', edgeError);
        // Continue to fallback logic below
      }

      // Fallback to Supabase data if edge function fails
      console.log('📊 Falling back to Supabase data query');
      
      // Query both tables simultaneously as fallback with longer time range
      const [snapshotResult, rawDataResult] = await Promise.all([
        supabase
          .from('simple_water_snapshots')
          .select('*')
          .eq('machine_id', selectedMachine.machine_id)
          .gte('timestamp_utc', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        supabase
          .from('raw_machine_data')
          .select('*')
          .eq('machine_id', selectedMachine.machine_id)
          .gte('timestamp_utc', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (snapshotResult.error) {
        console.error('❌ Error querying simple_water_snapshots:', snapshotResult.error);
        throw new Error(`Water snapshots query failed: ${snapshotResult.error.message}`);
      }

      const snapshotData = snapshotResult.data;
      const rawData = rawDataResult.data;

      console.log('📊 Fallback data - snapshot:', !!snapshotData, 'raw:', !!rawData);

      if (!snapshotData) {
        console.log('⚠️ No recent data found - machine appears disconnected');
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
        setError('No recent data available from machine');
        setIsLoading(false);
        return;
      }

      // Process fallback data with improved status flags handling
      const dataTime = new Date(snapshotData.timestamp_utc);
      const now = new Date();
      const dataAge = now.getTime() - dataTime.getTime();
      const waterLevel = snapshotData.water_level_l || 0;
      
      const statusFlags: StatusFlags | undefined = rawData ? {
        full_tank: rawData.full_tank === true || rawData.full_tank === 1,
        producing_water: rawData.producing_water === true || rawData.producing_water === 1,
        defrosting: rawData.defrosting === true || rawData.defrosting === 1,
        compressor_on: typeof rawData.compressor_on === 'number' ? rawData.compressor_on : 
                       (rawData.compressor_on === true ? 1 : 0)
      } : undefined;
      
      // Use improved status calculation with fallback data
      const { status, isOnline } = calculateMachineStatus(waterLevel, dataAge, statusFlags);
      
      const processedData = {
        waterLevel: waterLevel,
        status: status,
        lastUpdated: snapshotData.timestamp_utc,
        dataAge: dataAge,
        compressorOn: statusFlags?.compressor_on || (waterLevel < 10 ? 1 : 0),
        isOnline: isOnline,
        lastConnection: isOnline ? snapshotData.timestamp_utc : data.lastConnection || snapshotData.timestamp_utc,
        dataSource: 'fallback' as const
      };

      console.log('✅ Processed fallback data:', {
        waterLevel: processedData.waterLevel,
        status: processedData.status,
        isOnline: processedData.isOnline,
        dataAge: Math.round(processedData.dataAge / 60000) + ' minutes',
        dataSource: processedData.dataSource
      });
      
      setData(processedData);
      setError(null);

    } catch (err) {
      console.error('❌ Error fetching machine data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      setData({
        waterLevel: 0,
        status: 'Disconnected',
        lastUpdated: new Date().toISOString(),
        dataAge: 0,
        compressorOn: 0,
        isOnline: false,
        lastConnection: data.lastConnection,
        dataSource: 'none'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 Setting up data fetching for machine:', selectedMachine?.machine_id);
    
    // Wait for UID to be loaded before fetching data
    if (uidLoading) {
      console.log('⏳ Waiting for UID to be loaded...');
      return;
    }

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
  }, [selectedMachine?.id, selectedMachine?.machine_id, canFetchLiveData, currentUID, uidLoading]);

  return { data, isLoading, error, refetch: fetchData };
};
