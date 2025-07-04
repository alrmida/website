
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProductionData {
  date: string;
  production: number;
}

interface MonthlyProductionData {
  month: string;
  production: number;
}

interface StatusData {
  date: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

interface MonthlyStatusData {
  month: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

interface ProductionAnalyticsData {
  dailyProductionData: ProductionData[];
  monthlyProductionData: MonthlyProductionData[];
  statusData: StatusData[];
  monthlyStatusData: MonthlyStatusData[];
  totalAllTimeProduction: number;
}

// Helper function to detect disconnected periods (using same logic as useLiveMachineData)
const calculateStatusPercentagesForDay = (records: any[], dayStart: Date, dayEnd: Date) => {
  if (records.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  // Sort records by timestamp
  const sortedRecords = records.sort((a, b) => 
    new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
  );

  let totalMinutes = 0;
  let producingMinutes = 0;
  let idleMinutes = 0;
  let fullWaterMinutes = 0;
  let disconnectedMinutes = 0;

  const dayDurationMs = dayEnd.getTime() - dayStart.getTime();
  const totalDayMinutes = dayDurationMs / (1000 * 60); // Total minutes in the day

  // Process each record and calculate time periods
  for (let i = 0; i < sortedRecords.length; i++) {
    const currentRecord = sortedRecords[i];
    const currentTime = new Date(currentRecord.timestamp_utc);
    
    // Determine the duration this record represents
    let recordDurationMs: number;
    
    if (i === sortedRecords.length - 1) {
      // Last record - duration until end of day or until now if it's today
      const endTime = dayEnd.getTime() > Date.now() ? new Date() : dayEnd;
      recordDurationMs = endTime.getTime() - currentTime.getTime();
    } else {
      // Duration until next record
      const nextTime = new Date(sortedRecords[i + 1].timestamp_utc);
      recordDurationMs = nextTime.getTime() - currentTime.getTime();
      
      // If gap is > 60 seconds (60,000ms), consider it disconnected
      if (recordDurationMs > 60000) {
        // Split the duration: first minute as current status, rest as disconnected
        const connectedDuration = Math.min(recordDurationMs, 60000);
        const disconnectedDuration = Math.max(0, recordDurationMs - 60000);
        
        recordDurationMs = connectedDuration;
        disconnectedMinutes += disconnectedDuration / (1000 * 60);
      }
    }

    const recordMinutes = Math.max(0, recordDurationMs / (1000 * 60));
    
    // Determine status for this period
    const isProducing = currentRecord.producing_water || currentRecord.compressor_on;
    const isFullTank = currentRecord.full_tank;
    
    if (isFullTank) {
      fullWaterMinutes += recordMinutes;
    } else if (isProducing) {
      producingMinutes += recordMinutes;
    } else {
      idleMinutes += recordMinutes;
    }
    
    totalMinutes += recordMinutes;
  }

  // Handle gap from day start to first record
  if (sortedRecords.length > 0) {
    const firstRecordTime = new Date(sortedRecords[0].timestamp_utc);
    const gapFromStartMs = firstRecordTime.getTime() - dayStart.getTime();
    if (gapFromStartMs > 0) {
      disconnectedMinutes += gapFromStartMs / (1000 * 60);
    }
  } else {
    // No records for entire day
    disconnectedMinutes = totalDayMinutes;
  }

  // Calculate percentages based on total day minutes
  const totalAccountedMinutes = producingMinutes + idleMinutes + fullWaterMinutes + disconnectedMinutes;
  
  // Ensure we account for the full day
  if (totalAccountedMinutes < totalDayMinutes) {
    disconnectedMinutes += (totalDayMinutes - totalAccountedMinutes);
  }

  return {
    producing: Math.round((producingMinutes / totalDayMinutes) * 100) || 0,
    idle: Math.round((idleMinutes / totalDayMinutes) * 100) || 0,
    fullWater: Math.round((fullWaterMinutes / totalDayMinutes) * 100) || 0,
    disconnected: Math.round((disconnectedMinutes / totalDayMinutes) * 100) || 0
  };
};

export const useProductionAnalytics = (machineId?: string) => {
  const [data, setData] = useState<ProductionAnalyticsData>({
    dailyProductionData: [],
    monthlyProductionData: [],
    statusData: [],
    monthlyStatusData: [],
    totalAllTimeProduction: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductionAnalytics = async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching production analytics for machine:', machineId);

      // Fetch ALL production events for total calculation (no time limit)
      const { data: allProductionEvents, error: allProductionError } = await supabase
        .from('water_production_events')
        .select('production_liters, timestamp_utc, event_type')
        .eq('machine_id', machineId)
        .eq('event_type', 'production'); // Only include actual production events

      if (allProductionError) {
        throw allProductionError;
      }

      // Calculate all-time total production
      const totalAllTimeProduction = allProductionEvents
        ?.filter(event => event.production_liters > 0)
        .reduce((sum, event) => sum + event.production_liters, 0) || 0;

      console.log('📊 All-time production events:', allProductionEvents?.length || 0);
      console.log('📊 All-time total production:', Math.round(totalAllTimeProduction * 10) / 10);

      // Fetch daily production data (last 7 days) - ONLY production events, exclude drainage
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: productionEvents, error: productionError } = await supabase
        .from('water_production_events')
        .select('production_liters, timestamp_utc, event_type')
        .eq('machine_id', machineId)
        .eq('event_type', 'production') // Only include actual production events
        .gte('timestamp_utc', sevenDaysAgo.toISOString())
        .order('timestamp_utc', { ascending: true });

      if (productionError) {
        throw productionError;
      }

      console.log('📊 Filtered production events (last 7 days, production only):', productionEvents?.length || 0);

      // Group production by day
      const dailyProduction = new Map<string, number>();
      const monthlyProduction = new Map<string, number>();

      productionEvents?.forEach(event => {
        // Only process positive production values
        if (event.production_liters > 0) {
          const date = new Date(event.timestamp_utc);
          const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          
          dailyProduction.set(dayKey, (dailyProduction.get(dayKey) || 0) + event.production_liters);
          monthlyProduction.set(monthKey, (monthlyProduction.get(monthKey) || 0) + event.production_liters);
        }
      });

      // Create daily production array (last 7 days) - show all 7 days even with 0 production
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

      console.log('📊 Daily production data (7 days):', dailyProductionData);

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

      // Fetch machine status data for the last 7 days
      const { data: statusData, error: statusError } = await supabase
        .from('raw_machine_data')
        .select('timestamp_utc, producing_water, full_tank, compressor_on')
        .eq('machine_id', machineId)
        .gte('timestamp_utc', sevenDaysAgo.toISOString())
        .order('timestamp_utc', { ascending: true });

      if (statusError) {
        throw statusError;
      }

      console.log('📊 Raw machine data records for status analysis:', statusData?.length || 0);

      // Create status arrays using time-based analysis (7 days)
      const statusDataArray: StatusData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Define day boundaries
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        
        // Get records for this specific day
        const dayRecords = statusData?.filter(record => {
          const recordDate = new Date(record.timestamp_utc);
          return recordDate >= dayStart && recordDate <= dayEnd;
        }) || [];

        console.log(`📊 Day ${dayKey}: ${dayRecords.length} records`);
        
        // Calculate time-based status percentages
        const statusPercentages = calculateStatusPercentagesForDay(dayRecords, dayStart, dayEnd);
        
        statusDataArray.push({
          date: dayKey,
          ...statusPercentages
        });
      }

      // Create monthly status data using similar logic
      const monthlyStatusData: MonthlyStatusData[] = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        // Define month boundaries
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        // Get records for this specific month
        const monthRecords = statusData?.filter(record => {
          const recordDate = new Date(record.timestamp_utc);
          return recordDate >= monthStart && recordDate <= monthEnd;
        }) || [];

        // For monthly data, we'll aggregate the daily calculations
        const daysInMonth = monthEnd.getDate();
        let monthlyProducing = 0;
        let monthlyIdle = 0;
        let monthlyFullWater = 0;
        let monthlyDisconnected = 0;

        // Calculate for each day in the month
        for (let day = 1; day <= daysInMonth; day++) {
          const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
          const dayStartBoundary = new Date(dayDate);
          dayStartBoundary.setHours(0, 0, 0, 0);
          const dayEndBoundary = new Date(dayDate);
          dayEndBoundary.setHours(23, 59, 59, 999);

          const dayRecordsInMonth = monthRecords.filter(record => {
            const recordDate = new Date(record.timestamp_utc);
            return recordDate >= dayStartBoundary && recordDate <= dayEndBoundary;
          });

          const dayStatus = calculateStatusPercentagesForDay(dayRecordsInMonth, dayStartBoundary, dayEndBoundary);
          monthlyProducing += dayStatus.producing;
          monthlyIdle += dayStatus.idle;
          monthlyFullWater += dayStatus.fullWater;
          monthlyDisconnected += dayStatus.disconnected;
        }

        monthlyStatusData.push({
          month: monthKey,
          producing: Math.round(monthlyProducing / daysInMonth) || 0,
          idle: Math.round(monthlyIdle / daysInMonth) || 0,
          fullWater: Math.round(monthlyFullWater / daysInMonth) || 0,
          disconnected: Math.round(monthlyDisconnected / daysInMonth) || 0
        });
      }

      console.log('📊 Status data with disconnection detection:', statusDataArray);

      setData({
        dailyProductionData,
        monthlyProductionData,
        statusData: statusDataArray,
        monthlyStatusData,
        totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
      });

      console.log('✅ Production analytics data loaded with improved status detection:', {
        dailyProduction: dailyProductionData.length,
        monthlyProduction: monthlyProductionData.length,
        statusEntries: statusDataArray.length,
        totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
      });

      setError(null);
    } catch (err) {
      console.error('❌ Error fetching production analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionAnalytics();
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchProductionAnalytics };
};
