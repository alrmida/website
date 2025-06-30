
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

      // Fetch recent production periods (last 7 days for better data coverage)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: periods, error: periodsError } = await supabase
        .from('water_production_periods')
        .select('*')
        .eq('machine_id', machineId)
        .gte('period_start', sevenDaysAgo)
        .order('period_start', { ascending: false })
        .limit(336); // Last week of 30-min intervals

      if (periodsError) {
        throw periodsError;
      }

      const recentPeriods = periods || [];
      console.log('📈 Found production periods:', recentPeriods.length);

      // Calculate total production from all periods (excluding tank_full periods)
      const productionPeriods = recentPeriods.filter(p => 
        p.period_status === 'producing' && p.production_liters > 0
      );
      
      const totalProduced = productionPeriods
        .reduce((sum, period) => sum + (period.production_liters || 0), 0);

      // Calculate production rate (liters per hour) based on recent activity
      let productionRate = 0;
      if (productionPeriods.length > 0) {
        // Get last 24 hours of production periods
        const last24Hours = productionPeriods.filter(p => 
          new Date(p.period_start).getTime() > Date.now() - 24 * 60 * 60 * 1000
        );
        
        if (last24Hours.length > 0) {
          const totalLitersLast24h = last24Hours.reduce((sum, p) => sum + p.production_liters, 0);
          const hoursSpanned = Math.max(1, last24Hours.length * 0.5); // 30-min intervals
          productionRate = totalLitersLast24h / hoursSpanned;
        }
      }

      // Get the most recent period
      const lastPeriod = recentPeriods.length > 0 ? recentPeriods[0] : null;

      const newData = {
        totalProduced: Math.round(totalProduced * 100) / 100, // Round to 2 decimal places
        productionRate: Math.round(productionRate * 100) / 100,
        lastPeriod,
        recentPeriods,
        lastUpdate: new Date()
      };

      setData(newData);
      setError(null);
      
      console.log('✅ Production summary updated:', { 
        totalProduced: newData.totalProduced, 
        productionRate: newData.productionRate,
        periodsCount: recentPeriods.length,
        productionPeriodsCount: productionPeriods.length
      });

    } catch (err) {
      console.error('❌ Error fetching production data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionData();

    // Refresh every 5 minutes to pick up new production data
    const interval = setInterval(fetchProductionData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchProductionData };
};
