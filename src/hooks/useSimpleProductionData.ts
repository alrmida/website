import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SimpleProductionData {
  totalProduction: number;
  dailyData: Array<{ date: string; production: number; }>;
  weeklyData: Array<{ week: string; production: number; }>;
  monthlyData: Array<{ month: string; production: number; }>;
  yearlyData: Array<{ year: string; production: number; }>;
}

export const useSimpleProductionData = (machineId: string | undefined) => {
  const [data, setData] = useState<SimpleProductionData>({
    totalProduction: 0,
    dailyData: [],
    weeklyData: [],
    monthlyData: [],
    yearlyData: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!machineId) {
      setData({
        totalProduction: 0,
        dailyData: [],
        weeklyData: [],
        monthlyData: [],
        yearlyData: []
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🚀 [SIMPLE PRODUCTION] Fetching data for machine: ${machineId}`);

      // Get all production events for this machine
      const { data: events, error: eventsError } = await supabase
        .from('water_production_events')
        .select('production_liters, timestamp_utc')
        .eq('machine_id', machineId)
        .gt('production_liters', 0)
        .order('timestamp_utc', { ascending: true });

      if (eventsError) throw eventsError;

      console.log(`📊 [SIMPLE PRODUCTION] Fetched ${events?.length || 0} events`);

      // Calculate total
      const totalProduction = events?.reduce((sum, event) => sum + Number(event.production_liters), 0) || 0;

      // Process daily data (last 30 days)
      const dailyGroups: { [key: string]: number } = {};
      const weeklyGroups: { [key: string]: number } = {};
      const monthlyGroups: { [key: string]: number } = {};
      const yearlyGroups: { [key: string]: number } = {};

      events?.forEach(event => {
        const date = new Date(event.timestamp_utc);
        const production = Number(event.production_liters);

        // Daily (format: "DD MMM")
        const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        dailyGroups[dayKey] = (dailyGroups[dayKey] || 0) + production;

        // Weekly (format: "Week of DD MMM")
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = `Week of ${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
        weeklyGroups[weekKey] = (weeklyGroups[weekKey] || 0) + production;

        // Monthly (format: "MMM YYYY")
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        monthlyGroups[monthKey] = (monthlyGroups[monthKey] || 0) + production;

        // Yearly (format: "YYYY")
        const yearKey = date.getFullYear().toString();
        yearlyGroups[yearKey] = (yearlyGroups[yearKey] || 0) + production;
      });

      // Convert to arrays and get recent data
      const dailyData = Object.entries(dailyGroups)
        .map(([date, production]) => ({ date, production }))
        .slice(-30); // Last 30 days

      const weeklyData = Object.entries(weeklyGroups)
        .map(([week, production]) => ({ week, production }))
        .slice(-12); // Last 12 weeks

      const monthlyData = Object.entries(monthlyGroups)
        .map(([month, production]) => ({ month, production }))
        .slice(-12); // Last 12 months

      const yearlyData = Object.entries(yearlyGroups)
        .map(([year, production]) => ({ year, production }));

      console.log(`✅ [SIMPLE PRODUCTION] Results:`, {
        machineId,
        totalProduction,
        dailyPoints: dailyData.length,
        weeklyPoints: weeklyData.length,
        monthlyPoints: monthlyData.length,
        yearlyPoints: yearlyData.length
      });

      setData({
        totalProduction,
        dailyData,
        weeklyData,
        monthlyData,
        yearlyData
      });

    } catch (err) {
      console.error('❌ [SIMPLE PRODUCTION] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [machineId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [machineId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
};