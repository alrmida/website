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
    console.log(`🔍 [PRODUCTION SERVICE] Fetching production data for machine: ${machineId}`);
    
    // 1. Get total production from summary table (fast)
    let totalAllTimeProduction = 0;
    const { data: totalSummary, error: totalSummaryError } = await supabase
      .from('machine_production_totals')
      .select('total_production_liters')
      .eq('machine_id', machineId)
      .maybeSingle();

    if (totalSummaryError && totalSummaryError.code !== 'PGRST116') {
      throw totalSummaryError;
    }

    if (totalSummary) {
      totalAllTimeProduction = Number(totalSummary.total_production_liters);
      console.log(`✅ [PRODUCTION SERVICE] Total from summary table:`, totalAllTimeProduction);
    } else {
      // Fallback to calculating from events if summary doesn't exist
      console.log(`⚠️ [PRODUCTION SERVICE] No summary data, calculating from events...`);
      const { data: totalData, error: totalError } = await supabase
        .from('water_production_events')
        .select('production_liters')
        .eq('machine_id', machineId)
        .gt('production_liters', 0);

      if (totalError) throw totalError;
      
      totalAllTimeProduction = totalData?.reduce((sum, event) => {
        return sum + Number(event.production_liters);
      }, 0) || 0;
    }

    // 2. Get daily data from summary table (fast)
    let dailyProductionData = [];
    const { data: dailySummaries, error: dailyError } = await supabase
      .from('daily_production_summary')
      .select('date, total_production_liters')
      .eq('machine_id', machineId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (dailyError) throw dailyError;

    if (dailySummaries && dailySummaries.length > 0) {
      // Use summary data
      const dailyMap = new Map(
        dailySummaries.map(s => [s.date, Number(s.total_production_liters)])
      );
      
      dailyProductionData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateKey = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return { 
          date: displayDate, 
          production: Math.round((dailyMap.get(dateKey) || 0) * 10) / 10 
        };
      });
    } else {
      // Fallback to manual calculation
      console.log(`⚠️ [PRODUCTION SERVICE] No daily summaries, calculating manually...`);
      const { data: dailyData, error: dailyFallbackError } = await supabase
        .from('water_production_events')
        .select('timestamp_utc, production_liters')
        .eq('machine_id', machineId)
        .gte('timestamp_utc', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp_utc', { ascending: true });

      if (dailyFallbackError) throw dailyFallbackError;

      const dailyAggregated: { [key: string]: number } = {};
      dailyData?.forEach(event => {
        const eventDate = new Date(event.timestamp_utc);
        const dateKey = eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        dailyAggregated[dateKey] = (dailyAggregated[dateKey] || 0) + Number(event.production_liters);
      });

      dailyProductionData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateKey = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return { date: dateKey, production: Math.round((dailyAggregated[dateKey] || 0) * 10) / 10 };
      });
    }

    // 3. Get weekly data from summary table
    let weeklyProductionData = [];
    const { data: weeklySummaries, error: weeklyError } = await supabase
      .from('weekly_production_summary')
      .select('week_start, total_production_liters')
      .eq('machine_id', machineId)
      .gte('week_start', new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('week_start', { ascending: true });

    if (weeklyError) throw weeklyError;

    if (weeklySummaries && weeklySummaries.length > 0) {
      weeklyProductionData = weeklySummaries.slice(-4).map((summary, i) => ({
        week: `Week ${i + 1}`,
        production: Math.round(Number(summary.total_production_liters) * 10) / 10
      }));
      
      // Pad with zeros if needed
      while (weeklyProductionData.length < 4) {
        weeklyProductionData.unshift({ 
          week: `Week ${weeklyProductionData.length + 1}`, 
          production: 0 
        });
      }
    } else {
      // Fallback to zero data
      weeklyProductionData = Array.from({ length: 4 }, (_, i) => ({ 
        week: `Week ${i + 1}`, 
        production: 0 
      }));
    }

    // 4. Get monthly data from summary table
    let monthlyProductionData = [];
    const { data: monthlySummaries, error: monthlyError } = await supabase
      .from('monthly_production_summary')
      .select('month_year, total_production_liters')
      .eq('machine_id', machineId)
      .gte('month_year', new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('month_year', { ascending: true });

    if (monthlyError) throw monthlyError;

    if (monthlySummaries && monthlySummaries.length > 0) {
      monthlyProductionData = monthlySummaries.slice(-3).map(summary => {
        const date = new Date(summary.month_year);
        return {
          month: date.toLocaleDateString('en-GB', { month: 'short' }),
          production: Math.round(Number(summary.total_production_liters) * 10) / 10
        };
      });
      
      // Pad with zeros if needed
      while (monthlyProductionData.length < 3) {
        const date = new Date();
        date.setMonth(date.getMonth() - (3 - monthlyProductionData.length));
        monthlyProductionData.unshift({
          month: date.toLocaleDateString('en-GB', { month: 'short' }),
          production: 0
        });
      }
    } else {
      // Fallback to zero data
      monthlyProductionData = Array.from({ length: 3 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (2 - i));
        return { 
          month: date.toLocaleDateString('en-GB', { month: 'short' }), 
          production: 0 
        };
      });
    }

    // 5. Get yearly data from summary table
    let yearlyProductionData = [];
    const { data: yearlySummaries, error: yearlyError } = await supabase
      .from('yearly_production_summary')
      .select('year, total_production_liters')
      .eq('machine_id', machineId)
      .gte('year', new Date().getFullYear() - 1)
      .order('year', { ascending: true });

    if (yearlyError) throw yearlyError;

    if (yearlySummaries && yearlySummaries.length > 0) {
      yearlyProductionData = yearlySummaries.slice(-2).map(summary => ({
        year: summary.year.toString(),
        production: Math.round(Number(summary.total_production_liters) * 10) / 10
      }));
      
      // Pad with zeros if needed
      while (yearlyProductionData.length < 2) {
        const year = new Date().getFullYear() - (2 - yearlyProductionData.length);
        yearlyProductionData.unshift({
          year: year.toString(),
          production: 0
        });
      }
    } else {
      // Fallback to zero data
      yearlyProductionData = Array.from({ length: 2 }, (_, i) => {
        const year = new Date().getFullYear() - (1 - i);
        return { year: year.toString(), production: 0 };
      });
    }

    console.log(`✅ [PRODUCTION SERVICE] Using summary tables:`, {
      total: totalAllTimeProduction,
      dailyPoints: dailyProductionData.length,
      weeklyPoints: weeklyProductionData.length,
      monthlyPoints: monthlyProductionData.length,
      yearlyPoints: yearlyProductionData.length
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