import { supabase } from '@/integrations/supabase/client';

interface WeeklyProductionData {
  week: string;
  production: number;
}

interface YearlyProductionData {
  year: string;
  production: number;
}

export const fetchProductionData = async (machineId: string) => {
  if (!machineId || machineId.trim() === '') {
    return {
      dailyProductionData: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return { date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), production: 0 };
      }),
      weeklyProductionData: Array.from({ length: 4 }, (_, i) => ({ week: `Week ${i + 1}`, production: 0 })),
      monthlyProductionData: Array.from({ length: 3 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (2 - i));
        return { month: date.toLocaleDateString('en-GB', { month: 'short' }), production: 0 };
      }),
      yearlyProductionData: Array.from({ length: 2 }, (_, i) => {
        const year = new Date().getFullYear() - (1 - i);
        return { year: year.toString(), production: 0 };
      }),
      totalAllTimeProduction: 0
    };
  }

  try {
    // Get total production using filtered fetch and JavaScript sum
    const { data: totalData, error: totalError } = await supabase
      .from('water_production_events')
      .select('production_liters')
      .eq('machine_id', machineId)
      .gt('production_liters', 0);

    if (totalError) throw totalError;
    const totalAllTimeProduction = totalData?.reduce((sum, event) => sum + Number(event.production_liters), 0) || 0;

    // Get daily production using SQL DATE_TRUNC aggregation
    const { data: dailyData, error: dailyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gte('timestamp_utc', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (dailyError) throw dailyError;

    // Aggregate daily data manually
    const dailyAggregated: { [key: string]: number } = {};
    dailyData?.forEach(event => {
      const eventDate = new Date(event.timestamp_utc);
      const dateKey = eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      dailyAggregated[dateKey] = (dailyAggregated[dateKey] || 0) + Number(event.production_liters);
    });

    // Format daily data for chart
    const dailyProductionData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return { date: dateKey, production: Math.round((dailyAggregated[dateKey] || 0) * 10) / 10 };
    });

    // Get weekly production data
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gte('timestamp_utc', new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (weeklyError) throw weeklyError;

    // Aggregate weekly data manually
    const weeklyAggregated: { [key: number]: number } = {};
    weeklyData?.forEach(event => {
      const eventDate = new Date(event.timestamp_utc);
      const weekOfYear = Math.ceil((eventDate.getTime() - new Date(eventDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      weeklyAggregated[weekOfYear] = (weeklyAggregated[weekOfYear] || 0) + Number(event.production_liters);
    });

    const weeklyProductionData = Array.from({ length: 4 }, (_, i) => {
      const weekKey = `Week ${i + 1}`;
      const currentWeek = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const targetWeek = currentWeek - (3 - i);
      return { week: weekKey, production: Math.round((weeklyAggregated[targetWeek] || 0) * 10) / 10 };
    });

    // Get monthly production data
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gte('timestamp_utc', new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (monthlyError) throw monthlyError;

    // Aggregate monthly data manually
    const monthlyAggregated: { [key: string]: number } = {};
    monthlyData?.forEach(event => {
      const eventDate = new Date(event.timestamp_utc);
      const monthKey = eventDate.toLocaleDateString('en-GB', { month: 'short' });
      monthlyAggregated[monthKey] = (monthlyAggregated[monthKey] || 0) + Number(event.production_liters);
    });

    const monthlyProductionData = Array.from({ length: 3 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (2 - i));
      const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
      return { month: monthKey, production: Math.round((monthlyAggregated[monthKey] || 0) * 10) / 10 };
    });

    // Get yearly production data
    const { data: yearlyData, error: yearlyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gte('timestamp_utc', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (yearlyError) throw yearlyError;

    // Aggregate yearly data manually
    const yearlyAggregated: { [key: string]: number } = {};
    yearlyData?.forEach(event => {
      const eventDate = new Date(event.timestamp_utc);
      const yearKey = eventDate.getFullYear().toString();
      yearlyAggregated[yearKey] = (yearlyAggregated[yearKey] || 0) + Number(event.production_liters);
    });

    const yearlyProductionData = Array.from({ length: 2 }, (_, i) => {
      const year = (new Date().getFullYear() - (1 - i)).toString();
      return { year, production: Math.round((yearlyAggregated[year] || 0) * 10) / 10 };
    });

    return {
      dailyProductionData,
      weeklyProductionData,
      monthlyProductionData,
      yearlyProductionData,
      totalAllTimeProduction: Math.round(Number(totalAllTimeProduction) * 10) / 10
    };

  } catch (error) {
    console.error('❌ [PRODUCTION SERVICE] Error:', error);
    
    return {
      dailyProductionData: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return { date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), production: 0 };
      }),
      weeklyProductionData: Array.from({ length: 4 }, (_, i) => ({ week: `Week ${i + 1}`, production: 0 })),
      monthlyProductionData: Array.from({ length: 3 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (2 - i));
        return { month: date.toLocaleDateString('en-GB', { month: 'short' }), production: 0 };
      }),
      yearlyProductionData: Array.from({ length: 2 }, (_, i) => {
        const year = new Date().getFullYear() - (1 - i);
        return { year: year.toString(), production: 0 };
      }),
      totalAllTimeProduction: 0
    };
  }
};