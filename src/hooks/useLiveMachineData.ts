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

// Static data generator for demo machines
function generateStaticMachineData(machineId: string): LiveMachineData {
  const staticData: { [key: string]: LiveMachineData } = {
    'AWG-001': {
      waterLevel: 11.2,
      status: 'Full Water',
      lastUpdated: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      dataAge: 300000,
      compressorOn: 0,
      isOnline: true
    },
    'AWG-002': {
      waterLevel: 6.8,
      status: 'Producing',
      lastUpdated: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      dataAge: 120000,
      compressorOn: 1,
      isOnline: true
    },
    'AWG-003': {
      waterLevel: 3.2,
      status: 'Idle',
      lastUpdated: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
      dataAge: 180000,
      compressorOn: 0,
      isOnline: true
    },
    'AWG-004': {
      waterLevel: 0,
      status: 'Disconnected',
      lastUpdated: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      dataAge: 3600000,
      compressorOn: 0,
      isOnline: false
    },
    'default': {
      waterLevel: 8.5,
      status: 'Producing',
      lastUpdated: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      dataAge: 600000,
      compressorOn: 1,
      isOnline: true
    }
  };

  return staticData[machineId] || staticData['default'];
}

export const useLiveMachineData = (selectedMachineId?: string) => {
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

  // Check if this is the live data machine (KU079 - the actual machine ID in database)
  const isLiveDataMachine = selectedMachineId === 'KU079';

  const fetchData = async () => {
    try {
      console.log('Fetching machine data for:', selectedMachineId);
      
      // If not the live data machine, return static data
      if (!isLiveDataMachine) {
        const staticData = generateStaticMachineData(selectedMachineId || 'default');
        console.log('Using static data for machine:', selectedMachineId, staticData);
        setData(staticData);
        setError(null);
        setIsLoading(false);
        return;
      }

      console.log('Fetching live data for KU079...');
      
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
          isOnline: isOnline
        };

        console.log('Processed live machine data:', processedData);
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

    // Only set up polling for live data machine
    if (isLiveDataMachine) {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedMachineId, isLiveDataMachine]);

  return { data, isLoading, error, refetch: fetchData };
};
