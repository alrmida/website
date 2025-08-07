
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';

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

        console.log('🔍 Fetching data for machine:', selectedMachine.machine_id);
        console.log('👤 Current user role:', currentProfile?.role, 'username:', currentProfile?.username);
        
        // Try to get the most recent raw machine data
        const { data: rawData, error: rawError } = await supabase
          .from('raw_machine_data')
          .select('*')
          .eq('machine_id', selectedMachine.machine_id)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rawError) {
          console.error('❌ Error fetching raw machine data:', rawError);
          console.error('🔍 RLS Debug - User role:', currentProfile?.role, 'Machine ID:', selectedMachine.machine_id);
          throw new Error(`Database error: ${rawError.message}`);
        }

        console.log('🔍 Raw data query result:', {
          found: !!rawData,
          userRole: currentProfile?.role,
          machineId: selectedMachine.machine_id,
          timestamp: rawData?.timestamp_utc || 'none',
          recordId: rawData?.id || 'none'
        });

        if (rawData) {
          console.log('✅ Found raw machine data:', {
            timestamp: rawData.timestamp_utc,
            water_level: rawData.water_level_l,
            age_minutes: Math.round((new Date().getTime() - new Date(rawData.timestamp_utc).getTime()) / (1000 * 60))
          });
          const processedData = processRawData(rawData);
          setData(processedData);
        } else {
          console.log('⚠️ No raw machine data found, using fallback');
          console.log('🔍 Debug info:', {
            userRole: currentProfile?.role,
            machineId: selectedMachine.machine_id,
            possibleCause: 'RLS policy may be blocking access or no data exists'
          });
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
        console.error('❌ Failed to fetch machine data:', err);
        console.error('🔍 Error context:', {
          machineId: selectedMachine.machine_id,
          errorMessage: err.message,
          errorCode: err.code
        });
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
    const channel = supabase
      .channel(`raw_machine_data:${selectedMachine.machine_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'raw_machine_data',
        filter: `machine_id=eq.${selectedMachine.machine_id}`
      }, (payload) => {
        console.log('🔄 Real-time update received:', {
          machineId: selectedMachine.machine_id,
          timestamp: payload.new.timestamp_utc,
          water_level: payload.new.water_level_l
        });
        if (payload.new) {
          const processedData = processRawData(payload.new);
          setData(processedData);
        }
      })
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status, 'for machine:', selectedMachine.machine_id);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMachine?.machine_id]);

  const processRawData = (rawData: any): LiveMachineData => {
    const dataTimestamp = new Date(rawData.timestamp_utc);
    const now = new Date();
    const dataAge = now.getTime() - dataTimestamp.getTime();
    
    console.log('🔍 Processing raw data:', {
      timestamp: rawData.timestamp_utc,
      water_level: rawData.water_level_l,
      producing_water: rawData.producing_water,
      full_tank: rawData.full_tank,
      defrosting: rawData.defrosting,
      compressor_on: rawData.compressor_on,
      dataAge: Math.round(dataAge / 1000 / 60) // minutes
    });

    // Check if data is too old (15 minutes threshold)
    const isDisconnected = dataAge > 15 * 60 * 1000; // 15 minutes in milliseconds
    
    if (isDisconnected) {
      console.log('⚠️ Data is too old, marking as disconnected:', {
        dataAge: Math.round(dataAge / 1000 / 60),
        threshold: 15
      });
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
    
    console.log('✅ Machine status calculated:', {
      status,
      isOnline: true,
      dataAge: Math.round(dataAge / 1000 / 60)
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
    console.log('🎯 Calculating status from flags:', {
      defrosting: rawData.defrosting,
      full_tank: rawData.full_tank,
      producing_water: rawData.producing_water,
      serving_water: rawData.serving_water,
      treating_water: rawData.treating_water,
      water_level: rawData.water_level_l
    });

    // Status priority logic
    if (rawData.defrosting === true) {
      console.log('✅ Status: Defrosting');
      return 'Defrosting';
    }
    
    if (rawData.full_tank === true) {
      console.log('✅ Status: Full Water');
      return 'Full Water';
    }
    
    if (rawData.producing_water === true) {
      console.log('✅ Status: Producing');
      return 'Producing';
    }
    
    // Fallback: check water level for full tank
    const waterLevel = rawData.water_level_l || 0;
    if (waterLevel >= 9.5) { // Nearly full
      console.log('✅ Status: Full Water (based on level)');
      return 'Full Water';
    }
    
    // Default to Idle if we have recent data but no clear producing flags
    console.log('✅ Status: Idle (default)');
    return 'Idle';
  };

  return { data, isLoading, error };
};

export default useLiveMachineData;
