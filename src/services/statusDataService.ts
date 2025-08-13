
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
    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

    console.log('📅 [STATUS SERVICE] Date ranges:', {
      machineId,
      sevenDaysAgo: sevenDaysAgo.toISOString(),
      fourWeeksAgo: fourWeeksAgo.toISOString(),
      threeMonthsAgo: threeMonthsAgo.toISOString(),
      twoYearsAgo: twoYearsAgo.toISOString()
    });

    // Fetch daily status data (last 7 days)
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

    // Enhanced data validation and processing
    const dailyRecords = dailyResult.data || [];
    console.log(`📊 [STATUS SERVICE] Processing ${dailyRecords.length} daily records for machine ${machineId}`);
    
    if (dailyRecords.length === 0) {
      console.warn(`⚠️ [STATUS SERVICE] No daily records found for machine ${machineId}. Checking if machine exists...`);
      
      // Check if machine exists in the database
      const machineCheck = await supabase
        .from('machines')
        .select('machine_id, name')
        .eq('machine_id', machineId)
        .single();
      
      if (machineCheck.error || !machineCheck.data) {
        console.error(`❌ [STATUS SERVICE] Machine ${machineId} not found in database:`, machineCheck.error);
      } else {
        console.log(`✅ [STATUS SERVICE] Machine ${machineId} exists:`, machineCheck.data);
        console.log(`⚠️ [STATUS SERVICE] Machine exists but has no raw_machine_data records in the last 7 days`);
      }
    }

    // Group daily data by date with enhanced debugging
    const dailyGroups = dailyRecords.reduce((acc: Record<string, any[]>, record) => {
      const date = new Date(record.timestamp_utc).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {});

    console.log(`📊 [STATUS SERVICE] Daily groups for machine ${machineId}:`, {
      totalDays: Object.keys(dailyGroups).length,
      dates: Object.keys(dailyGroups),
      recordCounts: Object.entries(dailyGroups).map(([date, records]) => ({ date, count: records.length }))
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
      
      console.log(`📈 [STATUS SERVICE] Day ${dateStr} for machine ${machineId}:`, {
        recordCount: dayRecords.length,
        percentages,
        sampleRecord: dayRecords[0] || 'No records'
      });

      statusData.push({
        date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...percentages
      });
    }

    // Fetch weekly data (last 4 weeks) with similar debugging
    const weeklyQuery = supabase
      .from('raw_machine_data')
      .select('timestamp_utc, producing_water, compressor_on, full_tank')
      .eq('machine_id', machineId)
      .gte('timestamp_utc', fourWeeksAgo.toISOString())
      .order('timestamp_utc', { ascending: false });

    const weeklyResult = await weeklyQuery;
    debugStatusQuery(machineId, 'Weekly Status Query', weeklyQuery, weeklyResult);

    // Process weekly data with enhanced validation
    const weeklyRecords = weeklyResult.data || [];
    console.log(`📊 [STATUS SERVICE] Processing ${weeklyRecords.length} weekly records for machine ${machineId}`);

    // Group by weeks
    const weeklyGroups = weeklyRecords.reduce((acc: Record<string, any[]>, record) => {
      const date = new Date(record.timestamp_utc);
      const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = startOfWeek.toISOString().split('T')[0];
      
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(record);
      return acc;
    }, {});

    const weeklyStatusData: WeeklyStatusData[] = [];
    const last4Weeks = Array.from({ length: 4 }, (_, i) => {
      const date = new Date(now.getTime() - (i * 7) * 24 * 60 * 60 * 1000);
      const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      return startOfWeek.toISOString().split('T')[0];
    }).reverse();

    for (const weekStart of last4Weeks) {
      const weekRecords = weeklyGroups[weekStart] || [];
      const percentages = calculateStatusPercentagesForDay(weekRecords);
      
      console.log(`📈 [STATUS SERVICE] Week ${weekStart} for machine ${machineId}:`, {
        recordCount: weekRecords.length,
        percentages
      });

      weeklyStatusData.push({
        week: new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...percentages
      });
    }

    // Fetch monthly data (last 3 months)
    const monthlyQuery = supabase
      .from('raw_machine_data')
      .select('timestamp_utc, producing_water, compressor_on, full_tank')
      .eq('machine_id', machineId)
      .gte('timestamp_utc', threeMonthsAgo.toISOString())
      .order('timestamp_utc', { ascending: false });

    const monthlyResult = await monthlyQuery;
    debugStatusQuery(machineId, 'Monthly Status Query', monthlyQuery, monthlyResult);

    // Process monthly data
    const monthlyRecords = monthlyResult.data || [];
    const monthlyGroups = monthlyRecords.reduce((acc: Record<string, any[]>, record) => {
      const date = new Date(record.timestamp_utc);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(record);
      return acc;
    }, {});

    const monthlyStatusData: MonthlyStatusData[] = [];
    const last3Months = Array.from({ length: 3 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }).reverse();

    for (const monthKey of last3Months) {
      const monthRecords = monthlyGroups[monthKey] || [];
      const percentages = calculateStatusPercentagesForDay(monthRecords);
      
      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      monthlyStatusData.push({
        month: monthName,
        ...percentages
      });
    }

    // Fetch yearly data (last 2 years)
    const yearlyQuery = supabase
      .from('raw_machine_data')
      .select('timestamp_utc, producing_water, compressor_on, full_tank')
      .eq('machine_id', machineId)
      .gte('timestamp_utc', twoYearsAgo.toISOString())
      .order('timestamp_utc', { ascending: false });

    const yearlyResult = await yearlyQuery;
    debugStatusQuery(machineId, 'Yearly Status Query', yearlyQuery, yearlyResult);

    // Process yearly data
    const yearlyRecords = yearlyResult.data || [];
    const yearlyGroups = yearlyRecords.reduce((acc: Record<string, any[]>, record) => {
      const year = new Date(record.timestamp_utc).getFullYear().toString();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(record);
      return acc;
    }, {});

    const yearlyStatusData: YearlyStatusData[] = [];
    const last2Years = [now.getFullYear() - 1, now.getFullYear()];

    for (const year of last2Years) {
      const yearRecords = yearlyGroups[year.toString()] || [];
      const percentages = calculateStatusPercentagesForDay(yearRecords);
      
      yearlyStatusData.push({
        year: year.toString(),
        ...percentages
      });
    }

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
      totalDailyRecords: dailyRecords.length,
      totalWeeklyRecords: weeklyRecords.length,
      totalMonthlyRecords: monthlyRecords.length,
      totalYearlyRecords: yearlyRecords.length
    });

    return result;

  } catch (error) {
    console.error('❌ [STATUS SERVICE] Error fetching status data for machine', machineId, ':', error);
    
    // Return safe fallback data
    const fallbackData = {
      statusData: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        producing: 0,
        idle: 0,
        fullWater: 0,
        disconnected: 100
      })).reverse(),
      weeklyStatusData: Array.from({ length: 4 }, (_, i) => ({
        week: new Date(Date.now() - (i * 7) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        producing: 0,
        idle: 0,
        fullWater: 0,
        disconnected: 100
      })).reverse(),
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
      yearlyStatusData: [
        { year: (new Date().getFullYear() - 1).toString(), producing: 0, idle: 0, fullWater: 0, disconnected: 100 },
        { year: new Date().getFullYear().toString(), producing: 0, idle: 0, fullWater: 0, disconnected: 100 }
      ]
    };

    console.log('🔄 [STATUS SERVICE] Returning fallback data due to error');
    return fallbackData;
  }
};
