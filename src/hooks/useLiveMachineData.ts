
import { useState, useEffect } from 'react';
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
      console.log('Fetching machine data for:', selectedMachine?.machine_id);
      
      // If machine doesn't have live data capability, return offline status
      if (!canFetchLiveData) {
        console.log('Machine does not have live data capability');
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

      console.log('Fetching live data for machine with UID:', selectedMachine.microcontroller_uid);
      
      // Use GET request to the edge function for live data with UID parameter
      const response = await fetch(
        `https://dolkcmipdzqrtpaflvaf.supabase.co/functions/v1/get-machine-data?uid=${selectedMachine.microcontroller_uid}`,
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbGtjbWlwZHpxcnRwYWZsdmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4OTY2MDUsImV4cCI6MjA2NDQ3MjYwNX0.ezGW3OsanYsDSHireReMkeV_sEs3HzyfATzGLKHfQCc',
            'Accept': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Edge Function returned a non-2xx status code: ${response.status}`);
      }

      const result = await response.json();
      console.log('Received live data:', result);

      // Handle the response format
      if (result.status === 'ok' && result.data) {
        const machineData = result.data;
        
        // Calculate data age
        const dataTime = new Date(machineData._time);
        const now = new Date();
        const dataAge = now.getTime() - dataTime.getTime();

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
          lastConnection: isOnline ? machineData._time : data.lastConnection || machineData._time,
          dataSource: 'live' as const
        };

        console.log('Processed live machine data:', processedData);
        setData(processedData);
        setError(null);
      } else if (result.status === 'no_data') {
        // Handle no data case - machine is disconnected
        console.log('No recent data available for machine');
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
      } else {
        throw new Error('Invalid response format from edge function');
      }
    } catch (err) {
      console.error('Error fetching machine data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
    // Initial fetch
    fetchData();

    // Only set up polling for machines with live data capability
    if (canFetchLiveData) {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedMachine?.id, selectedMachine?.microcontroller_uid, canFetchLiveData]);

  return { data, isLoading, error, refetch: fetchData };
};
