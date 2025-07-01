
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProductionData {
  date: string;
  production: number;
}

interface MonthlyProductionData {
  month: string;
  production: number;
}

interface StatusData {
  date: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

interface MonthlyStatusData {
  month: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

interface ProductionAnalyticsData {
  dailyProductionData: ProductionData[];
  monthlyProductionData: MonthlyProductionData[];
  statusData: StatusData[];
  monthlyStatusData: MonthlyStatusData[];
}

export const useProductionAnalytics = (machineId?: string) => {
  const [data, setData] = useState<ProductionAnalyticsData>({
    dailyProductionData: [],
    monthlyProductionData: [],
    statusData: [],
    monthlyStatusData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductionAnalytics = async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching production analytics for machine:', machineId);

      // Fetch daily production data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: productionEvents, error: productionError } = await supabase
        .from('water_production_events')
        .select('production_liters, timestamp_utc')
        .eq('machine_id', machineId)
        .gte('timestamp_utc', sevenDaysAgo.toISOString())
        .order('timestamp_utc', { ascending: true });

      if (productionError) {
        throw productionError;
      }

      // Group production by day
      const dailyProduction = new Map<string, number>();
      const monthlyProduction = new Map<string, number>();

      productionEvents?.forEach(event => {
        const date = new Date(event.timestamp_utc);
        const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        dailyProduction.set(dayKey, (dailyProduction.get(dayKey) || 0) + (event.production_liters || 0));
        monthlyProduction.set(monthKey, (monthlyProduction.get(monthKey) || 0) + (event.production_liters || 0));
      });

      // Create daily production array (last 4 days)
      const dailyProductionData: ProductionData[] = [];
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        dailyProductionData.push({
          date: dayKey,
          production: Math.round((dailyProduction.get(dayKey) || 0) * 10) / 10
        });
      }

      // Create monthly production array (last 3 months)
      const monthlyProductionData: MonthlyProductionData[] = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        monthlyProductionData.push({
          month: monthKey,
          production: Math.round((monthlyProduction.get(monthKey) || 0) * 10) / 10
        });
      }

      // Fetch machine status data for the last 7 days
      const { data: statusData, error: statusError } = await supabase
        .from('raw_machine_data')
        .select('timestamp_utc, producing_water, full_tank, compressor_on')
        .eq('machine_id', machineId)
        .gte('timestamp_utc', sevenDaysAgo.toISOString())
        .order('timestamp_utc', { ascending: true });

      if (statusError) {
        throw statusError;
      }

      // Group status data by day
      const dailyStatus = new Map<string, { producing: number, idle: number, fullWater: number, disconnected: number, total: number }>();
      const monthlyStatus = new Map<string, { producing: number, idle: number, fullWater: number, disconnected: number, total: number }>();

      statusData?.forEach(record => {
        const date = new Date(record.timestamp_utc);
        const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        const isProducing = record.producing_water || record.compressor_on;
        const isFullTank = record.full_tank;
        
        // Initialize if not exists
        if (!dailyStatus.has(dayKey)) {
          dailyStatus.set(dayKey, { producing: 0, idle: 0, fullWater: 0, disconnected: 0, total: 0 });
        }
        if (!monthlyStatus.has(monthKey)) {
          monthlyStatus.set(monthKey, { producing: 0, idle: 0, fullWater: 0, disconnected: 0, total: 0 });
        }

        const dailyEntry = dailyStatus.get(dayKey)!;
        const monthlyEntry = monthlyStatus.get(monthKey)!;

        if (isFullTank) {
          dailyEntry.fullWater++;
          monthlyEntry.fullWater++;
        } else if (isProducing) {
          dailyEntry.producing++;
          monthlyEntry.producing++;
        } else {
          dailyEntry.idle++;
          monthlyEntry.idle++;
        }

        dailyEntry.total++;
        monthlyEntry.total++;
      });

      // Create status arrays
      const statusDataArray: StatusData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const entry = dailyStatus.get(dayKey) || { producing: 0, idle: 0, fullWater: 0, disconnected: 0, total: 1 };
        
        statusDataArray.push({
          date: dayKey,
          producing: Math.round((entry.producing / entry.total) * 100) || 0,
          idle: Math.round((entry.idle / entry.total) * 100) || 0,
          fullWater: Math.round((entry.fullWater / entry.total) * 100) || 0,
          disconnected: Math.round((entry.disconnected / entry.total) * 100) || 0
        });
      }

      const monthlyStatusData: MonthlyStatusData[] = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        const entry = monthlyStatus.get(monthKey) || { producing: 0, idle: 0, fullWater: 0, disconnected: 0, total: 1 };
        
        monthlyStatusData.push({
          month: monthKey,
          producing: Math.round((entry.producing / entry.total) * 100) || 0,
          idle: Math.round((entry.idle / entry.total) * 100) || 0,
          fullWater: Math.round((entry.fullWater / entry.total) * 100) || 0,
          disconnected: Math.round((entry.disconnected / entry.total) * 100) || 0
        });
      }

      setData({
        dailyProductionData,
        monthlyProductionData,
        statusData: statusDataArray,
        monthlyStatusData
      });

      console.log('✅ Production analytics data loaded:', {
        dailyProduction: dailyProductionData.length,
        monthlyProduction: monthlyProductionData.length,
        statusEntries: statusDataArray.length
      });

      setError(null);
    } catch (err) {
      console.error('❌ Error fetching production analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionAnalytics();
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchProductionAnalytics };
};
