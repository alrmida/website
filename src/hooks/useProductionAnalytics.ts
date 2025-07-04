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

// Fixed status calculation function with correct logic for real machine patterns
const calculateStatusPercentagesForDay = (records: any[], dayStart: Date, dayEnd: Date) => {
  console.log(`📊 Calculating status for day: ${dayStart.toISOString().split('T')[0]}`);
  console.log(`📊 Records count: ${records.length}`);
  
  if (records.length === 0) {
    console.log('📊 No records found - returning 100% disconnected');
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  // Sort records by timestamp
  const sortedRecords = records.sort((a, b) => 
    new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
  );

  console.log(`📊 First record: ${sortedRecords[0].timestamp_utc}`);
  console.log(`📊 Last record: ${sortedRecords[sortedRecords.length - 1].timestamp_utc}`);

  // For current day (partial day), calculate until now or end of available data
  const now = new Date();
  const isCurrentDay = dayStart.toDateString() === now.toDateString();
  const effectiveEndTime = isCurrentDay ? 
    (now < dayEnd ? now : dayEnd) : dayEnd;

  const totalDayMinutes = (effectiveEndTime.getTime() - dayStart.getTime()) / (1000 * 60);
  console.log(`📊 Total day minutes to calculate: ${totalDayMinutes}`);

  let producingMinutes = 0;
  let idleMinutes = 0;
  let fullWaterMinutes = 0;
  let disconnectedMinutes = 0;

  // Process each record and calculate duration it represents
  for (let i = 0; i < sortedRecords.length; i++) {
    const currentRecord = sortedRecords[i];
    const currentTime = new Date(currentRecord.timestamp_utc);
    
    // Skip records outside our day boundary
    if (currentTime < dayStart || currentTime > effectiveEndTime) {
      continue;
    }

    let durationMinutes = 0;
    
    if (i === sortedRecords.length - 1) {
      // Last record: duration until end of day or now
      durationMinutes = (effectiveEndTime.getTime() - currentTime.getTime()) / (1000 * 60);
    } else {
      // Duration until next record
      const nextRecord = sortedRecords[i + 1];
      const nextTime = new Date(nextRecord.timestamp_utc);
      const gapMinutes = (nextTime.getTime() - currentTime.getTime()) / (1000 * 60);
      
      // Changed from 2 minutes to 30 seconds (0.5 minutes) for gap detection
      // Data comes every ~10 seconds normally
      if (gapMinutes > 0.5) {
        // Assign 10 seconds (normal interval) to current status, rest as disconnected
        durationMinutes = 10 / 60; // 10 seconds in minutes
        disconnectedMinutes += gapMinutes - (10 / 60);
      } else {
        durationMinutes = gapMinutes;
      }
    }

    // Fixed status priority logic based on real machine behavior
    const isFullTank = currentRecord.full_tank;
    const isProducing = currentRecord.producing_water || currentRecord.compressor_on;
    
    console.log(`📊 Record ${i}: ${currentRecord.timestamp_utc.slice(11, 19)} - Duration: ${durationMinutes.toFixed(1)}min, Full Tank: ${isFullTank}, Producing: ${isProducing}`);
    
    // Priority: Full Tank > Producing > Idle
    if (isFullTank) {
      fullWaterMinutes += durationMinutes;
    } else if (isProducing) {
      producingMinutes += durationMinutes;
    } else {
      idleMinutes += durationMinutes;
    }
  }

  // Removed problematic initial gap calculation - trust that if we have data, machine was connected

  const totalAccountedMinutes = producingMinutes + idleMinutes + fullWaterMinutes + disconnectedMinutes;
  
  console.log(`📊 Minutes breakdown:`);
  console.log(`  - Producing: ${producingMinutes.toFixed(1)}`);
  console.log(`  - Idle: ${idleMinutes.toFixed(1)}`);
  console.log(`  - Full Water: ${fullWaterMinutes.toFixed(1)}`);
  console.log(`  - Disconnected: ${disconnectedMinutes.toFixed(1)}`);
  console.log(`  - Total accounted: ${totalAccountedMinutes.toFixed(1)}`);
  console.log(`  - Total day: ${totalDayMinutes.toFixed(1)}`);

  // If we haven't accounted for all time, add to disconnected
  if (totalAccountedMinutes < totalDayMinutes) {
    const remainingMinutes = totalDayMinutes - totalAccountedMinutes;
    disconnectedMinutes += remainingMinutes;
    console.log(`📊 Added ${remainingMinutes.toFixed(1)} minutes to disconnected`);
  }

  // Calculate percentages and ensure they add up to 100%
  const result = {
    producing: Math.round((producingMinutes / totalDayMinutes) * 100) || 0,
    idle: Math.round((idleMinutes / totalDayMinutes) * 100) || 0,
    fullWater: Math.round((fullWaterMinutes / totalDayMinutes) * 100) || 0,
    disconnected: Math.round((disconnectedMinutes / totalDayMinutes) * 100) || 0
  };

  // Ensure percentages add up to 100% (fix rounding issues)
  const totalPercentage = result.producing + result.idle + result.fullWater + result.disconnected;
  if (totalPercentage !== 100 && totalPercentage > 0) {
    const diff = 100 - totalPercentage;
    // Add difference to the largest category
    const largest = Math.max(result.producing, result.idle, result.fullWater, result.disconnected);
    if (result.producing === largest) result.producing += diff;
    else if (result.idle === largest) result.idle += diff;
    else if (result.fullWater === largest) result.fullWater += diff;
    else result.disconnected += diff;
  }

  console.log(`📊 Final percentages:`, result);
  console.log(`📊 Total percentage: ${result.producing + result.idle + result.fullWater + result.disconnected}%`);

  return result;
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

      // Fetch daily production data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: productionEvents, error: productionError } = await supabase
        .from('water_production_events')
        .select('production_liters, timestamp_utc, event_type')
        .eq('machine_id', machineId)
        .eq('event_type', 'production')
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
        if (event.production_liters > 0) {
          const date = new Date(event.timestamp_utc);
          const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          
          dailyProduction.set(dayKey, (dailyProduction.get(dayKey) || 0) + event.production_liters);
          monthlyProduction.set(monthKey, (monthlyProduction.get(monthKey) || 0) + event.production_liters);
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

      // Create status arrays using improved time-based analysis (7 days)
      const statusDataArray: StatusData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Define day boundaries in UTC
        const dayStart = new Date(Date.UTC(
          date.getFullYear(), 
          date.getMonth(), 
          date.getDate(), 
          0, 0, 0, 0
        ));
        const dayEnd = new Date(Date.UTC(
          date.getFullYear(), 
          date.getMonth(), 
          date.getDate(), 
          23, 59, 59, 999
        ));
        
        const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        
        // Get records for this specific day
        const dayRecords = statusData?.filter(record => {
          const recordDate = new Date(record.timestamp_utc);
          return recordDate >= dayStart && recordDate <= dayEnd;
        }) || [];

        console.log(`📊 Day ${dayKey}: ${dayRecords.length} records`);
        
        // Calculate time-based status percentages with improved logic
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
        
        // Define month boundaries in UTC
        const monthStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
        
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        // Get records for this specific month
        const monthRecords = statusData?.filter(record => {
          const recordDate = new Date(record.timestamp_utc);
          return recordDate >= monthStart && recordDate <= monthEnd;
        }) || [];

        // For monthly data, aggregate the daily calculations
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        let monthlyProducing = 0;
        let monthlyIdle = 0;
        let monthlyFullWater = 0;
        let monthlyDisconnected = 0;

        // Calculate for each day in the month
        for (let day = 1; day <= daysInMonth; day++) {
          const dayDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), day, 0, 0, 0, 0));
          const dayEndBoundary = new Date(Date.UTC(date.getFullYear(), date.getMonth(), day, 23, 59, 59, 999));

          const dayRecordsInMonth = monthRecords.filter(record => {
            const recordDate = new Date(record.timestamp_utc);
            return recordDate >= dayDate && recordDate <= dayEndBoundary;
          });

          const dayStatus = calculateStatusPercentagesForDay(dayRecordsInMonth, dayDate, dayEndBoundary);
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

      console.log('📊 Status data with corrected calculation:', statusDataArray);

      setData({
        dailyProductionData,
        monthlyProductionData,
        statusData: statusDataArray,
        monthlyStatusData,
        totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
      });

      console.log('✅ Production analytics data loaded with corrected status calculation:', {
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
