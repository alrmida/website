
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveMachineData {
  waterLevel: number;
  status: string;
  lastUpdated: string;
  dataAge: number;
  compressorOn: number;
}

export const useLiveMachineData = () => {
  const [data, setData] = useState<LiveMachineData>({
    waterLevel: 0,
    status: 'Loading...',
    lastUpdated: new Date().toISOString(),
    dataAge: 0,
    compressorOn: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      console.log('Fetching live machine data...');
      const { data: result, error: functionError } = await supabase.functions.invoke('get-machine-data');
      
      if (functionError) {
        console.error('Function error:', functionError);
        throw functionError;
      }

      console.log('Received data:', result);
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching machine data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set fallback data when there's an error
      setData(prev => ({
        ...prev,
        status: 'Disconnected'
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
