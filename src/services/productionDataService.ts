import { supabase } from '@/integrations/supabase/client';
import { ProductionData, MonthlyProductionData } from '@/types/productionAnalytics';
import { 
  aggregateDailyToWeekly,
  aggregateWeeklyToMonthly,
  aggregateMonthlyToYearly,
  generateTimePeriodLabels,
  ProductionPoint
} from '@/utils/productionAggregation';

interface WeeklyProductionData {
  week: string;
  production: number;
}

interface YearlyProductionData {
  year: string;
  production: number;
}

export const fetchProductionData = async (machineId: string) => {
  console.log('🚀 [PRODUCTION SERVICE] Starting hierarchical production data fetch for machine:', machineId);
  
  if (!machineId || machineId.trim() === '') {
    console.warn('⚠️ [PRODUCTION SERVICE] Invalid machineId provided');
    const { dailyLabels, weeklyLabels, monthlyLabels, yearlyLabels } = generateTimePeriodLabels();
    
    return {
      dailyProductionData: dailyLabels.map(date => ({ date, production: 0 })),
      weeklyProductionData: weeklyLabels.map(week => ({ week, production: 0 })),
      monthlyProductionData: monthlyLabels.map(month => ({ month, production: 0 })),
      yearlyProductionData: yearlyLabels.map(year => ({ year, production: 0 })),
      totalAllTimeProduction: 0
    };
  }

  try {
    // Phase 1: Get ALL production events for total calculation (no date filtering)
    console.log('📡 [PRODUCTION SERVICE] Phase 1: Fetching ALL production events...');
    const { data: totalData, error: totalError } = await supabase
      .from('water_production_events')
      .select('production_liters, timestamp_utc')
      .eq('machine_id', machineId)
      .gt('production_liters', 0)
      .order('timestamp_utc', { ascending: true });

    if (totalError) {
      console.error('❌ [PRODUCTION SERVICE] Error fetching total:', totalError);
      throw totalError;
    }

    console.log('🔍 [PRODUCTION SERVICE] ALL events fetched:', totalData?.length || 0);
    
    const totalAllTimeProduction = totalData?.reduce((sum, event) => {
      const production = Number(event.production_liters || 0);
      return sum + production;
    }, 0) || 0;

    console.log('📈 [PRODUCTION SERVICE] Raw total from ALL events:', totalAllTimeProduction);
    console.log('📈 [PRODUCTION SERVICE] Sample events:', totalData?.slice(0, 3));
    console.log('📈 [PRODUCTION SERVICE] Sample recent events:', totalData?.slice(-3));

    // Phase 2: Get sufficient recent data for hierarchical aggregation (90 days)
    console.log('📡 [PRODUCTION SERVICE] Phase 2: Fetching recent events for aggregation...');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentEvents = totalData?.filter(event => 
      new Date(event.timestamp_utc) >= ninetyDaysAgo
    ) || [];

    console.log('📊 [PRODUCTION SERVICE] Recent events for aggregation:', {
      total: totalData?.length || 0,
      recent90Days: recentEvents.length,
      dateRange: recentEvents.length > 0 ? {
        from: recentEvents[0]?.timestamp_utc,
        to: recentEvents[recentEvents.length - 1]?.timestamp_utc
      } : 'No recent data'
    });

    // Phase 3: Aggregate by day using JavaScript Date
    console.log('📡 [PRODUCTION SERVICE] Phase 3: Creating daily aggregation...');
    const dailyMap = new Map<string, number>();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    recentEvents.forEach(event => {
      const date = new Date(event.timestamp_utc);
      const dateKey = `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Number(event.production_liters));
    });

    console.log('🗓️ [PRODUCTION SERVICE] Daily aggregation map:', Array.from(dailyMap.entries()).slice(-7));

    // Phase 4: Create production points for hierarchical aggregation
    let allDailyPoints: ProductionPoint[] = [];
    
    if (dailyMap.size > 0) {
      // Create production points from all data with proper sorting
      allDailyPoints = Array.from(dailyMap.entries())
        .map(([date, production]) => ({
          date,
          production: Math.round(production * 10) / 10
        }))
        .sort((a, b) => {
          // Parse dates for proper sorting
          const parseDate = (dateStr: string) => {
            const [day, month] = dateStr.split(' ');
            const monthIndex = MONTHS.indexOf(month);
            const year = new Date().getFullYear();
            return new Date(year, monthIndex, parseInt(day));
          };
          return parseDate(a.date).getTime() - parseDate(b.date).getTime();
        });
    }

    // Phase 5: Extract data for different time periods
    const dailyProductionData = allDailyPoints.slice(-7); // Last 7 days
    
    // Phase 6: Hierarchical aggregation
    console.log('📡 [PRODUCTION SERVICE] Phase 6: Hierarchical aggregation...');
    const weeklyPoints = aggregateDailyToWeekly(allDailyPoints);
    const monthlyPoints = aggregateWeeklyToMonthly(weeklyPoints);
    const yearlyPoints = aggregateMonthlyToYearly(monthlyPoints);
    
    // Extract the required time periods
    const weeklyProductionData = weeklyPoints.slice(-4); // Last 4 weeks
    const monthlyProductionData = monthlyPoints.slice(-3); // Last 3 months
    const yearlyProductionData = yearlyPoints.slice(-2); // Last 2 years

    // Phase 7: Ensure proper fallback data if needed
    const { dailyLabels, weeklyLabels, monthlyLabels, yearlyLabels } = generateTimePeriodLabels();
    
    const fillMissingPeriods = (actual: any[], expected: string[], keyField: string) => {
      const result = [...actual];
      
      while (result.length < expected.length) {
        const missingLabel = expected[expected.length - result.length - 1];
        result.unshift({
          [keyField]: missingLabel,
          production: 0
        });
      }
      
      return result.slice(-expected.length);
    };

    const finalDailyData = fillMissingPeriods(dailyProductionData, dailyLabels, 'date');
    const finalWeeklyData = fillMissingPeriods(weeklyProductionData, weeklyLabels, 'week');
    const finalMonthlyData = fillMissingPeriods(monthlyProductionData, monthlyLabels, 'month');
    const finalYearlyData = fillMissingPeriods(yearlyProductionData, yearlyLabels, 'year');

    const finalResult = {
      dailyProductionData: finalDailyData,
      weeklyProductionData: finalWeeklyData,
      monthlyProductionData: finalMonthlyData,
      yearlyProductionData: finalYearlyData,
      totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
    };

    console.log('🎯 [PRODUCTION SERVICE] HIERARCHICAL AGGREGATION COMPLETE:', {
      totalEvents: totalData?.length || 0,
      totalProduction: finalResult.totalAllTimeProduction,
      dailyPoints: finalResult.dailyProductionData.length,
      weeklyPoints: finalResult.weeklyProductionData.length,
      monthlyPoints: finalResult.monthlyProductionData.length,
      yearlyPoints: finalResult.yearlyProductionData.length,
      sampleDaily: finalResult.dailyProductionData.slice(-2),
      sampleWeekly: finalResult.weeklyProductionData.slice(-2)
    });
    
    return finalResult;

  } catch (error) {
    console.error('❌ [PRODUCTION SERVICE] Unexpected error:', error);
    
    // Return safe fallback data
    const { dailyLabels, weeklyLabels, monthlyLabels, yearlyLabels } = generateTimePeriodLabels();
    
    const fallbackData = {
      dailyProductionData: dailyLabels.map(date => ({ date, production: 0 })),
      weeklyProductionData: weeklyLabels.map(week => ({ week, production: 0 })),
      monthlyProductionData: monthlyLabels.map(month => ({ month, production: 0 })),
      yearlyProductionData: yearlyLabels.map(year => ({ year, production: 0 })),
      totalAllTimeProduction: 0
    };

    console.log('🔄 [PRODUCTION SERVICE] Returning fallback data due to error');
    return fallbackData;
  }
};