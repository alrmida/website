
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

// Consistent month names for UTC formatting
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
      
      // Daily grouping (using UTC)
      const dayKey = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
      dailyProduction.set(dayKey, (dailyProduction.get(dayKey) || 0) + event.production_liters);
      
      // Weekly grouping (ISO week, using UTC)
      const weekStart = getWeekStartUTC(date);
      const weekKey = `${weekStart.getUTCDate().toString().padStart(2, '0')} ${MONTHS[weekStart.getUTCMonth()]}`;
      weeklyProduction.set(weekKey, (weeklyProduction.get(weekKey) || 0) + event.production_liters);
      
      // Monthly grouping (using UTC)
      const monthKey = `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
      monthlyProduction.set(monthKey, (monthlyProduction.get(monthKey) || 0) + event.production_liters);
      
      // Yearly grouping (using UTC)
      const yearKey = date.getUTCFullYear().toString();
      yearlyProduction.set(yearKey, (yearlyProduction.get(yearKey) || 0) + event.production_liters);
    }
  });

  // Create daily production array (last 7 days, using UTC)
  const dailyProductionData: ProductionData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayKey = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
    dailyProductionData.push({
      date: dayKey,
      production: Math.round((dailyProduction.get(dayKey) || 0) * 10) / 10
    });
  }

  // Create weekly production array (last 4 weeks, using UTC)
  const weeklyProductionData: WeeklyProductionData[] = [];
  for (let i = 3; i >= 0; i--) {
    const date = new Date(Date.now() - (i * 7) * 24 * 60 * 60 * 1000);
    const weekStart = getWeekStartUTC(date);
    const weekKey = `${weekStart.getUTCDate().toString().padStart(2, '0')} ${MONTHS[weekStart.getUTCMonth()]}`;
    weeklyProductionData.push({
      week: weekKey,
      production: Math.round((weeklyProduction.get(weekKey) || 0) * 10) / 10
    });
  }

  // Create monthly production array (last 3 months, using UTC)
  const monthlyProductionData: MonthlyProductionData[] = [];
  for (let i = 2; i >= 0; i--) {
    const now = new Date();
    const date = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    const monthKey = `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    monthlyProductionData.push({
      month: monthKey,
      production: Math.round((monthlyProduction.get(monthKey) || 0) * 10) / 10
    });
  }

  // Create yearly production array (last 2 years, using UTC)
  const yearlyProductionData: YearlyProductionData[] = [];
  for (let i = 1; i >= 0; i--) {
    const now = new Date();
    const date = new Date(now.getUTCFullYear() - i, 0, 1);
    const yearKey = date.getUTCFullYear().toString();
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

// Helper function to get the start of the week (Monday) using UTC
function getWeekStartUTC(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const result = new Date(d);
  result.setUTCDate(diff);
  return result;
}
