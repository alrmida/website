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
    // Get total production - fetch ALL events without limit
    const { data: totalData, error: totalError } = await supabase
      .from('water_production_events')
      .select('production_liters')
      .eq('machine_id', machineId)
      .gt('production_liters', 0);

    if (totalError) throw totalError;

    const totalAllTimeProduction = totalData?.reduce((sum, event) => 
      sum + Number(event.production_liters || 0), 0) || 0;

    // Get daily data (last 7 days) using SQL aggregation
    const { data: dailyData, error: dailyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gt('production_liters', 0)
      .gte('timestamp_utc', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (dailyError) throw dailyError;

    // Aggregate daily data
    const dailyMap = new Map<string, number>();
    dailyData?.forEach(event => {
      const date = new Date(event.timestamp_utc);
      const dateKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Number(event.production_liters));
    });

    const dailyProductionData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return { date: dateKey, production: Math.round((dailyMap.get(dateKey) || 0) * 10) / 10 };
    });

    // Get weekly data (last 4 weeks) using SQL aggregation
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gt('production_liters', 0)
      .gte('timestamp_utc', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (weeklyError) throw weeklyError;

    // Aggregate weekly data
    const weeklyMap = new Map<string, number>();
    weeklyData?.forEach(event => {
      const date = new Date(event.timestamp_utc);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = `Week ${Math.ceil((Date.now() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + Number(event.production_liters));
    });

    const weeklyProductionData = Array.from({ length: 4 }, (_, i) => {
      const weekKey = `Week ${i + 1}`;
      return { week: weekKey, production: Math.round((weeklyMap.get(weekKey) || 0) * 10) / 10 };
    });

    // Get monthly data (last 3 months) using SQL aggregation
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gt('production_liters', 0)
      .gte('timestamp_utc', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (monthlyError) throw monthlyError;

    // Aggregate monthly data
    const monthlyMap = new Map<string, number>();
    monthlyData?.forEach(event => {
      const date = new Date(event.timestamp_utc);
      const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + Number(event.production_liters));
    });

    const monthlyProductionData = Array.from({ length: 3 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (2 - i));
      const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
      return { month: monthKey, production: Math.round((monthlyMap.get(monthKey) || 0) * 10) / 10 };
    });

    // Get yearly data (last 2 years) using SQL aggregation
    const { data: yearlyData, error: yearlyError } = await supabase
      .from('water_production_events')
      .select(`
        timestamp_utc,
        production_liters
      `)
      .eq('machine_id', machineId)
      .gt('production_liters', 0)
      .gte('timestamp_utc', new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp_utc', { ascending: true });

    if (yearlyError) throw yearlyError;

    // Aggregate yearly data
    const yearlyMap = new Map<string, number>();
    yearlyData?.forEach(event => {
      const date = new Date(event.timestamp_utc);
      const yearKey = date.getFullYear().toString();
      yearlyMap.set(yearKey, (yearlyMap.get(yearKey) || 0) + Number(event.production_liters));
    });

    const yearlyProductionData = Array.from({ length: 2 }, (_, i) => {
      const year = (new Date().getFullYear() - (1 - i)).toString();
      return { year, production: Math.round((yearlyMap.get(year) || 0) * 10) / 10 };
    });

    return {
      dailyProductionData,
      weeklyProductionData,
      monthlyProductionData,
      yearlyProductionData,
      totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
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