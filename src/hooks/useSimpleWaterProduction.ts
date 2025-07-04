
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

  // Fetch total water production from production events only (exclude drainage)
  const fetchTotalProduction = async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching server-tracked production for:', machineId);
      
      // Get sum of ONLY production events (exclude drainage events)
      const { data: events, error: eventsError } = await supabase
        .from('water_production_events')
        .select('production_liters')
        .eq('machine_id', machineId)
        .eq('event_type', 'production'); // Only include actual production events

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
        isTracking: true // Server is always tracking
      };

      setData(newData);
      setError(null);
      
      console.log('✅ Server-tracked production data updated (production events only):', {
        totalProduced: newData.totalProduced,
        eventsCount: events?.length || 0,
        lastSnapshot: newData.lastSnapshot?.toISOString()
      });

    } catch (err) {
      console.error('❌ Error fetching server-tracked production:', err);
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

    // Refresh every 5 minutes to show latest server-calculated data
    const interval = setInterval(() => {
      fetchTotalProduction();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchTotalProduction };
};
