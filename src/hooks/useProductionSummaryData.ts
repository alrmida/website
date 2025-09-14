import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Interface for production summary data
interface ProductionSummaryPoint {
  date: string;
  production: number;
  events_count: number;
  producing_percentage: number;
  idle_percentage: number;
  full_water_percentage: number;
  disconnected_percentage: number;
}

interface WeeklyProductionSummaryPoint {
  week: string;
  production: number;
  events_count: number;
  producing_percentage: number;
  idle_percentage: number;
  full_water_percentage: number;
  disconnected_percentage: number;
}

interface MonthlyProductionSummaryPoint {
  month: string;
  production: number;
  events_count: number;
  producing_percentage: number;
  idle_percentage: number;
  full_water_percentage: number;
  disconnected_percentage: number;
}

interface YearlyProductionSummaryPoint {
  year: string;
  production: number;
  events_count: number;
  producing_percentage: number;
  idle_percentage: number;
  full_water_percentage: number;
  disconnected_percentage: number;
}

interface ProductionSummaryData {
  dailyData: ProductionSummaryPoint[];
  weeklyData: WeeklyProductionSummaryPoint[];
  monthlyData: MonthlyProductionSummaryPoint[];
  yearlyData: YearlyProductionSummaryPoint[];
  totalProduction: number;
  lastUpdated: Date | null;
}

export const useProductionSummaryData = (machineId?: string) => {
  const [data, setData] = useState<ProductionSummaryData>({
    dailyData: [],
    weeklyData: [],
    monthlyData: [],
    yearlyData: [],
    totalProduction: 0,
    lastUpdated: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaryData = useCallback(async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📊 Fetching production summary data for machine:', machineId);

      // Fetch all summary data in parallel
      const [dailyResult, weeklyResult, monthlyResult, yearlyResult, totalResult] = await Promise.all([
        // Daily data - last 30 days
        supabase
          .from('daily_production_summary')
          .select('*')
          .eq('machine_id', machineId)
          .order('date', { ascending: false })
          .limit(30),
        
        // Weekly data - last 12 weeks
        supabase
          .from('weekly_production_summary')
          .select('*')
          .eq('machine_id', machineId)
          .order('week_start', { ascending: false })
          .limit(12),
        
        // Monthly data - last 12 months
        supabase
          .from('monthly_production_summary')
          .select('*')
          .eq('machine_id', machineId)
          .order('month_year', { ascending: false })
          .limit(12),
        
        // Yearly data - last 5 years
        supabase
          .from('yearly_production_summary')
          .select('*')
          .eq('machine_id', machineId)
          .order('year', { ascending: false })
          .limit(5),
        
        // Total production
        supabase
          .from('machine_production_totals')
          .select('*')
          .eq('machine_id', machineId)
          .single()
      ]);

      // Check for errors
      if (dailyResult.error) throw dailyResult.error;
      if (weeklyResult.error) throw weeklyResult.error;
      if (monthlyResult.error) throw monthlyResult.error;
      if (yearlyResult.error) throw yearlyResult.error;
      if (totalResult.error && totalResult.error.code !== 'PGRST116') throw totalResult.error;

      // Transform daily data
      const dailyData: ProductionSummaryPoint[] = (dailyResult.data || [])
        .reverse() // Show chronologically
        .map(item => ({
          date: item.date,
          production: Number(item.total_production_liters),
          events_count: item.production_events_count,
          producing_percentage: Number(item.producing_percentage),
          idle_percentage: Number(item.idle_percentage),
          full_water_percentage: Number(item.full_water_percentage),
          disconnected_percentage: Number(item.disconnected_percentage)
        }));

      // Transform weekly data
      const weeklyData: WeeklyProductionSummaryPoint[] = (weeklyResult.data || [])
        .reverse() // Show chronologically
        .map(item => ({
          week: `Week ${item.week_number}/${item.week_year}`,
          production: Number(item.total_production_liters),
          events_count: item.production_events_count,
          producing_percentage: Number(item.producing_percentage),
          idle_percentage: Number(item.idle_percentage),
          full_water_percentage: Number(item.full_water_percentage),
          disconnected_percentage: Number(item.disconnected_percentage)
        }));

      // Transform monthly data
      const monthlyData: MonthlyProductionSummaryPoint[] = (monthlyResult.data || [])
        .reverse() // Show chronologically
        .map(item => {
          const date = new Date(item.month_year);
          const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          return {
            month: monthName,
            production: Number(item.total_production_liters),
            events_count: item.production_events_count,
            producing_percentage: Number(item.producing_percentage),
            idle_percentage: Number(item.idle_percentage),
            full_water_percentage: Number(item.full_water_percentage),
            disconnected_percentage: Number(item.disconnected_percentage)
          };
        });

      // Transform yearly data
      const yearlyData: YearlyProductionSummaryPoint[] = (yearlyResult.data || [])
        .reverse() // Show chronologically
        .map(item => ({
          year: item.year.toString(),
          production: Number(item.total_production_liters),
          events_count: item.production_events_count,
          producing_percentage: Number(item.producing_percentage),
          idle_percentage: Number(item.idle_percentage),
          full_water_percentage: Number(item.full_water_percentage),
          disconnected_percentage: Number(item.disconnected_percentage)
        }));

      const summaryData: ProductionSummaryData = {
        dailyData,
        weeklyData,
        monthlyData,
        yearlyData,
        totalProduction: totalResult.data ? Number(totalResult.data.total_production_liters) : 0,
        lastUpdated: totalResult.data ? new Date(totalResult.data.last_updated) : null
      };

      setData(summaryData);
      setError(null);

      console.log('✅ Production summary data loaded successfully:', {
        daily: dailyData.length,
        weekly: weeklyData.length,  
        monthly: monthlyData.length,
        yearly: yearlyData.length,
        total: summaryData.totalProduction
      });

    } catch (err) {
      console.error('❌ Error fetching production summary data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [machineId]);

  // Trigger initial data load when machine changes
  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSummaryData
  };
};