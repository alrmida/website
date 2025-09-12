
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
  console.log('🔥 [PRODUCTION SERVICE] *** FUNCTION CALLED *** - Machine:', machineId);
  console.log('🔥 [PRODUCTION SERVICE] *** EXECUTION STARTING *** - Timestamp:', Date.now());
  console.log('🔍 [PRODUCTION SERVICE] Fetching production data for machine:', machineId, '- FORCED EXECUTION VERSION');
  
  // First, let's check ALL events regardless of event_type to debug
  const { data: debugEvents, error: debugError } = await supabase
    .from('water_production_events')
    .select('production_liters, timestamp_utc, event_type')
    .eq('machine_id', machineId)
    .order('timestamp_utc', { ascending: false })
    .limit(10);

  console.log('🐛 [PRODUCTION SERVICE] Debug - Recent events of all types:', {
    count: debugEvents?.length || 0,
    events: debugEvents?.map(e => ({
      timestamp: e.timestamp_utc,
      production: e.production_liters,
      event_type: e.event_type,
      isPositive: e.production_liters > 0
    }))
  });

  // Fetch ALL production events (remove event_type filter to get all events)
  const { data: allProductionEvents, error: allProductionError } = await supabase
    .from('water_production_events')
    .select('production_liters, timestamp_utc, event_type')
    .eq('machine_id', machineId);

  console.log('📊 [PRODUCTION SERVICE] All production events query result:', { 
    count: allProductionEvents?.length || 0, 
    error: allProductionError,
    positiveEventsCount: allProductionEvents?.filter(e => e.production_liters > 0).length || 0,
    totalPositiveProduction: allProductionEvents?.filter(e => e.production_liters > 0).reduce((sum, e) => sum + e.production_liters, 0) || 0,
    samplePositiveEvents: allProductionEvents?.filter(e => e.production_liters > 0).slice(-3)
  });

  if (allProductionError) {
    console.error('❌ [PRODUCTION SERVICE] Error fetching all production events:', allProductionError);
    throw allProductionError;
  }

  const totalAllTimeProduction = allProductionEvents
    ?.filter(event => event.production_liters > 0)
    .reduce((sum, event) => sum + event.production_liters, 0) || 0;

  console.log('🎯 [PRODUCTION SERVICE] Total all-time production:', totalAllTimeProduction);

  // Fetch extended data (last 3 years for comprehensive coverage) - Remove event_type filter
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  console.log('📅 [PRODUCTION SERVICE] Fetching events since:', threeYearsAgo.toISOString());
  console.log('📅 [PRODUCTION SERVICE] Current date:', new Date().toISOString());

  console.log('🚀 [PRODUCTION SERVICE] About to execute recent events query...');
  
  const { data: productionEvents, error: productionError } = await supabase
    .from('water_production_events')
    .select('production_liters, timestamp_utc, event_type')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', threeYearsAgo.toISOString())
    .order('timestamp_utc', { ascending: true });

  console.log('✅ [PRODUCTION SERVICE] Query completed!');
  console.log('📊 [PRODUCTION SERVICE] Recent production events query result:', { 
    count: productionEvents?.length || 0, 
    error: productionError,
    sampleEvents: productionEvents?.slice(-3) // Show last 3 events
  });

  if (productionError) {
    console.error('❌ [PRODUCTION SERVICE] Error fetching recent production events:', productionError);
    throw productionError;
  }

  // Group production by different time periods
  const dailyProduction = new Map<string, number>();
  const weeklyProduction = new Map<string, number>();
  const monthlyProduction = new Map<string, number>();
  const yearlyProduction = new Map<string, number>();

  productionEvents?.forEach((event, index) => {
    console.log(`🔍 [PRODUCTION SERVICE] Processing event ${index}:`, {
      timestamp: event.timestamp_utc,
      production: event.production_liters,
      eventType: event.event_type,
      isPositive: event.production_liters > 0
    });

    if (event.production_liters > 0) {
      const date = new Date(event.timestamp_utc);
      
      console.log(`📅 [PRODUCTION SERVICE] Event date breakdown:`, {
        originalTimestamp: event.timestamp_utc,
        dateObject: date.toISOString(),
        utcDate: date.getUTCDate(),
        utcMonth: date.getUTCMonth(),
        utcYear: date.getUTCFullYear(),
        monthName: MONTHS[date.getUTCMonth()]
      });
      
      // Daily grouping (using UTC)
      const dayKey = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
      const previousDailyValue = dailyProduction.get(dayKey) || 0;
      const newDailyValue = previousDailyValue + event.production_liters;
      dailyProduction.set(dayKey, newDailyValue);
      
      console.log(`📊 [PRODUCTION SERVICE] Daily aggregation - Key: "${dayKey}", Previous: ${previousDailyValue}, Added: ${event.production_liters}, New Total: ${newDailyValue}`);
      
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

  console.log('🗂️ [PRODUCTION SERVICE] Daily production map after processing:', {
    mapSize: dailyProduction.size,
    allEntries: Array.from(dailyProduction.entries()),
    totalMapProduction: Array.from(dailyProduction.values()).reduce((sum, val) => sum + val, 0)
  });

  console.log('🗂️ [PRODUCTION SERVICE] Weekly production map after processing:', {
    mapSize: weeklyProduction.size,
    allEntries: Array.from(weeklyProduction.entries())
  });

  // Create daily production array (last 7 days, using UTC)
  const dailyProductionData: ProductionData[] = [];
  const today = new Date();
  console.log('📅 [PRODUCTION SERVICE] Generating daily production data for last 7 days...');
  console.log('🕐 [PRODUCTION SERVICE] Current time info:', {
    now: Date.now(),
    today: today.toISOString(),
    todayUTC: today.toUTCString(),
    todayDayKey: `${today.getUTCDate().toString().padStart(2, '0')} ${MONTHS[today.getUTCMonth()]}`
  });
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayKey = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
    const mapValue = dailyProduction.get(dayKey) || 0;
    const production = Math.round(mapValue * 10) / 10;
    
    console.log(`🔍 [PRODUCTION SERVICE] Daily lookup for day ${i} - Key: "${dayKey}", Map Value: ${mapValue}, Final Production: ${production}, Date Object: ${date.toISOString()}, UTC Date: ${date.getUTCDate()}, UTC Month: ${date.getUTCMonth()}`);
    
    dailyProductionData.push({
      date: dayKey,
      production
    });
  }
  
  console.log('✅ [PRODUCTION SERVICE] Final daily production data:', dailyProductionData);

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

  const result = {
    dailyProductionData,
    weeklyProductionData,
    monthlyProductionData,
    yearlyProductionData,
    totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
  };
  
  console.log('🚀 [PRODUCTION SERVICE] Final result:', {
    dailyPoints: result.dailyProductionData.length,
    totalProduction: result.totalAllTimeProduction,
    sampleDaily: result.dailyProductionData.slice(0, 3)
  });
  
  return result;
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
