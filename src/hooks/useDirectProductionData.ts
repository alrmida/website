import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProductionDataPoint {
  date: string;
  production: number;
}

interface DirectProductionData {
  dailyProductionData: ProductionDataPoint[];
  weeklyProductionData: ProductionDataPoint[];
  monthlyProductionData: ProductionDataPoint[];
  yearlyProductionData: ProductionDataPoint[];
  totalAllTimeProduction: number;
  statusData: Array<{ date: string; producing: number; idle: number; fullWater: number; disconnected: number }>;
  weeklyStatusData: Array<{ week: string; producing: number; idle: number; fullWater: number; disconnected: number }>;
  monthlyStatusData: Array<{ month: string; producing: number; idle: number; fullWater: number; disconnected: number }>;
  yearlyStatusData: Array<{ year: string; producing: number; idle: number; fullWater: number; disconnected: number }>;
}

export const useDirectProductionData = (machineId?: string) => {
  const [data, setData] = useState<DirectProductionData>({
    dailyProductionData: [],
    weeklyProductionData: [],
    monthlyProductionData: [],
    yearlyProductionData: [],
    totalAllTimeProduction: 0,
    statusData: [],
    weeklyStatusData: [],
    monthlyStatusData: [],
    yearlyStatusData: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectData = useCallback(async () => {
    if (!machineId) {
      setData({
        dailyProductionData: [],
        weeklyProductionData: [],
        monthlyProductionData: [],
        yearlyProductionData: [],
        totalAllTimeProduction: 0,
        statusData: [],
        weeklyStatusData: [],
        monthlyStatusData: [],
        yearlyStatusData: []
      });
      return;
    }

    console.log('🚀 [DIRECT PRODUCTION] Fetching data for machine:', machineId);
    setIsLoading(true);
    setError(null);

    try {
      // Direct daily production query
      const { data: dailyData, error: dailyError } = await supabase
        .from('water_production_events')
        .select('production_liters, timestamp_utc')
        .eq('machine_id', machineId)
        .eq('event_type', 'production')
        .gte('timestamp_utc', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (dailyError) throw dailyError;

      // Direct total production query
      const { data: totalData, error: totalError } = await supabase
        .from('water_production_events')
        .select('production_liters')
        .eq('machine_id', machineId)
        .eq('event_type', 'production');

      if (totalError) throw totalError;

      // Process daily data
      const dailyAggregated = new Map<string, number>();
      dailyData?.forEach(event => {
        const date = new Date(event.timestamp_utc).toISOString().split('T')[0];
        const current = dailyAggregated.get(date) || 0;
        dailyAggregated.set(date, current + (Number(event.production_liters) || 0));
      });

      // Process monthly data
      const monthlyAggregated = new Map<string, number>();
      dailyData?.forEach(event => {
        const date = new Date(event.timestamp_utc);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyAggregated.get(monthKey) || 0;
        monthlyAggregated.set(monthKey, current + (Number(event.production_liters) || 0));
      });

      // Calculate total
      const totalAllTimeProduction = totalData?.reduce((sum, event) => 
        sum + (Number(event.production_liters) || 0), 0) || 0;

      // Format data
      const dailyProductionData: ProductionDataPoint[] = Array.from(dailyAggregated.entries())
        .map(([date, production]) => ({ date, production }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const monthlyProductionData: ProductionDataPoint[] = Array.from(monthlyAggregated.entries())
        .map(([month, production]) => ({ date: month, production }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Basic status data matching expected structure
      const statusData = dailyProductionData.map(item => ({
        date: item.date,
        producing: item.production > 0 ? 85 : 0,
        idle: item.production > 0 ? 15 : 100,
        fullWater: 0,
        disconnected: 0
      }));

      const monthlyStatusData = monthlyProductionData.map(item => ({
        month: item.date,
        producing: item.production > 0 ? 85 : 0,
        idle: item.production > 0 ? 15 : 100,
        fullWater: 0,
        disconnected: 0
      }));

      setData({
        dailyProductionData,
        weeklyProductionData: [], // Empty for now
        monthlyProductionData,
        yearlyProductionData: [], // Empty for now
        totalAllTimeProduction,
        statusData,
        weeklyStatusData: [], // Empty for now
        monthlyStatusData,
        yearlyStatusData: [] // Empty for now
      });

    } catch (error) {
      console.error('❌ [DIRECT PRODUCTION] Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch production data');
    } finally {
      setIsLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    fetchDirectData();
  }, [fetchDirectData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!machineId) return;
    
    const interval = setInterval(fetchDirectData, 30000);
    return () => clearInterval(interval);
  }, [machineId, fetchDirectData]);

  return { data, isLoading, error, refetch: fetchDirectData };
};