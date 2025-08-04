import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MachineStatus = 'Producing' | 'Idle' | 'Full Water' | 'Disconnected' | 'Defrosting';

interface UseLiveMachineDataProps {
  machineId: string;
}

interface MachineData {
  timestamp: string;
  water_level: number;
  tank_capacity: number;
  producing_flag: boolean;
  full_water_flag: boolean;
  idle_flag: boolean;
  defrosting_flag: boolean;
}

const useLiveMachineData = ({ machineId }: UseLiveMachineDataProps) => {
  const [latestData, setLatestData] = useState<MachineData | null>(null);
  const [status, setStatus] = useState<MachineStatus>('Disconnected');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('machine_data')
          .select('*')
          .eq('machine_id', machineId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setLatestData(data);
          setStatus(calculateStatus(data));
        }
      } catch (err: any) {
        setError(err);
        console.error("Failed to fetch initial machine data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel(`machine_data:${machineId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'machine_data', filter: `machine_id=eq.${machineId}` }, async payload => {
        console.log('Realtime payload received:', payload);
        const newData = payload.new;
        setLatestData(newData);
        setStatus(calculateStatus(newData));
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [machineId]);

  // Enhanced status calculation with better logic and debugging
  const calculateStatus = (latestData: any): MachineStatus => {
    console.log('🔍 Status calculation input:', {
      timestamp: latestData.timestamp,
      producing_flag: latestData.producing_flag,
      full_water_flag: latestData.full_water_flag,
      idle_flag: latestData.idle_flag,
      defrosting_flag: latestData.defrosting_flag,
      water_level: latestData.water_level,
      tank_capacity: latestData.tank_capacity
    });

    // Check if data is too old (15 minutes threshold)
    const dataAge = Date.now() - new Date(latestData.timestamp).getTime();
    const isDisconnected = dataAge > 15 * 60 * 1000; // 15 minutes in milliseconds
    
    console.log('🕐 Data age check:', {
      dataAge: Math.round(dataAge / 1000 / 60), // minutes
      isDisconnected,
      threshold: '15 minutes'
    });
    
    if (isDisconnected) {
      return 'Disconnected';
    }

    // Parse flags as numbers (they come as strings from InfluxDB)
    const producingFlag = Number(latestData.producing_flag) || 0;
    const fullWaterFlag = Number(latestData.full_water_flag) || 0;
    const idleFlag = Number(latestData.idle_flag) || 0;
    const defrostingFlag = Number(latestData.defrosting_flag) || 0;
    
    console.log('🏁 Parsed flags:', {
      producingFlag,
      fullWaterFlag,
      idleFlag,
      defrostingFlag
    });

    // Status priority logic with fallback
    if (defrostingFlag > 0) {
      return 'Defrosting';
    }
    
    if (fullWaterFlag > 0) {
      return 'Full Water';
    }
    
    if (producingFlag > 0) {
      return 'Producing';
    }
    
    if (idleFlag > 0) {
      return 'Idle';
    }

    // Fallback: check water level if flags are unreliable
    const waterLevel = Number(latestData.water_level) || 0;
    const tankCapacity = Number(latestData.tank_capacity) || 100;
    const fillPercentage = tankCapacity > 0 ? (waterLevel / tankCapacity) * 100 : 0;
    
    console.log('💧 Water level fallback:', {
      waterLevel,
      tankCapacity,
      fillPercentage
    });
    
    // If tank is nearly full, assume Full Water status
    if (fillPercentage >= 95) {
      return 'Full Water';
    }
    
    // Default fallback - if we have recent data but no clear flags, assume Idle
    console.log('⚠️ Using fallback status: Idle');
    return 'Idle';
  };

  return { latestData, status, loading, error };
};

export default useLiveMachineData;
