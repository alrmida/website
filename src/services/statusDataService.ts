
import { supabase } from '@/integrations/supabase/client';
import { StatusData, MonthlyStatusData } from '@/types/productionAnalytics';
import { calculateStatusPercentagesForDay } from '@/utils/statusCalculations';

export const fetchStatusData = async (machineId: string) => {
  // Fetch machine status data for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: statusData, error: statusError } = await supabase
    .from('raw_machine_data')
    .select('timestamp_utc, producing_water, full_tank, compressor_on')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', sevenDaysAgo.toISOString())
    .order('timestamp_utc', { ascending: true });

  if (statusError) {
    throw statusError;
  }

  // Group status data by day using simple date string matching
  const groupedStatusData = new Map<string, any[]>();
  
  statusData?.forEach(record => {
    const date = new Date(record.timestamp_utc);
    const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    if (!groupedStatusData.has(dayKey)) {
      groupedStatusData.set(dayKey, []);
    }
    groupedStatusData.get(dayKey)!.push(record);
  });

  // Create status arrays for each of the last 7 days
  const statusDataArray: StatusData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    const dayRecords = groupedStatusData.get(dayKey) || [];
    const statusPercentages = calculateStatusPercentagesForDay(dayRecords);
    
    statusDataArray.push({
      date: dayKey,
      ...statusPercentages
    });
  }

  // Create monthly status data
  const monthlyStatusData: MonthlyStatusData[] = [];
  for (let i = 2; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    
    // Get all records for this month
    const monthRecords = statusData?.filter(record => {
      const recordDate = new Date(record.timestamp_utc);
      const recordMonthKey = recordDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      return recordMonthKey === monthKey;
    }) || [];

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

  return {
    statusData: statusDataArray,
    monthlyStatusData
  };
};
