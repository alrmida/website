
import { useState, useEffect } from 'react';

interface LiveMachineData {
  waterLevel: number;
  status: string;
  lastUpdated: string;
  dataAge: number;
  compressorOn: number;
  isOnline: boolean;
  lastConnection?: string;
}

function calculateMachineStatus(waterLevel: number, compressorOn: number, dataAge: number): { status: string, isOnline: boolean } {
  console.log('🔍 Calculating machine status:', { waterLevel, compressorOn, dataAge });
  
  // If no data for 60+ seconds, machine is disconnected/offline
  if (dataAge > 60000) { // 60 seconds in milliseconds
    console.log('❌ Machine marked as disconnected due to data age:', dataAge, 'ms');
    return { status: 'Disconnected', isOnline: false };
  }
  
  // Machine is online if we have recent data
  const isOnline = true;
  console.log('✅ Machine is online with recent data');
  
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

export const useLiveMachineData = (selectedMachineId?: string) => {
  const [data, setData] = useState<LiveMachineData>({
    waterLevel: 0,
    status: 'Loading...',
    lastUpdated: new Date().toISOString(),
    dataAge: 0,
    compressorOn: 0,
    isOnline: false,
    lastConnection: undefined
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if this is the live data machine (KU001619000079 - the actual machine ID in database)
  const isLiveDataMachine = selectedMachineId === 'KU001619000079';

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching machine data for:', selectedMachineId);
      
      // If not the live data machine, return offline status
      if (!isLiveDataMachine) {
        console.log('ℹ️ Not the live data machine, returning offline status');
        setData({
          waterLevel: 0,
          status: 'Offline',
          lastUpdated: new Date().toISOString(),
          dataAge: 0,
          compressorOn: 0,
          isOnline: false,
          lastConnection: undefined
        });
        setError(null);
        setIsLoading(false);
        return;
      }

      console.log('🚀 Fetching live data for KU001619000079...');
      
      // Use GET request to the edge function for live data
      const response = await fetch(
        'https://dolkcmipdzqrtpaflvaf.supabase.co/functions/v1/get-machine-data',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbGtjbWlwZHpxcnRwYWZsdmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4OTY2MDUsImV4cCI6MjA2NDQ3MjYwNX0.ezGW3OsanYsDSHireReMkeV_sEs3HzyfATzGLKHfQCc',
            'Accept': 'application/json',
          },
        }
      );

      console.log('📡 Edge function response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge function error:', response.status, errorText);
        throw new Error(`Edge Function returned a non-2xx status code: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Received live data from edge function:', result);

      // Handle the response format
      if (result.status === 'ok' && result.data) {
        const machineData = result.data;
        
        // Calculate data age
        const dataTime = new Date(machineData._time);
        const now = new Date();
        const dataAge = now.getTime() - dataTime.getTime();

        console.log('⏰ Data timestamp:', machineData._time);
        console.log('⏰ Current time:', now.toISOString());
        console.log('⏰ Data age (ms):', dataAge);
        console.log('⏰ Data age (minutes):', Math.round(dataAge / 60000));

        // Get machine data
        const waterLevel = machineData.water_level_L || 0;
        const compressorOn = machineData.compressor_on || 0;
        
        // Calculate machine status and online state
        const { status, isOnline } = calculateMachineStatus(waterLevel, compressorOn, dataAge);

        const processedData = {
          waterLevel: waterLevel,
          status: status,
          lastUpdated: machineData._time,
          dataAge: dataAge,
          compressorOn: compressorOn,
          isOnline: isOnline,
          lastConnection: isOnline ? machineData._time : data.lastConnection || machineData._time
        };

        console.log('✅ Processed live machine data:', processedData);
        setData(processedData);
        setError(null);
      } else {
        console.error('❌ Invalid response format:', result);
        throw new Error('Invalid response format from edge function');
      }
    } catch (err) {
      console.error('💥 Error fetching machine data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set fallback data when there's an error, but preserve last connection time
      setData(prev => ({
        ...prev,
        status: 'Disconnected',
        isOnline: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Only set up polling for live data machine
    if (isLiveDataMachine) {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedMachineId, isLiveDataMachine]);

  return { data, isLoading, error, refetch: fetchData };
};
