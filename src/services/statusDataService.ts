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

// Fetch raw machine data for a given time period (fallback only)
const fetchRawMachineData = async (machineId: string, daysBack: number) => {
  const now = new Date();
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  console.log(`📅 [STATUS SERVICE] Fetching raw data fallback for last ${daysBack} days:`, {
    machineId,
    startDate: startDate.toISOString(),
    now: now.toISOString()
  });

  const { data, error } = await supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, compressor_on, full_tank')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', startDate.toISOString())
    .order('timestamp_utc', { ascending: false });

  if (error) {
    console.error(`❌ [STATUS SERVICE] Raw data query error (${daysBack} days):`, error);
    throw new Error(`Raw data query failed: ${error.message}`);
  }

  return data || [];
};

// Calculate daily status points for the last N days (fallback only)
const calculateDailyStatusPoints = (rawRecords: any[], daysBack: number): DailyStatusPoint[] => {
  console.log(`📊 [STATUS SERVICE] Calculating daily status points (fallback) for ${daysBack} days from ${rawRecords.length} records`);

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

  return dailyStatusPoints.sort((a, b) => {
    const dateA = new Date(a.date + ', ' + new Date().getFullYear());
    const dateB = new Date(b.date + ', ' + new Date().getFullYear());
    return dateA.getTime() - dateB.getTime();
  });
};

export const fetchStatusData = async (machineId: string) => {
  console.log('🚀 [STATUS SERVICE] Starting status data fetch for machine:', machineId);
  
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
    console.log('📡 [STATUS SERVICE] Using summary tables for status data...');
    
    // 1. Get daily status from summary table (fast)
    let statusData = [];
    const { data: dailySummaries, error: dailyError } = await supabase
      .from('daily_production_summary')
      .select(`
        date,
        producing_percentage,
        idle_percentage, 
        full_water_percentage,
        disconnected_percentage
      `)
      .eq('machine_id', machineId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (dailyError) throw dailyError;

    if (dailySummaries && dailySummaries.length > 0) {
      // Use summary data
      const dailyMap = new Map(
        dailySummaries.map(s => [s.date, {
          producing: Number(s.producing_percentage),
          idle: Number(s.idle_percentage),
          fullWater: Number(s.full_water_percentage),
          disconnected: Number(s.disconnected_percentage)
        }])
      );
      
      statusData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateKey = date.toISOString().split('T')[0];
        const displayDate = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
        const percentages = dailyMap.get(dateKey) || { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
        
        return { 
          date: displayDate,
          producing: Math.round(percentages.producing * 10) / 10,
          idle: Math.round(percentages.idle * 10) / 10,
          fullWater: Math.round(percentages.fullWater * 10) / 10,
          disconnected: Math.round(percentages.disconnected * 10) / 10
        };
      });
    } else {
      console.log('⚠️ [STATUS SERVICE] No daily summaries, using fallback calculation...');
      // Fallback to raw calculation
      const rawRecords = await fetchRawMachineData(machineId, 7);
      const dailyStatusPoints = calculateDailyStatusPoints(rawRecords, 7);
      statusData = dailyStatusPoints;
    }

    // 2. Get weekly status from summary table
    let weeklyStatusData = [];
    const { data: weeklySummaries, error: weeklyError } = await supabase
      .from('weekly_production_summary')
      .select(`
        week_start,
        producing_percentage,
        idle_percentage,
        full_water_percentage,
        disconnected_percentage
      `)
      .eq('machine_id', machineId)
      .gte('week_start', new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('week_start', { ascending: true });

    if (weeklyError) throw weeklyError;

    if (weeklySummaries && weeklySummaries.length > 0) {
      const formatWeekRange = (isoStart: string) => {
        const start = new Date(isoStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const startStr = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const endStr = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return `${startStr} - ${endStr}`;
      };

      const sliced = weeklySummaries.slice(-4);
      weeklyStatusData = sliced.map((summary) => ({
        week: formatWeekRange(summary.week_start),
        producing: Math.round(Number(summary.producing_percentage) * 10) / 10,
        idle: Math.round(Number(summary.idle_percentage) * 10) / 10,
        fullWater: Math.round(Number(summary.full_water_percentage) * 10) / 10,
        disconnected: Math.round(Number(summary.disconnected_percentage) * 10) / 10
      }));

      // Pad with neutral status if needed
      while (weeklyStatusData.length < 4) {
        const now = new Date();
        now.setDate(now.getDate() - ((4 - weeklyStatusData.length) * 7));
        const start = new Date(now);
        start.setDate(start.getDate() - start.getDay());
        weeklyStatusData.unshift({
          week: formatWeekRange(start.toISOString().split('T')[0]),
          producing: 0,
          idle: 0,
          fullWater: 0,
          disconnected: 0
        });
      }
    } else {
      // Fallback to neutral (0) status with explicit labels
      const { weeklyLabels } = generateTimePeriodLabels();
      weeklyStatusData = weeklyLabels.map(week => ({ 
        week, 
        producing: 0, 
        idle: 0, 
        fullWater: 0,
        disconnected: 0 
      }));
    }

    // 3. Get monthly status from summary table
    let monthlyStatusData = [];
    const { data: monthlySummaries, error: monthlyError } = await supabase
      .from('monthly_production_summary')
      .select(`
        month_year,
        producing_percentage,
        idle_percentage,
        full_water_percentage,
        disconnected_percentage
      `)
      .eq('machine_id', machineId)
      .gte('month_year', new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('month_year', { ascending: true });

    if (monthlyError) throw monthlyError;

    if (monthlySummaries && monthlySummaries.length > 0) {
      monthlyStatusData = monthlySummaries.slice(-3).map(summary => {
        const date = new Date(summary.month_year);
        return {
          month: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
          producing: Math.round(Number(summary.producing_percentage) * 10) / 10,
          idle: Math.round(Number(summary.idle_percentage) * 10) / 10,
          fullWater: Math.round(Number(summary.full_water_percentage) * 10) / 10,
          disconnected: Math.round(Number(summary.disconnected_percentage) * 10) / 10
        };
      });

      // Pad with disconnected status if needed
      while (monthlyStatusData.length < 3) {
        const date = new Date();
        date.setMonth(date.getMonth() - (3 - monthlyStatusData.length));
        monthlyStatusData.unshift({
          month: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
          producing: 0,
          idle: 0,
          fullWater: 0,
          disconnected: 0
        });
      }
    } else {
      // Fallback to neutral status
      const { monthlyLabels } = generateTimePeriodLabels();
      monthlyStatusData = monthlyLabels.map(month => ({ 
        month, 
        producing: 0, 
        idle: 0, 
        fullWater: 0,
        disconnected: 0 
      }));
    }

    // 4. Get yearly status from summary table
    let yearlyStatusData = [];
    const { data: yearlySummaries, error: yearlyError } = await supabase
      .from('yearly_production_summary')
      .select(`
        year,
        producing_percentage,
        idle_percentage,
        full_water_percentage,
        disconnected_percentage
      `)
      .eq('machine_id', machineId)
      .gte('year', new Date().getFullYear() - 1)
      .order('year', { ascending: true });

    if (yearlyError) throw yearlyError;

    if (yearlySummaries && yearlySummaries.length > 0) {
      yearlyStatusData = yearlySummaries.slice(-2).map(summary => ({
        year: summary.year.toString(),
        producing: Math.round(Number(summary.producing_percentage) * 10) / 10,
        idle: Math.round(Number(summary.idle_percentage) * 10) / 10,
        fullWater: Math.round(Number(summary.full_water_percentage) * 10) / 10,
        disconnected: Math.round(Number(summary.disconnected_percentage) * 10) / 10
      }));

      // Pad with disconnected status if needed
      while (yearlyStatusData.length < 2) {
        const year = new Date().getFullYear() - (2 - yearlyStatusData.length);
        yearlyStatusData.unshift({
          year: year.toString(),
          producing: 0,
          idle: 0,
          fullWater: 0,
          disconnected: 100
        });
      }
    } else {
      // Fallback to disconnected status
      const { yearlyLabels } = generateTimePeriodLabels();
      yearlyStatusData = yearlyLabels.map(year => ({ 
        year, 
        producing: 0, 
        idle: 0, 
        fullWater: 0, 
        disconnected: 100 
      }));
    }

    const result = {
      statusData,
      weeklyStatusData,
      monthlyStatusData,
      yearlyStatusData
    };

    console.log('✅ [STATUS SERVICE] Using summary tables for machine', machineId, ':', {
      dailyPoints: statusData.length,
      weeklyPoints: weeklyStatusData.length,
      monthlyPoints: monthlyStatusData.length,
      yearlyPoints: yearlyStatusData.length,
      sampleDaily: statusData.find(d => d.disconnected < 100) || statusData[0] || 'No daily data',
      sampleWeekly: weeklyStatusData.find(w => w.disconnected < 100) || weeklyStatusData[0] || 'No weekly data'
    });

    return result;

  } catch (error) {
    console.error('❌ [STATUS SERVICE] Error in status data fetch for machine', machineId, ':', error);
    
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