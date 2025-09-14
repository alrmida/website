
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WaterProductionData {
  totalProduced: number;
  lastProductionEvent: Date | null;
  lastSnapshot: Date | null;
  isTracking: boolean;
}

export const useSimpleWaterProduction = (machineId?: string, currentWaterLevel?: number) => {
  const [data, setData] = useState<WaterProductionData>({
    totalProduced: 0,
    lastProductionEvent: null,
    lastSnapshot: null,
    isTracking: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch total water production from pre-computed totals table
  const fetchTotalProduction = async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching production total from summary table for:', machineId);
      
      // Get total from pre-computed table (much faster)
      const { data: totalData, error: totalError } = await supabase
        .from('machine_production_totals')
        .select('total_production_liters, last_updated')
        .eq('machine_id', machineId)
        .single();

      // Fallback to calculating from events if summary doesn't exist yet
      let totalProduced = 0;
      let lastProductionEvent = null;

      if (totalError && totalError.code === 'PGRST116') {
        // No summary data yet, calculate from events
        console.log('⚠️ No summary data found, calculating from events...');
        
        const { data: events, error: eventsError } = await supabase
          .from('water_production_events')
          .select('production_liters, timestamp_utc')
          .eq('machine_id', machineId)
          .gt('production_liters', 0)
          .order('timestamp_utc', { ascending: false });

        if (eventsError) {
          throw eventsError;
        }

        totalProduced = events?.reduce((sum, event) => sum + Math.max(0, event.production_liters || 0), 0) || 0;
        lastProductionEvent = events && events.length > 0 ? new Date(events[0].timestamp_utc) : null;

      } else if (totalError) {
        throw totalError;
      } else {
        totalProduced = Number(totalData.total_production_liters);
        
        // Get the most recent production event timestamp
        const { data: lastEvent, error: lastEventError } = await supabase
          .from('water_production_events')
          .select('timestamp_utc')
          .eq('machine_id', machineId)
          .gt('production_liters', 0)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastEventError && lastEvent) {
          lastProductionEvent = new Date(lastEvent.timestamp_utc);
        }
      }

      // Get last snapshot timestamp
      const { data: lastSnapshot, error: snapshotError } = await supabase
        .from('simple_water_snapshots')
        .select('timestamp_utc')
        .eq('machine_id', machineId)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newData = {
        totalProduced: Math.round(totalProduced * 100) / 100,
        lastProductionEvent,
        lastSnapshot: lastSnapshot ? new Date(lastSnapshot.timestamp_utc) : null,
        isTracking: true // Server is always tracking
      };

      setData(newData);
      setError(null);
      
      console.log('✅ Production data updated from summary table:', {
        totalProduced: newData.totalProduced,
        lastProductionEvent: newData.lastProductionEvent?.toISOString(),
        lastSnapshot: newData.lastSnapshot?.toISOString()
      });

    } catch (err) {
      console.error('❌ Error fetching production data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial total production data
  useEffect(() => {
    fetchTotalProduction();
  }, [machineId]);

  // Set up periodic refresh to get latest server data
  useEffect(() => {
    if (!machineId) return;

    // Refresh every 2 minutes to show latest server-calculated data
    const interval = setInterval(() => {
      fetchTotalProduction();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchTotalProduction };
};
