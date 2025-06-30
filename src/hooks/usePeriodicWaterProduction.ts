
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WaterProductionPeriod {
  id: string;
  machine_id: string;
  period_start: string;
  period_end: string;
  water_level_start: number;
  water_level_end: number;
  production_liters: number;
  period_status: string;
  full_tank_start: boolean;
  full_tank_end: boolean;
  created_at: string;
}

interface WaterProductionSummary {
  totalProduced: number;
  productionRate: number;
  lastPeriod: WaterProductionPeriod | null;
  recentPeriods: WaterProductionPeriod[];
  lastUpdate: Date | null;
}

export const usePeriodicWaterProduction = (machineId?: string) => {
  const [data, setData] = useState<WaterProductionSummary>({
    totalProduced: 0,
    productionRate: 0,
    lastPeriod: null,
    recentPeriods: [],
    lastUpdate: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductionData = async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching periodic production data for:', machineId);

      // Fetch recent production periods (last 24 hours)
      const { data: periods, error: periodsError } = await supabase
        .from('water_production_periods')
        .select('*')
        .eq('machine_id', machineId)
        .gte('period_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('period_start', { ascending: false })
        .limit(48); // Last 48 periods (24 hours of 30-min intervals)

      if (periodsError) {
        throw periodsError;
      }

      const recentPeriods = periods || [];
      console.log('📈 Found periods:', recentPeriods.length);

      // Calculate total production (excluding tank_full periods)
      const totalProduced = recentPeriods
        .filter(p => p.period_status !== 'tank_full')
        .reduce((sum, period) => sum + (period.production_liters || 0), 0);

      // Calculate production rate (liters per hour)
      const productionPeriods = recentPeriods.filter(p => 
        p.period_status === 'producing' && p.production_liters > 0
      );
      
      let productionRate = 0;
      if (productionPeriods.length > 0) {
        const avgProductionPer30Min = productionPeriods
          .reduce((sum, p) => sum + p.production_liters, 0) / productionPeriods.length;
        productionRate = avgProductionPer30Min * 2; // Convert to per hour
      }

      // Get the most recent period
      const lastPeriod = recentPeriods.length > 0 ? recentPeriods[0] : null;

      setData({
        totalProduced,
        productionRate,
        lastPeriod,
        recentPeriods,
        lastUpdate: new Date()
      });

      setError(null);
      console.log('✅ Production summary:', { totalProduced, productionRate });

    } catch (err) {
      console.error('❌ Error fetching production data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchProductionData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchProductionData };
};
