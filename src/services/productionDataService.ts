
import { supabase } from '@/integrations/supabase/client';
import { ProductionData, MonthlyProductionData } from '@/types/productionAnalytics';

interface WeeklyProductionData {
  week: string;
  production: number;
}

interface YearlyProductionData {
  year: string;
  production: number;
}

export const fetchProductionData = async (machineId: string) => {
  // Fetch ALL production events for total calculation
  const { data: allProductionEvents, error: allProductionError } = await supabase
    .from('water_production_events')
    .select('production_liters, timestamp_utc, event_type')
    .eq('machine_id', machineId)
    .eq('event_type', 'production');

  if (allProductionError) {
    throw allProductionError;
  }

  const totalAllTimeProduction = allProductionEvents
    ?.filter(event => event.production_liters > 0)
    .reduce((sum, event) => sum + event.production_liters, 0) || 0;

  // Fetch extended data (last 2 years for comprehensive coverage)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data: productionEvents, error: productionError } = await supabase
    .from('water_production_events')
    .select('production_liters, timestamp_utc, event_type')
    .eq('machine_id', machineId)
    .eq('event_type', 'production')
    .gte('timestamp_utc', twoYearsAgo.toISOString())
    .order('timestamp_utc', { ascending: true });

  if (productionError) {
    throw productionError;
  }

  // Group production by different time periods
  const dailyProduction = new Map<string, number>();
  const weeklyProduction = new Map<string, number>();
  const monthlyProduction = new Map<string, number>();
  const yearlyProduction = new Map<string, number>();

  productionEvents?.forEach(event => {
    if (event.production_liters > 0) {
      const date = new Date(event.timestamp_utc);
      
      // Daily grouping
      const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      dailyProduction.set(dayKey, (dailyProduction.get(dayKey) || 0) + event.production_liters);
      
      // Weekly grouping (ISO week)
      const weekStart = getWeekStart(date);
      const weekKey = `${weekStart.getDate().toString().padStart(2, '0')} ${weekStart.toLocaleDateString('en-GB', { month: 'short' })}`;
      weeklyProduction.set(weekKey, (weeklyProduction.get(weekKey) || 0) + event.production_liters);
      
      // Monthly grouping
      const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      monthlyProduction.set(monthKey, (monthlyProduction.get(monthKey) || 0) + event.production_liters);
      
      // Yearly grouping
      const yearKey = date.getFullYear().toString();
      yearlyProduction.set(yearKey, (yearlyProduction.get(yearKey) || 0) + event.production_liters);
    }
  });

  // Create daily production array (last 7 days)
  const dailyProductionData: ProductionData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    dailyProductionData.push({
      date: dayKey,
      production: Math.round((dailyProduction.get(dayKey) || 0) * 10) / 10
    });
  }

  // Create weekly production array (last 4 weeks)
  const weeklyProductionData: WeeklyProductionData[] = [];
  for (let i = 3; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 7));
    const weekStart = getWeekStart(date);
    const weekKey = `${weekStart.getDate().toString().padStart(2, '0')} ${weekStart.toLocaleDateString('en-GB', { month: 'short' })}`;
    weeklyProductionData.push({
      week: weekKey,
      production: Math.round((weeklyProduction.get(weekKey) || 0) * 10) / 10
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

  // Create yearly production array (last 2 years)
  const yearlyProductionData: YearlyProductionData[] = [];
  for (let i = 1; i >= 0; i--) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - i);
    const yearKey = date.getFullYear().toString();
    yearlyProductionData.push({
      year: yearKey,
      production: Math.round((yearlyProduction.get(yearKey) || 0) * 10) / 10
    });
  }

  return {
    dailyProductionData,
    weeklyProductionData,
    monthlyProductionData,
    yearlyProductionData,
    totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
  };
};

// Helper function to get the start of the week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}
