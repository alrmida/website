
import { supabase } from '@/integrations/supabase/client';
import { StatusData, MonthlyStatusData } from '@/types/productionAnalytics';
import { calculateStatusPercentagesForDay } from '@/utils/statusCalculations';

interface WeeklyStatusData {
  week: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

interface YearlyStatusData {
  year: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export const fetchStatusData = async (machineId: string) => {
  // Fetch machine status data for the last 2 years with proper limit
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data: statusData, error: statusError } = await supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, full_tank, compressor_on')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', twoYearsAgo.toISOString())
    .limit(50000)
    .order('timestamp_utc', { ascending: true });

  if (statusError) {
    throw statusError;
  }

  console.log('📊 Status data fetched:', statusData?.length || 0, 'records');

  // Group status data by different time periods
  const groupedDailyData = new Map<string, any[]>();
  const groupedWeeklyData = new Map<string, any[]>();
  const groupedMonthlyData = new Map<string, any[]>();
  const groupedYearlyData = new Map<string, any[]>();
  
  statusData?.forEach(record => {
    const date = new Date(record.timestamp_utc);
    
    // Daily grouping
    const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (!groupedDailyData.has(dayKey)) {
      groupedDailyData.set(dayKey, []);
    }
    groupedDailyData.get(dayKey)!.push(record);
    
    // Weekly grouping
    const weekStart = getWeekStart(date);
    const weekKey = `${weekStart.getDate().toString().padStart(2, '0')} ${weekStart.toLocaleDateString('en-GB', { month: 'short' })}`;
    if (!groupedWeeklyData.has(weekKey)) {
      groupedWeeklyData.set(weekKey, []);
    }
    groupedWeeklyData.get(weekKey)!.push(record);
    
    // Monthly grouping
    const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    if (!groupedMonthlyData.has(monthKey)) {
      groupedMonthlyData.set(monthKey, []);
    }
    groupedMonthlyData.get(monthKey)!.push(record);
    
    // Yearly grouping
    const yearKey = date.getFullYear().toString();
    if (!groupedYearlyData.has(yearKey)) {
      groupedYearlyData.set(yearKey, []);
    }
    groupedYearlyData.get(yearKey)!.push(record);
  });

  // Create status arrays for each time period
  
  // Daily (last 7 days)
  const statusDataArray: StatusData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    const dayRecords = groupedDailyData.get(dayKey) || [];
    const statusPercentages = calculateStatusPercentagesForDay(dayRecords);
    
    statusDataArray.push({
      date: dayKey,
      ...statusPercentages
    });
  }

  // Weekly (last 4 weeks)
  const weeklyStatusData: WeeklyStatusData[] = [];
  for (let i = 3; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 7));
    const weekStart = getWeekStart(date);
    const weekKey = `${weekStart.getDate().toString().padStart(2, '0')} ${weekStart.toLocaleDateString('en-GB', { month: 'short' })}`;
    
    const weekRecords = groupedWeeklyData.get(weekKey) || [];
    const statusPercentages = calculateStatusPercentagesForDay(weekRecords);
    
    weeklyStatusData.push({
      week: weekKey,
      ...statusPercentages
    });
  }

  // Monthly (last 3 months)
  const monthlyStatusData: MonthlyStatusData[] = [];
  for (let i = 2; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    
    const monthRecords = groupedMonthlyData.get(monthKey) || [];
    
    // Group by days in the month and average the percentages
    const dailyStatusMap = new Map<string, any[]>();
    
    monthRecords.forEach(record => {
      const recordDate = new Date(record.timestamp_utc);
      const dayKey = recordDate.toDateString();
      if (!dailyStatusMap.has(dayKey)) {
        dailyStatusMap.set(dayKey, []);
      }
      dailyStatusMap.get(dayKey)!.push(record);
    });

    let monthlyProducing = 0;
    let monthlyIdle = 0;
    let monthlyFullWater = 0;
    let monthlyDisconnected = 0;
    let validDays = 0;

    dailyStatusMap.forEach(dayRecords => {
      const dayStatus = calculateStatusPercentagesForDay(dayRecords);
      monthlyProducing += dayStatus.producing;
      monthlyIdle += dayStatus.idle;
      monthlyFullWater += dayStatus.fullWater;
      monthlyDisconnected += dayStatus.disconnected;
      validDays++;
    });

    if (validDays > 0) {
      monthlyStatusData.push({
        month: monthKey,
        producing: Math.round(monthlyProducing / validDays) || 0,
        idle: Math.round(monthlyIdle / validDays) || 0,
        fullWater: Math.round(monthlyFullWater / validDays) || 0,
        disconnected: Math.round(monthlyDisconnected / validDays) || 0
      });
    } else {
      monthlyStatusData.push({
        month: monthKey,
        producing: 0,
        idle: 0,
        fullWater: 0,
        disconnected: 100
      });
    }
  }

  // Yearly (last 2 years)
  const yearlyStatusData: YearlyStatusData[] = [];
  for (let i = 1; i >= 0; i--) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - i);
    const yearKey = date.getFullYear().toString();
    
    const yearRecords = groupedYearlyData.get(yearKey) || [];
    
    // Group by months in the year and average the percentages
    const monthlyStatusMap = new Map<string, any[]>();
    
    yearRecords.forEach(record => {
      const recordDate = new Date(record.timestamp_utc);
      const monthKey = recordDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      if (!monthlyStatusMap.has(monthKey)) {
        monthlyStatusMap.set(monthKey, []);
      }
      monthlyStatusMap.get(monthKey)!.push(record);
    });

    let yearlyProducing = 0;
    let yearlyIdle = 0;
    let yearlyFullWater = 0;
    let yearlyDisconnected = 0;
    let validMonths = 0;

    monthlyStatusMap.forEach(monthRecords => {
      const monthStatus = calculateStatusPercentagesForDay(monthRecords);
      yearlyProducing += monthStatus.producing;
      yearlyIdle += monthStatus.idle;
      yearlyFullWater += monthStatus.fullWater;
      yearlyDisconnected += monthStatus.disconnected;
      validMonths++;
    });

    if (validMonths > 0) {
      yearlyStatusData.push({
        year: yearKey,
        producing: Math.round(yearlyProducing / validMonths) || 0,
        idle: Math.round(yearlyIdle / validMonths) || 0,
        fullWater: Math.round(yearlyFullWater / validMonths) || 0,
        disconnected: Math.round(yearlyDisconnected / validMonths) || 0
      });
    } else {
      yearlyStatusData.push({
        year: yearKey,
        producing: 0,
        idle: 0,
        fullWater: 0,
        disconnected: 100
      });
    }
  }

  return {
    statusData: statusDataArray,
    weeklyStatusData,
    monthlyStatusData,
    yearlyStatusData
  };
};

// Helper function to get the start of the week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}
