import { supabase } from '@/integrations/supabase/client';
import { ProductionData, MonthlyProductionData } from '@/types/productionAnalytics';

interface WeeklyProductionData {
  week: string;
  production: number;
}

interface YearlyProductionData {
  year: string;
  production: number;
}

export const fetchProductionData = async (machineId: string) => {
  console.log('🚀 [SIMPLIFIED PRODUCTION] Fetching data for machine:', machineId);
  
  if (!machineId || machineId.trim() === '') {
    console.warn('⚠️ [SIMPLIFIED PRODUCTION] Invalid machineId provided');
    return {
      dailyProductionData: [],
      weeklyProductionData: [],
      monthlyProductionData: [],
      yearlyProductionData: [],
      totalAllTimeProduction: 0
    };
  }

  try {
    // Get ALL production events for total calculation (no date filtering)
    const { data: totalData, error: totalError } = await supabase
      .from('water_production_events')
      .select('production_liters')
      .eq('machine_id', machineId)
      .gt('production_liters', 0)
      .limit(10000); // Ensure we get all events, not just default 1000

    if (totalError) {
      console.error('❌ [SIMPLIFIED PRODUCTION] Error fetching total:', totalError);
      throw totalError;
    }

    console.log('🔍 [SIMPLIFIED PRODUCTION] Total events fetched:', totalData?.length || 0);
    
    const totalAllTimeProduction = totalData?.reduce((sum, event) => {
      const production = Number(event.production_liters || 0);
      return sum + production;
    }, 0) || 0;

    console.log('📈 [SIMPLIFIED PRODUCTION] Raw total from all events:', totalAllTimeProduction);
    console.log('📈 [SIMPLIFIED PRODUCTION] Sample events:', totalData?.slice(0, 3));

    // Get last 30 days of production events to ensure we have recent data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentEvents, error: recentError } = await supabase
      .from('water_production_events')
      .select('production_liters, timestamp_utc')
      .eq('machine_id', machineId)
      .gt('production_liters', 0)
      .gte('timestamp_utc', thirtyDaysAgo.toISOString())
      .order('timestamp_utc', { ascending: true });

    if (recentError) {
      console.error('❌ [SIMPLIFIED PRODUCTION] Error fetching recent events:', recentError);
      throw recentError;
    }

    console.log('📊 [SIMPLIFIED PRODUCTION] Recent events:', {
      count: recentEvents?.length || 0,
      sample: recentEvents?.slice(-3)
    });

    // Simple aggregation by day using JavaScript Date
    const dailyMap = new Map<string, number>();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    recentEvents?.forEach(event => {
      const date = new Date(event.timestamp_utc);
      const dateKey = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Number(event.production_liters));
    });

    console.log('🗓️ [SIMPLIFIED PRODUCTION] Daily aggregation:', Array.from(dailyMap.entries()));

    // Get the most recent 7 days that have data, fallback to last 7 calendar days
    let dailyProductionData: ProductionData[] = [];
    
    if (dailyMap.size > 0) {
      // Use dates that have actual data
      const sortedDates = Array.from(dailyMap.entries())
        .sort((a, b) => {
          // Simple sort by parsing date strings - not perfect but works for recent data
          const aMonth = MONTHS.indexOf(a[0].split(' ')[1]);
          const aDay = parseInt(a[0].split(' ')[0]);
          const bMonth = MONTHS.indexOf(b[0].split(' ')[1]);
          const bDay = parseInt(b[0].split(' ')[0]);
          
          if (aMonth !== bMonth) return aMonth - bMonth;
          return aDay - bDay;
        })
        .slice(-7); // Take last 7 days with data
      
      dailyProductionData = sortedDates.map(([date, production]) => ({
        date,
        production: Math.round(production * 10) / 10
      }));
    } else {
      // Fallback: show last 7 calendar days with 0 production
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dayKey = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
        dailyProductionData.push({
          date: dayKey,
          production: 0
        });
      }
    }

    console.log('✅ [SIMPLIFIED PRODUCTION] Final daily data:', dailyProductionData);
    console.log('📊 [SIMPLIFIED PRODUCTION] FINAL RESULT - Returning total:', Math.round(totalAllTimeProduction * 10) / 10);

    // For now, return simplified weekly/monthly/yearly (can be enhanced later)
    const weeklyProductionData: WeeklyProductionData[] = [];
    const monthlyProductionData: MonthlyProductionData[] = [];
    const yearlyProductionData: YearlyProductionData[] = [];

    const finalResult = {
      dailyProductionData,
      weeklyProductionData,
      monthlyProductionData,
      yearlyProductionData,
      totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
    };

    console.log('🎯 [SIMPLIFIED PRODUCTION] COMPLETE RESULT:', finalResult);
    return finalResult;

  } catch (error) {
    console.error('❌ [SIMPLIFIED PRODUCTION] Unexpected error:', error);
    throw error;
  }
};