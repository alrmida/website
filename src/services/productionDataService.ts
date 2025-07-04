
import { supabase } from '@/integrations/supabase/client';
import { ProductionData, MonthlyProductionData } from '@/types/productionAnalytics';

export const fetchProductionData = async (machineId: string) => {
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

  return {
    dailyProductionData,
    monthlyProductionData,
    totalAllTimeProduction: Math.round(totalAllTimeProduction * 10) / 10
  };
};
