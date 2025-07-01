
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WaterProductionData {
  totalProduced: number;
  lastSnapshot: Date | null;
  isTracking: boolean;
}

export const useSimpleWaterProduction = (machineId?: string, currentWaterLevel?: number) => {
  const [data, setData] = useState<WaterProductionData>({
    totalProduced: 0,
    lastSnapshot: null,
    isTracking: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store snapshot every 30 minutes
  const storeSnapshot = async (waterLevel: number) => {
    if (!machineId || waterLevel <= 0) return;

    try {
      console.log('📸 Storing water level snapshot:', { machineId, waterLevel });
      
      const { error: insertError } = await supabase
        .from('simple_water_snapshots')
        .insert({
          machine_id: machineId,
          water_level_l: waterLevel,
          timestamp_utc: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error storing snapshot:', insertError);
        return;
      }

      console.log('✅ Snapshot stored successfully');
      await checkForProduction();
      
    } catch (err) {
      console.error('💥 Exception storing snapshot:', err);
    }
  };

  // Check for water production by comparing with previous snapshot
  const checkForProduction = async () => {
    if (!machineId || !currentWaterLevel) return;

    try {
      // Get the last two snapshots to compare
      const { data: snapshots, error: snapshotsError } = await supabase
        .from('simple_water_snapshots')
        .select('*')
        .eq('machine_id', machineId)
        .order('timestamp_utc', { ascending: false })
        .limit(2);

      if (snapshotsError) {
        console.error('❌ Error fetching snapshots:', snapshotsError);
        return;
      }

      if (snapshots && snapshots.length >= 2) {
        const currentSnapshot = snapshots[0];
        const previousSnapshot = snapshots[1];
        
        const waterLevelDiff = currentSnapshot.water_level_l - previousSnapshot.water_level_l;
        
        console.log('🔍 Checking production:', {
          current: currentSnapshot.water_level_l,
          previous: previousSnapshot.water_level_l,
          difference: waterLevelDiff
        });

        // Only consider it production if increase is > 0.1L (to avoid noise)
        if (waterLevelDiff > 0.1) {
          console.log('💧 Water production detected:', waterLevelDiff, 'L');
          
          // Store the production event
          const { error: productionError } = await supabase
            .from('water_production_events')
            .insert({
              machine_id: machineId,
              production_liters: waterLevelDiff,
              previous_level: previousSnapshot.water_level_l,
              current_level: currentSnapshot.water_level_l,
              timestamp_utc: currentSnapshot.timestamp_utc
            });

          if (productionError) {
            console.error('❌ Error storing production event:', productionError);
          } else {
            console.log('✅ Production event stored successfully');
            // Refresh total production data
            await fetchTotalProduction();
          }
        }
      }
    } catch (err) {
      console.error('💥 Exception checking for production:', err);
    }
  };

  // Fetch total water production from all events
  const fetchTotalProduction = async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching total production for:', machineId);
      
      // Get sum of all production events
      const { data: events, error: eventsError } = await supabase
        .from('water_production_events')
        .select('production_liters')
        .eq('machine_id', machineId);

      if (eventsError) {
        throw eventsError;
      }

      const totalProduced = events?.reduce((sum, event) => sum + (event.production_liters || 0), 0) || 0;

      // Get last snapshot timestamp
      const { data: lastSnapshot, error: snapshotError } = await supabase
        .from('simple_water_snapshots')
        .select('timestamp_utc')
        .eq('machine_id', machineId)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .single();

      const newData = {
        totalProduced: Math.round(totalProduced * 100) / 100,
        lastSnapshot: lastSnapshot ? new Date(lastSnapshot.timestamp_utc) : null,
        isTracking: true
      };

      setData(newData);
      setError(null);
      
      console.log('✅ Total production updated:', {
        totalProduced: newData.totalProduced,
        eventsCount: events?.length || 0,
        lastSnapshot: newData.lastSnapshot?.toISOString()
      });

    } catch (err) {
      console.error('❌ Error fetching total production:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up 30-minute interval for snapshots
  useEffect(() => {
    if (!machineId || !currentWaterLevel) return;

    // Store initial snapshot
    storeSnapshot(currentWaterLevel);

    // Set up 30-minute interval (1800000 ms)
    const interval = setInterval(() => {
      if (currentWaterLevel && currentWaterLevel > 0) {
        storeSnapshot(currentWaterLevel);
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [machineId, currentWaterLevel]);

  // Fetch initial total production data
  useEffect(() => {
    fetchTotalProduction();
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchTotalProduction };
};
