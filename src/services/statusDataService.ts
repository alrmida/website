
import { supabase } from '@/integrations/supabase/client';
import { calculateStatusPercentagesForDay } from '@/utils/statusCalculations';

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

// Fetch daily status data (last 7 days)
const fetchDailyStatusData = async (machineId: string) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log('📅 [STATUS SERVICE] Fetching daily status data (last 7 days):', {
    machineId,
    sevenDaysAgo: sevenDaysAgo.toISOString(),
    now: now.toISOString()
  });

  const dailyQuery = supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, compressor_on, full_tank')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', sevenDaysAgo.toISOString())
    .order('timestamp_utc', { ascending: false });

  const dailyResult = await dailyQuery;
  debugStatusQuery(machineId, 'Daily Status Query', dailyQuery, dailyResult);

  if (dailyResult.error) {
    console.error('❌ [STATUS SERVICE] Daily query error:', dailyResult.error);
    throw new Error(`Daily status query failed: ${dailyResult.error.message}`);
  }

  const dailyRecords = dailyResult.data || [];
  console.log(`📊 [STATUS SERVICE] Processing ${dailyRecords.length} daily records for machine ${machineId}`);

  // Group daily data by date
  const dailyGroups = dailyRecords.reduce((acc: Record<string, any[]>, record) => {
    const date = new Date(record.timestamp_utc).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {});

  console.log(`📊 [STATUS SERVICE] Daily groups:`, {
    totalDays: Object.keys(dailyGroups).length,
    dates: Object.keys(dailyGroups)
  });

  // Calculate status percentages for each day
  const statusData: StatusData[] = [];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }).reverse();

  for (const dateStr of last7Days) {
    const dayRecords = dailyGroups[dateStr] || [];
    const percentages = calculateStatusPercentagesForDay(dayRecords);
    
    statusData.push({
      date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...percentages
    });
  }

  return statusData;
};

// Fetch weekly status data (last 4 weeks)
const fetchWeeklyStatusData = async (machineId: string) => {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  console.log('📅 [STATUS SERVICE] Fetching weekly status data (last 28 days):', {
    machineId,
    fourWeeksAgo: fourWeeksAgo.toISOString(),
    now: now.toISOString()
  });

  const weeklyQuery = supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, compressor_on, full_tank')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', fourWeeksAgo.toISOString())
    .order('timestamp_utc', { ascending: false });

  const weeklyResult = await weeklyQuery;
  debugStatusQuery(machineId, 'Weekly Status Query', weeklyQuery, weeklyResult);

  if (weeklyResult.error) {
    console.error('❌ [STATUS SERVICE] Weekly query error:', weeklyResult.error);
    throw new Error(`Weekly status query failed: ${weeklyResult.error.message}`);
  }

  const weeklyRecords = weeklyResult.data || [];
  console.log(`📊 [STATUS SERVICE] Processing ${weeklyRecords.length} weekly records for machine ${machineId}`);

  // Group by week
  const weeklyGroups: Record<string, any[]> = {};
  
  weeklyRecords.forEach(record => {
    const date = new Date(record.timestamp_utc);
    // Get start of week (Sunday)
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekKey = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!weeklyGroups[weekKey]) {
      weeklyGroups[weekKey] = [];
    }
    weeklyGroups[weekKey].push(record);
  });

  // Calculate weekly averages for last 4 weeks
  const weeklyStatusData: WeeklyStatusData[] = [];
  const last4Weeks = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (i * 7) * 24 * 60 * 60 * 1000);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }).reverse();

  for (const weekKey of last4Weeks) {
    const weekRecords = weeklyGroups[weekKey] || [];
    const percentages = calculateStatusPercentagesForDay(weekRecords);
    
    weeklyStatusData.push({
      week: weekKey,
      ...percentages
    });
  }

  return weeklyStatusData;
};

// Fetch monthly status data (last 3 months)
const fetchMonthlyStatusData = async (machineId: string) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  console.log('📅 [STATUS SERVICE] Fetching monthly status data (last 90 days):', {
    machineId,
    threeMonthsAgo: threeMonthsAgo.toISOString(),
    now: now.toISOString()
  });

  const monthlyQuery = supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, compressor_on, full_tank')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', threeMonthsAgo.toISOString())
    .order('timestamp_utc', { ascending: false });

  const monthlyResult = await monthlyQuery;
  debugStatusQuery(machineId, 'Monthly Status Query', monthlyQuery, monthlyResult);

  if (monthlyResult.error) {
    console.error('❌ [STATUS SERVICE] Monthly query error:', monthlyResult.error);
    throw new Error(`Monthly status query failed: ${monthlyResult.error.message}`);
  }

  const monthlyRecords = monthlyResult.data || [];
  console.log(`📊 [STATUS SERVICE] Processing ${monthlyRecords.length} monthly records for machine ${machineId}`);

  // Group by month
  const monthlyGroups: Record<string, any[]> = {};
  
  monthlyRecords.forEach(record => {
    const date = new Date(record.timestamp_utc);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = [];
    }
    monthlyGroups[monthKey].push(record);
  });

  // Calculate monthly averages for last 3 months
  const monthlyStatusData: MonthlyStatusData[] = [];
  const last3Months = Array.from({ length: 3 }, (_, i) => {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    return monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }).reverse();

  for (const monthKey of last3Months) {
    const monthRecords = monthlyGroups[monthKey] || [];
    const percentages = calculateStatusPercentagesForDay(monthRecords);
    
    monthlyStatusData.push({
      month: monthKey,
      ...percentages
    });
  }

  return monthlyStatusData;
};

// Fetch yearly status data (last 2 years)
const fetchYearlyStatusData = async (machineId: string) => {
  const now = new Date();
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

  console.log('📅 [STATUS SERVICE] Fetching yearly status data (last 730 days):', {
    machineId,
    twoYearsAgo: twoYearsAgo.toISOString(),
    now: now.toISOString()
  });

  const yearlyQuery = supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, compressor_on, full_tank')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', twoYearsAgo.toISOString())
    .order('timestamp_utc', { ascending: false });

  const yearlyResult = await yearlyQuery;
  debugStatusQuery(machineId, 'Yearly Status Query', yearlyQuery, yearlyResult);

  if (yearlyResult.error) {
    console.error('❌ [STATUS SERVICE] Yearly query error:', yearlyResult.error);
    throw new Error(`Yearly status query failed: ${yearlyResult.error.message}`);
  }

  const yearlyRecords = yearlyResult.data || [];
  console.log(`📊 [STATUS SERVICE] Processing ${yearlyRecords.length} yearly records for machine ${machineId}`);

  // Group by year
  const yearlyGroups: Record<string, any[]> = {};
  
  yearlyRecords.forEach(record => {
    const date = new Date(record.timestamp_utc);
    const yearKey = date.getFullYear().toString();
    
    if (!yearlyGroups[yearKey]) {
      yearlyGroups[yearKey] = [];
    }
    yearlyGroups[yearKey].push(record);
  });

  // Calculate yearly averages for last 2 years
  const yearlyStatusData: YearlyStatusData[] = [];
  const last2Years = Array.from({ length: 2 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  }).reverse();

  for (const yearKey of last2Years) {
    const yearRecords = yearlyGroups[yearKey] || [];
    const percentages = calculateStatusPercentagesForDay(yearRecords);
    
    yearlyStatusData.push({
      year: yearKey,
      ...percentages
    });
  }

  return yearlyStatusData;
};

export const fetchStatusData = async (machineId: string) => {
  console.log('🚀 [STATUS SERVICE] Starting fetchStatusData for machine:', machineId);
  
  if (!machineId || machineId.trim() === '') {
    console.error('❌ [STATUS SERVICE] Invalid machine ID provided:', machineId);
    return {
      statusData: [],
      weeklyStatusData: [],
      monthlyStatusData: [],
      yearlyStatusData: []
    };
  }

  try {
    console.log('📡 [STATUS SERVICE] Fetching status data for all time periods...');
    
    // Fetch all time periods independently with appropriate data ranges
    const [statusData, weeklyStatusData, monthlyStatusData, yearlyStatusData] = await Promise.all([
      fetchDailyStatusData(machineId),
      fetchWeeklyStatusData(machineId),
      fetchMonthlyStatusData(machineId),
      fetchYearlyStatusData(machineId)
    ]);

    const result = {
      statusData,
      weeklyStatusData,
      monthlyStatusData,
      yearlyStatusData
    };

    console.log('✅ [STATUS SERVICE] Final status data summary for machine', machineId, ':', {
      dailyPoints: statusData.length,
      weeklyPoints: weeklyStatusData.length,
      monthlyPoints: monthlyStatusData.length,
      yearlyPoints: yearlyStatusData.length,
      sampleDaily: statusData[0] || 'No daily data',
      sampleWeekly: weeklyStatusData[0] || 'No weekly data',
      sampleMonthly: monthlyStatusData[0] || 'No monthly data',
      sampleYearly: yearlyStatusData[0] || 'No yearly data'
    });

    return result;

  } catch (error) {
    console.error('❌ [STATUS SERVICE] Error fetching status data for machine', machineId, ':', error);
    
    // Return safe fallback data with correct time periods
    const now = new Date();
    
    const fallbackData = {
      statusData: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        producing: 0,
        idle: 0,
        fullWater: 0,
        disconnected: 100
      })).reverse(),
      
      weeklyStatusData: Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date(now.getTime() - (i * 7) * 24 * 60 * 60 * 1000);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return {
          week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          producing: 0,
          idle: 0,
          fullWater: 0,
          disconnected: 100
        };
      }).reverse(),
      
      monthlyStatusData: Array.from({ length: 3 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          producing: 0,
          idle: 0,
          fullWater: 0,
          disconnected: 100
        };
      }).reverse(),
      
      yearlyStatusData: Array.from({ length: 2 }, (_, i) => ({
        year: (new Date().getFullYear() - i).toString(),
        producing: 0,
        idle: 0,
        fullWater: 0,
        disconnected: 100
      })).reverse()
    };

    console.log('🔄 [STATUS SERVICE] Returning fallback data due to error');
    return fallbackData;
  }
};
