

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

// Simplified status calculation based on record counts
const calculateStatusPercentagesForDay = (records: any[], dayKey: string) => {
  console.log(`🔍 === STATUS CALCULATION FOR ${dayKey} ===`);
  console.log(`🔍 Total records: ${records.length}`);
  
  if (records.length === 0) {
    console.log('🔍 No records - returning 100% disconnected');
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  // Log first few records to understand the data structure
  console.log(`🔍 Sample records for ${dayKey}:`, records.slice(0, 3).map(r => ({
    timestamp: r.timestamp_utc,
    full_tank: r.full_tank,
    producing_water: r.producing_water,
    compressor_on: r.compressor_on
  })));

  // Count records by status with clear priority
  let fullWaterCount = 0;
  let producingCount = 0;
  let idleCount = 0;

  records.forEach(record => {
    if (record.full_tank === true) {
      fullWaterCount++;
    } else if (record.producing_water === true || record.compressor_on === 1) {
      producingCount++;
    } else {
      idleCount++;
    }
  });

  console.log(`🔍 Status counts for ${dayKey}:`);
  console.log(`  - Full Water: ${fullWaterCount} records`);
  console.log(`  - Producing: ${producingCount} records`);
  console.log(`  - Idle: ${idleCount} records`);
  console.log(`  - Total processed: ${fullWaterCount + producingCount + idleCount}`);

  // Calculate percentages based on record counts (each record = ~10 seconds)
  const totalRecords = records.length;
  
  const result = {
    fullWater: Math.round((fullWaterCount / totalRecords) * 100) || 0,
    producing: Math.round((producingCount / totalRecords) * 100) || 0,
    idle: Math.round((idleCount / totalRecords) * 100) || 0,
    disconnected: 0 // Start with 0, we'll only add if there are actual gaps
  };

  // Ensure percentages add up to 100%
  const totalPercentage = result.producing + result.idle + result.fullWater + result.disconnected;
  if (totalPercentage !== 100 && totalPercentage > 0) {
    const diff = 100 - totalPercentage;
    // Add difference to the largest category
    if (result.fullWater >= result.producing && result.fullWater >= result.idle) {
      result.fullWater += diff;
    } else if (result.producing >= result.idle) {
      result.producing += diff;
    } else {
      result.idle += diff;
    }
  }

  console.log(`🔍 Final percentages for ${dayKey}:`);
  console.log(`  - Full Water: ${result.fullWater}%`);
  console.log(`  - Producing: ${result.producing}%`);
  console.log(`  - Idle: ${result.idle}%`);
  console.log(`  - Disconnected: ${result.disconnected}%`);
  console.log(`🔍 Total: ${result.producing + result.idle + result.fullWater + result.disconnected}%`);
  console.log(`🔍 === END CALCULATION ===`);

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
        .eq('event_type', 'production');

      if (allProductionError) {
        throw allProductionError;
      }

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

      // ENHANCED DEBUG: First check what raw data exists for the problematic dates
      console.log('🔍 === DEBUGGING MISSING DATA ===');
      const jul3Start = '2025-07-03T00:00:00.000Z';
      const jul3End = '2025-07-03T23:59:59.999Z';
      const jul4Start = '2025-07-04T00:00:00.000Z';
      const jul4End = '2025-07-04T23:59:59.999Z';

      // Check if data exists for July 3rd
      const { data: jul3Test, error: jul3Error } = await supabase
        .from('raw_machine_data')
        .select('id, timestamp_utc')
        .eq('machine_id', machineId)
        .gte('timestamp_utc', jul3Start)
        .lte('timestamp_utc', jul3End)
        .limit(5);

      console.log('🔍 July 3rd test query:', { count: jul3Test?.length || 0, error: jul3Error, sample: jul3Test?.[0] });

      // Check if data exists for July 4th
      const { data: jul4Test, error: jul4Error } = await supabase
        .from('raw_machine_data')
        .select('id, timestamp_utc')
        .eq('machine_id', machineId)
        .gte('timestamp_utc', jul4Start)
        .lte('timestamp_utc', jul4End)
        .limit(5);

      console.log('🔍 July 4th test query:', { count: jul4Test?.length || 0, error: jul4Error, sample: jul4Test?.[0] });

      // Fetch machine status data for the last 7 days with enhanced debugging
      console.log('🔍 Fetching status data from:', sevenDaysAgo.toISOString());
      const { data: statusData, error: statusError } = await supabase
        .from('raw_machine_data')
        .select('timestamp_utc, producing_water, full_tank, compressor_on')
        .eq('machine_id', machineId)
        .gte('timestamp_utc', sevenDaysAgo.toISOString())
        .order('timestamp_utc', { ascending: true })
        .limit(15000); // Increased limit even further

      if (statusError) {
        throw statusError;
      }

      console.log('🔍 Raw machine data records for status analysis:', statusData?.length || 0);
      
      // Enhanced debug: Show date distribution
      if (statusData && statusData.length > 0) {
        const dateDistribution = new Map<string, number>();
        statusData.forEach(record => {
          const date = new Date(record.timestamp_utc);
          const dayKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          dateDistribution.set(dayKey, (dateDistribution.get(dayKey) || 0) + 1);
        });
        console.log('🔍 Date distribution in fetched data:', Object.fromEntries(dateDistribution));
        console.log('🔍 First record timestamp:', statusData[0]?.timestamp_utc);
        console.log('🔍 Last record timestamp:', statusData[statusData.length - 1]?.timestamp_utc);
      }

      // Create status arrays for each of the last 7 days
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

        console.log(`🔍 ${dayKey}: Found ${dayRecords.length} records between ${dayStart.toISOString()} and ${dayEnd.toISOString()}`);
        
        if (dayRecords.length > 0) {
          console.log(`🔍 ${dayKey}: First record: ${dayRecords[0].timestamp_utc}`);
          console.log(`🔍 ${dayKey}: Last record: ${dayRecords[dayRecords.length - 1].timestamp_utc}`);
        }
        
        // Calculate status percentages using simplified logic
        const statusPercentages = calculateStatusPercentagesForDay(dayRecords, dayKey);
        
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
        
        const monthStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
        
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        const monthRecords = statusData?.filter(record => {
          const recordDate = new Date(record.timestamp_utc);
          return recordDate >= monthStart && recordDate <= monthEnd;
        }) || [];

        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        let monthlyProducing = 0;
        let monthlyIdle = 0;
        let monthlyFullWater = 0;
        let monthlyDisconnected = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dayDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), day, 0, 0, 0, 0));
          const dayEndBoundary = new Date(Date.UTC(date.getFullYear(), date.getMonth(), day, 23, 59, 59, 999));

          const dayRecordsInMonth = monthRecords.filter(record => {
            const recordDate = new Date(record.timestamp_utc);
            return recordDate >= dayDate && recordDate <= dayEndBoundary;
          });

          const dayStatus = calculateStatusPercentagesForDay(dayRecordsInMonth, `${day}/${date.getMonth() + 1}`);
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

      console.log('🔍 Final status data array:', statusDataArray);

      setData({
        dailyProductionData,
        monthlyProductionData,
        statusData: statusDataArray,
        monthlyStatusData,
        totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
      });

      console.log('✅ Production analytics data loaded with enhanced debugging');

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
