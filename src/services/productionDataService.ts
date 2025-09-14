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
    // Get total production using SQL SUM aggregation
    const { data: totalData, error: totalError } = await supabase
      .rpc('get_total_production', { p_machine_id: machineId });

    if (totalError) throw totalError;
    const totalAllTimeProduction = totalData || 0;

    // Get daily aggregated data using SQL DATE_TRUNC
    const { data: dailyData, error: dailyError } = await supabase
      .rpc('get_daily_production', { 
        p_machine_id: machineId,
        p_days: 7
      });

    if (dailyError) throw dailyError;

    // Format daily data for chart
    const dailyProductionData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const dayData = dailyData?.find(d => {
        const dataDate = new Date(d.day);
        return dataDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) === dateKey;
      });
      return { date: dateKey, production: Math.round((dayData?.total_production || 0) * 10) / 10 };
    });

    // Get weekly aggregated data using SQL
    const { data: weeklyData, error: weeklyError } = await supabase
      .rpc('get_weekly_production', { 
        p_machine_id: machineId,
        p_weeks: 4
      });

    if (weeklyError) throw weeklyError;

    const weeklyProductionData = Array.from({ length: 4 }, (_, i) => {
      const weekKey = `Week ${i + 1}`;
      const weekData = weeklyData?.find(w => w.week_number === i + 1);
      return { week: weekKey, production: Math.round((weekData?.total_production || 0) * 10) / 10 };
    });

    // Get monthly aggregated data using SQL
    const { data: monthlyData, error: monthlyError } = await supabase
      .rpc('get_monthly_production', { 
        p_machine_id: machineId,
        p_months: 3
      });

    if (monthlyError) throw monthlyError;

    const monthlyProductionData = Array.from({ length: 3 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (2 - i));
      const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
      const monthData = monthlyData?.find(m => {
        const dataDate = new Date(m.month);
        return dataDate.toLocaleDateString('en-GB', { month: 'short' }) === monthKey;
      });
      return { month: monthKey, production: Math.round((monthData?.total_production || 0) * 10) / 10 };
    });

    // Get yearly aggregated data using SQL
    const { data: yearlyData, error: yearlyError } = await supabase
      .rpc('get_yearly_production', { 
        p_machine_id: machineId,
        p_years: 2
      });

    if (yearlyError) throw yearlyError;

    const yearlyProductionData = Array.from({ length: 2 }, (_, i) => {
      const year = (new Date().getFullYear() - (1 - i)).toString();
      const yearData = yearlyData?.find(y => y.year.toString() === year);
      return { year, production: Math.round((yearData?.total_production || 0) * 10) / 10 };
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