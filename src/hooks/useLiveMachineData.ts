
import { useState, useEffect } from 'react';

interface LiveMachineData {
  waterLevel: number;
  status: string;
  lastUpdated: string;
  dataAge: number;
  compressorOn: number;
  isOnline: boolean;
}

function calculateMachineStatus(waterLevel: number, compressorOn: number, dataAge: number): { status: string, isOnline: boolean } {
  // If no data for 60+ seconds, machine is disconnected/offline
  if (dataAge > 60000) { // 60 seconds in milliseconds
    return { status: 'Disconnected', isOnline: false };
  }
  
  // Machine is online if we have recent data
  const isOnline = true;
  
  // Calculate status based on water level and compressor state
  if (waterLevel > 9.5 && compressorOn === 0) {
    return { status: 'Full Water', isOnline };
  } else if (waterLevel <= 9.5 && compressorOn === 1) {
    return { status: 'Producing', isOnline };
  } else if (waterLevel <= 9.5 && compressorOn === 0) {
    return { status: 'Idle', isOnline };
  }
  
  return { status: 'Unknown', isOnline };
}

export const useLiveMachineData = () => {
  const [data, setData] = useState<LiveMachineData>({
    waterLevel: 0,
    status: 'Loading...',
    lastUpdated: new Date().toISOString(),
    dataAge: 0,
    compressorOn: 0,
    isOnline: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      console.log('Fetching live machine data...');
      
      // Use GET request to the edge function
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

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Edge Function returned a non-2xx status code: ${response.status}`);
      }

      const result = await response.json();
      console.log('Received data:', result);

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
          isOnline: isOnline
        };

        console.log('Processed machine data:', processedData);
        setData(processedData);
        setError(null);
      } else {
        throw new Error('Invalid response format from edge function');
      }
    } catch (err) {
      console.error('Error fetching machine data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set fallback data when there's an error
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

    // Set up interval to fetch every 10 seconds
    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, error, refetch: fetchData };
};
