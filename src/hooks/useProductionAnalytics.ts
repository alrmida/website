
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

// Simplified status calculation
const calculateStatusPercentagesForDay = (records: any[]) => {
  if (records.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

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

  const totalRecords = records.length;
  
  const result = {
    fullWater: Math.round((fullWaterCount / totalRecords) * 100) || 0,
    producing: Math.round((producingCount / totalRecords) * 100) || 0,
    idle: Math.round((idleCount / totalRecords) * 100) || 0,
    disconnected: 0
  };

  // Ensure percentages add up to 100%
  const totalPercentage = result.producing + result.idle + result.fullWater + result.disconnected;
  if (totalPercentage !== 100 && totalPercentage > 0) {
    const diff = 100 - totalPercentage;
    if (result.fullWater >= result.producing && result.fullWater >= result.idle) {
      result.fullWater += diff;
    } else if (result.producing >= result.idle) {
      result.producing += diff;
    } else {
      result.idle += diff;
    }
  }

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
      // Fetch ALL production events for total calculation
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
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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

      setData({
        dailyProductionData,
        monthlyProductionData,
        statusData: statusDataArray,
        monthlyStatusData,
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
