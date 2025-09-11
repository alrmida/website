
import { supabase } from '@/integrations/supabase/client';
import { calculateStatusPercentagesForDay } from '@/utils/statusCalculations';
import { 
  aggregateDailyToWeekly, 
  aggregateWeeklyToMonthly, 
  aggregateMonthlyToYearly,
  generateTimePeriodLabels,
  DailyStatusPoint
} from '@/utils/statusAggregation';

// Consistent month names for UTC formatting
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface StatusData {
  date: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface WeeklyStatusData {
  week: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface MonthlyStatusData {
  month: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface YearlyStatusData {
  year: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

// Enhanced debugging for status data fetching
const debugStatusQuery = (machineId: string, queryType: string, query: any, result: any) => {
  console.log(`🔍 [STATUS DEBUG] ${queryType} for machine ${machineId}:`);
  console.log('   - Query params:', { machineId });
  console.log('   - Records returned:', result?.data?.length || 0);
  console.log('   - Sample record:', result?.data?.[0] || 'No records');
  if (result?.error) {
    console.error('   - Query error:', result.error);
  }
};

// Fetch raw machine data for a given time period
const fetchRawMachineData = async (machineId: string, daysBack: number) => {
  const now = new Date();
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  console.log(`📅 [STATUS SERVICE] Fetching raw data for last ${daysBack} days:`, {
    machineId,
    startDate: startDate.toISOString(),
    now: now.toISOString()
  });

  const query = supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, compressor_on, full_tank')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', startDate.toISOString())
    .order('timestamp_utc', { ascending: false });

  const result = await query;
  debugStatusQuery(machineId, `Raw Data Query (${daysBack} days)`, query, result);

  if (result.error) {
    console.error(`❌ [STATUS SERVICE] Raw data query error (${daysBack} days):`, result.error);
    throw new Error(`Raw data query failed: ${result.error.message}`);
  }

  return result.data || [];
};

// Calculate daily status points for the last N days
const calculateDailyStatusPoints = (rawRecords: any[], daysBack: number): DailyStatusPoint[] => {
  console.log(`📊 [STATUS SERVICE] Calculating daily status points for ${daysBack} days from ${rawRecords.length} records`);

  const now = new Date();
  const dailyGroups: Record<string, any[]> = {};

  // Initialize all days with empty arrays
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    dailyGroups[dateKey] = [];
  }

  // Group records by date
  rawRecords.forEach(record => {
    const date = new Date(record.timestamp_utc).toISOString().split('T')[0];
    if (dailyGroups[date] !== undefined) {
      dailyGroups[date].push(record);
    }
  });

  console.log(`📊 [STATUS SERVICE] Daily groups:`, {
    totalDays: Object.keys(dailyGroups).length,
    datesWithData: Object.entries(dailyGroups).filter(([_, records]) => records.length > 0).length,
    sampleGroups: Object.entries(dailyGroups).slice(0, 3).map(([date, records]) => ({
      date,
      recordCount: records.length
    }))
  });

  // Calculate status for each day
  const dailyStatusPoints: DailyStatusPoint[] = [];
  const sortedDates = Object.keys(dailyGroups).sort();

  for (const dateKey of sortedDates) {
    const dayRecords = dailyGroups[dateKey];
    const percentages = calculateStatusPercentagesForDay(dayRecords);
    
    const date = new Date(dateKey);
    const displayDate = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
    
    dailyStatusPoints.push({
      date: displayDate,
      ...percentages
    });
  }

  // Sort by actual date to ensure chronological order
  dailyStatusPoints.sort((a, b) => {
    const dateA = new Date(a.date + ', ' + new Date().getFullYear());
    const dateB = new Date(b.date + ', ' + new Date().getFullYear());
    return dateA.getTime() - dateB.getTime();
  });

  console.log(`✅ [STATUS SERVICE] Generated ${dailyStatusPoints.length} daily status points:`, {
    first: dailyStatusPoints[0],
    last: dailyStatusPoints[dailyStatusPoints.length - 1],
    sampleWithDisconnected: dailyStatusPoints.find(p => p.disconnected > 0)
  });

  return dailyStatusPoints;
};

export const fetchStatusData = async (machineId: string) => {
  console.log('🚀 [STATUS SERVICE] Starting hierarchical status data fetch for machine:', machineId);
  
  if (!machineId || machineId.trim() === '') {
    console.error('❌ [STATUS SERVICE] Invalid machine ID provided:', machineId);
    const { dailyLabels, weeklyLabels, monthlyLabels, yearlyLabels } = generateTimePeriodLabels();
    
    return {
      statusData: dailyLabels.map(date => ({ date, producing: 0, idle: 0, fullWater: 0, disconnected: 100 })),
      weeklyStatusData: weeklyLabels.map(week => ({ week, producing: 0, idle: 0, fullWater: 0, disconnected: 100 })),
      monthlyStatusData: monthlyLabels.map(month => ({ month, producing: 0, idle: 0, fullWater: 0, disconnected: 100 })),
      yearlyStatusData: yearlyLabels.map(year => ({ year, producing: 0, idle: 0, fullWater: 0, disconnected: 100 }))
    };
  }

  try {
    console.log('📡 [STATUS SERVICE] Implementing hierarchical aggregation approach...');
    
    // Phase 1: Fetch sufficient raw data (90 days to cover monthly needs)
    const rawRecords = await fetchRawMachineData(machineId, 90);
    
    // Phase 2: Calculate daily status points for last 30 days (to have enough for weekly aggregation)
    const allDailyPoints = calculateDailyStatusPoints(rawRecords, 30);
    
    // Phase 3: Extract the last 7 days for daily view
    const dailyStatusPoints = allDailyPoints.slice(-7);
    
    // Phase 4: Aggregate daily to weekly (last 4 weeks from the daily data)
    const weeklyStatusPoints = aggregateDailyToWeekly(allDailyPoints);
    const lastFourWeeks = weeklyStatusPoints.slice(-4);
    
    // Phase 5: Aggregate weekly to monthly (last 3 months)
    const monthlyStatusPoints = aggregateWeeklyToMonthly(weeklyStatusPoints);
    const lastThreeMonths = monthlyStatusPoints.slice(-3);
    
    // Phase 6: Aggregate monthly to yearly (last 2 years)
    const yearlyStatusPoints = aggregateMonthlyToYearly(monthlyStatusPoints);
    const lastTwoYears = yearlyStatusPoints.slice(-2);

    // Ensure we have the right number of time periods
    const { dailyLabels, weeklyLabels, monthlyLabels, yearlyLabels } = generateTimePeriodLabels();
    
    // Fill missing periods with disconnected status
    const fillMissingPeriods = (actual: any[], expected: string[], keyField: string) => {
      const result = [...actual];
      
      while (result.length < expected.length) {
        const missingLabel = expected[expected.length - result.length - 1];
        result.unshift({
          [keyField]: missingLabel,
          producing: 0,
          idle: 0,
          fullWater: 0,
          disconnected: 100
        });
      }
      
      return result.slice(-expected.length);
    };

    const statusData = fillMissingPeriods(dailyStatusPoints, dailyLabels, 'date');
    const weeklyStatusData = fillMissingPeriods(lastFourWeeks, weeklyLabels, 'week');
    const monthlyStatusData = fillMissingPeriods(lastThreeMonths, monthlyLabels, 'month');
    const yearlyStatusData = fillMissingPeriods(lastTwoYears, yearlyLabels, 'year');

    const result = {
      statusData,
      weeklyStatusData,
      monthlyStatusData,
      yearlyStatusData
    };

    console.log('✅ [STATUS SERVICE] Hierarchical aggregation complete for machine', machineId, ':', {
      dailyPoints: statusData.length,
      weeklyPoints: weeklyStatusData.length,
      monthlyPoints: monthlyStatusData.length,
      yearlyPoints: yearlyStatusData.length,
      sampleDaily: statusData.find(d => d.disconnected > 0) || statusData[0] || 'No daily data',
      sampleWeekly: weeklyStatusData.find(w => w.disconnected > 0) || weeklyStatusData[0] || 'No weekly data',
      sampleMonthly: monthlyStatusData.find(m => m.disconnected > 0) || monthlyStatusData[0] || 'No monthly data',
      sampleYearly: yearlyStatusData.find(y => y.disconnected > 0) || yearlyStatusData[0] || 'No yearly data'
    });

    return result;

  } catch (error) {
    console.error('❌ [STATUS SERVICE] Error in hierarchical status aggregation for machine', machineId, ':', error);
    
    // Return safe fallback data
    const { dailyLabels, weeklyLabels, monthlyLabels, yearlyLabels } = generateTimePeriodLabels();
    
    const fallbackData = {
      statusData: dailyLabels.map(date => ({ date, producing: 0, idle: 0, fullWater: 0, disconnected: 100 })),
      weeklyStatusData: weeklyLabels.map(week => ({ week, producing: 0, idle: 0, fullWater: 0, disconnected: 100 })),
      monthlyStatusData: monthlyLabels.map(month => ({ month, producing: 0, idle: 0, fullWater: 0, disconnected: 100 })),
      yearlyStatusData: yearlyLabels.map(year => ({ year, producing: 0, idle: 0, fullWater: 0, disconnected: 100 }))
    };

    console.log('🔄 [STATUS SERVICE] Returning fallback data due to error');
    return fallbackData;
  }
};
