import { supabase } from '@/integrations/supabase/client';

export interface ProductionSummaryData {
  dailyProductionData: Array<{ date: string; production: number }>;
  weeklyProductionData: Array<{ week: string; production: number }>;
  monthlyProductionData: Array<{ month: string; production: number }>;
  yearlyProductionData: Array<{ year: string; production: number }>;
  totalAllTimeProduction: number;
}

export interface StatusSummaryData {
  statusData: Array<{
    date: string;
    producing: number;
    idle: number;
    fullWater: number;
    disconnected: number;
  }>;
  weeklyStatusData: Array<{
    week: string;
    producing: number;
    idle: number;
    fullWater: number;
    disconnected: number;
  }>;
  monthlyStatusData: Array<{
    month: string;
    producing: number;
    idle: number;
    fullWater: number;
    disconnected: number;
  }>;
  yearlyStatusData: Array<{
    year: string;
    producing: number;
    idle: number;
    fullWater: number;
    disconnected: number;
  }>;
}

/**
 * Fetch pre-aggregated production data from summary tables
 * This replaces the expensive real-time calculations with fast lookups
 */
export const fetchProductionSummaryData = async (machineId: string): Promise<ProductionSummaryData> => {
  console.log('📊 Fetching production summary data for machine:', machineId);

  try {
    // Fetch all summary data in parallel for maximum speed
    const [dailyResult, weeklyResult, monthlyResult, yearlyResult, totalResult] = await Promise.all([
      // Daily data - last 7 days for charts
      supabase
        .from('daily_production_summary')
        .select('date, total_production_liters')
        .eq('machine_id', machineId)
        .order('date', { ascending: false })
        .limit(7),
      
      // Weekly data - last 4 weeks
      supabase
        .from('weekly_production_summary')
        .select('week_start, week_number, week_year, total_production_liters')
        .eq('machine_id', machineId)
        .order('week_start', { ascending: false })
        .limit(4),
      
      // Monthly data - last 3 months
      supabase
        .from('monthly_production_summary')
        .select('month_year, total_production_liters')
        .eq('machine_id', machineId)
        .order('month_year', { ascending: false })
        .limit(3),
      
      // Yearly data - last 2 years
      supabase
        .from('yearly_production_summary')
        .select('year, total_production_liters')
        .eq('machine_id', machineId)
        .order('year', { ascending: false })
        .limit(2),
      
      // Total production
      supabase
        .from('machine_production_totals')
        .select('total_production_liters')
        .eq('machine_id', machineId)
        .single()
    ]);

    // Handle errors
    if (dailyResult.error) throw dailyResult.error;
    if (weeklyResult.error) throw weeklyResult.error;
    if (monthlyResult.error) throw monthlyResult.error;
    if (yearlyResult.error) throw yearlyResult.error;
    if (totalResult.error && totalResult.error.code !== 'PGRST116') throw totalResult.error;

    // Transform daily data (reverse to show chronologically)
    const dailyProductionData = (dailyResult.data || [])
      .reverse()
      .map(item => ({
        date: item.date,
        production: Number(item.total_production_liters)
      }));

    // Transform weekly data
    const weeklyProductionData = (weeklyResult.data || [])
      .reverse()
      .map(item => ({
        week: `Week ${item.week_number}`,
        production: Number(item.total_production_liters)
      }));

    // Transform monthly data
    const monthlyProductionData = (monthlyResult.data || [])
      .reverse()
      .map(item => {
        const date = new Date(item.month_year);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        return {
          month: monthName,
          production: Number(item.total_production_liters)
        };
      });

    // Transform yearly data
    const yearlyProductionData = (yearlyResult.data || [])
      .reverse()
      .map(item => ({
        year: item.year.toString(),
        production: Number(item.total_production_liters)
      }));

    const totalAllTimeProduction = totalResult.data 
      ? Number(totalResult.data.total_production_liters)
      : 0;

    const result: ProductionSummaryData = {
      dailyProductionData,
      weeklyProductionData,
      monthlyProductionData,
      yearlyProductionData,
      totalAllTimeProduction
    };

    console.log('✅ Production summary data fetched successfully:', {
      daily: dailyProductionData.length,
      weekly: weeklyProductionData.length,
      monthly: monthlyProductionData.length,
      yearly: yearlyProductionData.length,
      total: totalAllTimeProduction
    });

    return result;

  } catch (error) {
    console.error('❌ Error fetching production summary data:', error);
    throw error;
  }
};

/**
 * Fetch pre-aggregated status data from summary tables
 */
export const fetchStatusSummaryData = async (machineId: string): Promise<StatusSummaryData> => {
  console.log('📊 Fetching status summary data for machine:', machineId);

  try {
    // Fetch status data from summary tables
    const [dailyResult, weeklyResult, monthlyResult, yearlyResult] = await Promise.all([
      // Daily status data - last 7 days
      supabase
        .from('daily_production_summary')
        .select('date, producing_percentage, idle_percentage, full_water_percentage, disconnected_percentage')
        .eq('machine_id', machineId)
        .order('date', { ascending: false })
        .limit(7),
      
      // Weekly status data - last 4 weeks
      supabase
        .from('weekly_production_summary')
        .select('week_start, week_number, producing_percentage, idle_percentage, full_water_percentage, disconnected_percentage')
        .eq('machine_id', machineId)
        .order('week_start', { ascending: false })
        .limit(4),
      
      // Monthly status data - last 3 months
      supabase
        .from('monthly_production_summary')
        .select('month_year, producing_percentage, idle_percentage, full_water_percentage, disconnected_percentage')
        .eq('machine_id', machineId)
        .order('month_year', { ascending: false })
        .limit(3),
      
      // Yearly status data - last 2 years
      supabase
        .from('yearly_production_summary')
        .select('year, producing_percentage, idle_percentage, full_water_percentage, disconnected_percentage')
        .eq('machine_id', machineId)
        .order('year', { ascending: false })
        .limit(2)
    ]);

    // Handle errors
    if (dailyResult.error) throw dailyResult.error;
    if (weeklyResult.error) throw weeklyResult.error;
    if (monthlyResult.error) throw monthlyResult.error;
    if (yearlyResult.error) throw yearlyResult.error;

    // Transform daily status data
    const statusData = (dailyResult.data || [])
      .reverse()
      .map(item => ({
        date: item.date,
        producing: Number(item.producing_percentage),
        idle: Number(item.idle_percentage),
        fullWater: Number(item.full_water_percentage),
        disconnected: Number(item.disconnected_percentage)
      }));

    // Transform weekly status data
    const weeklyStatusData = (weeklyResult.data || [])
      .reverse()
      .map(item => ({
        week: `Week ${item.week_start}`,
        producing: Number(item.producing_percentage),
        idle: Number(item.idle_percentage),
        fullWater: Number(item.full_water_percentage),
        disconnected: Number(item.disconnected_percentage)
      }));

    // Transform monthly status data
    const monthlyStatusData = (monthlyResult.data || [])
      .reverse()
      .map(item => {
        const date = new Date(item.month_year);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        return {
          month: monthName,
          producing: Number(item.producing_percentage),
          idle: Number(item.idle_percentage),
          fullWater: Number(item.full_water_percentage),
          disconnected: Number(item.disconnected_percentage)
        };
      });

    // Transform yearly status data
    const yearlyStatusData = (yearlyResult.data || [])
      .reverse()
      .map(item => ({
        year: item.year.toString(),
        producing: Number(item.producing_percentage),
        idle: Number(item.idle_percentage),
        fullWater: Number(item.full_water_percentage),
        disconnected: Number(item.disconnected_percentage)
      }));

    const result: StatusSummaryData = {
      statusData,
      weeklyStatusData,
      monthlyStatusData,
      yearlyStatusData
    };

    console.log('✅ Status summary data fetched successfully:', {
      daily: statusData.length,
      weekly: weeklyStatusData.length,
      monthly: monthlyStatusData.length,
      yearly: yearlyStatusData.length
    });

    return result;

  } catch (error) {
    console.error('❌ Error fetching status summary data:', error);
    throw error;
  }
};

/**
 * Trigger production data aggregation for a specific machine
 * This should be called periodically or when new data is detected
 */
export const triggerProductionAggregation = async (machineId?: string, mode: 'incremental' | 'backfill' = 'incremental') => {
  console.log(`🔄 Triggering ${mode} production aggregation${machineId ? ` for machine ${machineId}` : ' for all machines'}`);

  try {
    const { data, error } = await supabase.functions.invoke('aggregate-production-data', {
      body: { machine_id: machineId, mode }
    });

    if (error) {
      throw error;
    }

    console.log('✅ Production aggregation completed:', data);
    return data;

  } catch (error) {
    console.error('❌ Error triggering production aggregation:', error);
    throw error;
  }
};