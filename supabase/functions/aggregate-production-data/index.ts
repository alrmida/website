import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Database interface for production events
interface ProductionEvent {
  id: string;
  machine_id: string;
  production_liters: number;
  event_type: string;
  timestamp_utc: string;
  current_level: number;
  previous_level: number;
}

// Database interface for raw machine data
interface RawMachineData {
  machine_id: string;
  timestamp_utc: string;
  full_tank: boolean;
  producing_water: boolean;
  compressor_on: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting production data aggregation job');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mode = 'incremental', machine_id = null } = await req.json().catch(() => ({}));
    
    console.log(`📊 Running aggregation in ${mode} mode${machine_id ? ` for machine ${machine_id}` : ' for all machines'}`);

    // Get all machines or specific machine
    const machinesQuery = supabase
      .from('machines')
      .select('machine_id');
    
    if (machine_id) {
      machinesQuery.eq('machine_id', machine_id);
    }
    
    const { data: machines, error: machinesError } = await machinesQuery;
    
    if (machinesError) {
      throw new Error(`Failed to fetch machines: ${machinesError.message}`);
    }

    console.log(`🔍 Processing ${machines?.length || 0} machines`);

    const results = [];

    for (const machine of machines || []) {
      try {
        console.log(`📈 Processing machine: ${machine.machine_id}`);
        
        // Determine time range for processing
        let timeRangeStart: Date;
        
        if (mode === 'backfill') {
          // For backfill, start from the beginning of data
          const { data: firstEvent } = await supabase
            .from('water_production_events')
            .select('timestamp_utc')
            .eq('machine_id', machine.machine_id)
            .order('timestamp_utc', { ascending: true })
            .limit(1)
            .single();
          
          timeRangeStart = firstEvent ? new Date(firstEvent.timestamp_utc) : new Date();
          console.log(`🔙 Backfill mode: Starting from ${timeRangeStart.toISOString()}`);
        } else {
          // For incremental, start from last update or 24 hours ago
          const { data: lastUpdate } = await supabase
            .from('machine_production_totals')
            .select('last_updated')
            .eq('machine_id', machine.machine_id)
            .single();
          
          timeRangeStart = lastUpdate?.last_updated 
            ? new Date(lastUpdate.last_updated)
            : new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
          
          console.log(`⚡ Incremental mode: Starting from ${timeRangeStart.toISOString()}`);
        }

        // Aggregate production data by time periods
        await aggregateProductionData(supabase, machine.machine_id, timeRangeStart, mode === 'backfill');
        
        // Update machine total production
        await updateMachineTotal(supabase, machine.machine_id);
        
        results.push({
          machine_id: machine.machine_id,
          status: 'success',
          processed_from: timeRangeStart.toISOString()
        });
        
        console.log(`✅ Successfully processed machine: ${machine.machine_id}`);
        
      } catch (machineError) {
        console.error(`❌ Error processing machine ${machine.machine_id}:`, machineError);
        results.push({
          machine_id: machine.machine_id,
          status: 'error',
          error: machineError.message
        });
      }
    }

    console.log('🎉 Production data aggregation job completed');

    return new Response(JSON.stringify({
      success: true,
      mode,
      machines_processed: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Fatal error in aggregation job:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Production data aggregation failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function aggregateProductionData(supabase: any, machineId: string, fromDate: Date, isBackfill: boolean) {
  console.log(`📊 Aggregating production data for ${machineId} from ${fromDate.toISOString()}`);
  
  // Get production events in the time range
  const { data: events, error: eventsError } = await supabase
    .from('water_production_events')
    .select('*')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', fromDate.toISOString())
    .order('timestamp_utc', { ascending: true });

  if (eventsError) {
    throw new Error(`Failed to fetch production events: ${eventsError.message}`);
  }

  console.log(`📈 Found ${events?.length || 0} production events to process`);

  if (!events || events.length === 0) {
    console.log(`ℹ️ No production events found for ${machineId} since ${fromDate.toISOString()}`);
    return;
  }

  // Group events by different time periods
  const dailyGroups = groupEventsByDay(events);
  const weeklyGroups = groupEventsByWeek(events);
  const monthlyGroups = groupEventsByMonth(events);
  const yearlyGroups = groupEventsByYear(events);

  // Process daily summaries
  for (const [dateStr, dayEvents] of Object.entries(dailyGroups)) {
    await upsertDailySummary(supabase, machineId, dateStr, dayEvents as ProductionEvent[], isBackfill);
  }

  // Process weekly summaries
  for (const [weekStr, weekEvents] of Object.entries(weeklyGroups)) {
    await upsertWeeklySummary(supabase, machineId, weekStr, weekEvents as ProductionEvent[], isBackfill);
  }

  // Process monthly summaries
  for (const [monthStr, monthEvents] of Object.entries(monthlyGroups)) {
    await upsertMonthlySummary(supabase, machineId, monthStr, monthEvents as ProductionEvent[], isBackfill);
  }

  // Process yearly summaries
  for (const [yearStr, yearEvents] of Object.entries(yearlyGroups)) {
    await upsertYearlySummary(supabase, machineId, parseInt(yearStr), yearEvents as ProductionEvent[], isBackfill);
  }

  console.log(`✅ Completed aggregation for ${machineId}`);
}

function groupEventsByDay(events: ProductionEvent[]): Record<string, ProductionEvent[]> {
  const groups: Record<string, ProductionEvent[]> = {};
  
  for (const event of events) {
    const date = new Date(event.timestamp_utc);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(event);
  }
  
  return groups;
}

function groupEventsByWeek(events: ProductionEvent[]): Record<string, ProductionEvent[]> {
  const groups: Record<string, ProductionEvent[]> = {};
  
  for (const event of events) {
    const date = new Date(event.timestamp_utc);
    const monday = getMonday(date);
    const weekStr = monday.toISOString().split('T')[0]; // YYYY-MM-DD of Monday
    
    if (!groups[weekStr]) {
      groups[weekStr] = [];
    }
    groups[weekStr].push(event);
  }
  
  return groups;
}

function groupEventsByMonth(events: ProductionEvent[]): Record<string, ProductionEvent[]> {
  const groups: Record<string, ProductionEvent[]> = {};
  
  for (const event of events) {
    const date = new Date(event.timestamp_utc);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    
    if (!groups[monthStr]) {
      groups[monthStr] = [];
    }
    groups[monthStr].push(event);
  }
  
  return groups;
}

function groupEventsByYear(events: ProductionEvent[]): Record<string, ProductionEvent[]> {
  const groups: Record<string, ProductionEvent[]> = {};
  
  for (const event of events) {
    const date = new Date(event.timestamp_utc);
    const yearStr = date.getFullYear().toString();
    
    if (!groups[yearStr]) {
      groups[yearStr] = [];
    }
    groups[yearStr].push(event);
  }
  
  return groups;
}

function getMonday(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function upsertDailySummary(supabase: any, machineId: string, dateStr: string, events: ProductionEvent[], isBackfill: boolean) {
  const productionEvents = events.filter(e => e.event_type === 'production');
  const drainageEvents = events.filter(e => e.event_type === 'drainage');
  
  const totalProduction = productionEvents.reduce((sum, e) => sum + e.production_liters, 0);
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  // Get status breakdown for this day
  const statusBreakdown = await getStatusBreakdown(supabase, machineId, dateStr);

  const summaryData = {
    machine_id: machineId,
    date: dateStr,
    total_production_liters: totalProduction,
    production_events_count: productionEvents.length,
    drainage_events_count: drainageEvents.length,
    producing_percentage: statusBreakdown.producing,
    idle_percentage: statusBreakdown.idle,
    full_water_percentage: statusBreakdown.fullWater,
    disconnected_percentage: statusBreakdown.disconnected,
    first_event_time: firstEvent?.timestamp_utc,
    last_event_time: lastEvent?.timestamp_utc,
  };

  const { error } = await supabase
    .from('daily_production_summary')
    .upsert(summaryData, { 
      onConflict: 'machine_id,date',
      ignoreDuplicates: false 
    });

  if (error) {
    throw new Error(`Failed to upsert daily summary: ${error.message}`);
  }

  console.log(`📅 Updated daily summary for ${machineId} on ${dateStr}: ${totalProduction.toFixed(2)}L`);
}

async function upsertWeeklySummary(supabase: any, machineId: string, weekStartStr: string, events: ProductionEvent[], isBackfill: boolean) {
  const weekStart = new Date(weekStartStr);
  const weekYear = getISOWeekYear(weekStart);
  const weekNumber = getISOWeekNumber(weekStart);
  
  const productionEvents = events.filter(e => e.event_type === 'production');
  const drainageEvents = events.filter(e => e.event_type === 'drainage');
  
  const totalProduction = productionEvents.reduce((sum, e) => sum + e.production_liters, 0);
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  // Get average status breakdown for this week
  const statusBreakdown = await getWeeklyStatusBreakdown(supabase, machineId, weekStartStr);

  const summaryData = {
    machine_id: machineId,
    week_start: weekStartStr,
    week_year: weekYear,
    week_number: weekNumber,
    total_production_liters: totalProduction,
    production_events_count: productionEvents.length,
    drainage_events_count: drainageEvents.length,
    producing_percentage: statusBreakdown.producing,
    idle_percentage: statusBreakdown.idle,
    full_water_percentage: statusBreakdown.fullWater,
    disconnected_percentage: statusBreakdown.disconnected,
    first_event_time: firstEvent?.timestamp_utc,
    last_event_time: lastEvent?.timestamp_utc,
  };

  const { error } = await supabase
    .from('weekly_production_summary')
    .upsert(summaryData, { 
      onConflict: 'machine_id,week_start',
      ignoreDuplicates: false 
    });

  if (error) {
    throw new Error(`Failed to upsert weekly summary: ${error.message}`);
  }

  console.log(`📅 Updated weekly summary for ${machineId} week ${weekStartStr}: ${totalProduction.toFixed(2)}L`);
}

async function upsertMonthlySummary(supabase: any, machineId: string, monthStr: string, events: ProductionEvent[], isBackfill: boolean) {
  const monthDate = new Date(monthStr);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth() + 1;
  
  const productionEvents = events.filter(e => e.event_type === 'production');
  const drainageEvents = events.filter(e => e.event_type === 'drainage');
  
  const totalProduction = productionEvents.reduce((sum, e) => sum + e.production_liters, 0);
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  // Get average status breakdown for this month
  const statusBreakdown = await getMonthlyStatusBreakdown(supabase, machineId, monthStr);

  const summaryData = {
    machine_id: machineId,
    month_year: monthStr,
    year,
    month,
    total_production_liters: totalProduction,
    production_events_count: productionEvents.length,
    drainage_events_count: drainageEvents.length,
    producing_percentage: statusBreakdown.producing,
    idle_percentage: statusBreakdown.idle,
    full_water_percentage: statusBreakdown.fullWater,
    disconnected_percentage: statusBreakdown.disconnected,
    first_event_time: firstEvent?.timestamp_utc,
    last_event_time: lastEvent?.timestamp_utc,
  };

  const { error } = await supabase
    .from('monthly_production_summary')
    .upsert(summaryData, { 
      onConflict: 'machine_id,month_year',
      ignoreDuplicates: false 
    });

  if (error) {
    throw new Error(`Failed to upsert monthly summary: ${error.message}`);
  }

  console.log(`📅 Updated monthly summary for ${machineId} month ${monthStr}: ${totalProduction.toFixed(2)}L`);
}

async function upsertYearlySummary(supabase: any, machineId: string, year: number, events: ProductionEvent[], isBackfill: boolean) {
  const productionEvents = events.filter(e => e.event_type === 'production');
  const drainageEvents = events.filter(e => e.event_type === 'drainage');
  
  const totalProduction = productionEvents.reduce((sum, e) => sum + e.production_liters, 0);
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  // Get average status breakdown for this year
  const statusBreakdown = await getYearlyStatusBreakdown(supabase, machineId, year);

  const summaryData = {
    machine_id: machineId,
    year,
    total_production_liters: totalProduction,
    production_events_count: productionEvents.length,
    drainage_events_count: drainageEvents.length,
    producing_percentage: statusBreakdown.producing,
    idle_percentage: statusBreakdown.idle,
    full_water_percentage: statusBreakdown.fullWater,
    disconnected_percentage: statusBreakdown.disconnected,
    first_event_time: firstEvent?.timestamp_utc,
    last_event_time: lastEvent?.timestamp_utc,
  };

  const { error } = await supabase
    .from('yearly_production_summary')
    .upsert(summaryData, { 
      onConflict: 'machine_id,year',
      ignoreDuplicates: false 
    });

  if (error) {
    throw new Error(`Failed to upsert yearly summary: ${error.message}`);
  }

  console.log(`📅 Updated yearly summary for ${machineId} year ${year}: ${totalProduction.toFixed(2)}L`);
}

async function getStatusBreakdown(supabase: any, machineId: string, dateStr: string) {
  // Get raw machine data for the specific day to calculate status percentages
  const startDate = `${dateStr}T00:00:00.000Z`;
  const endDate = `${dateStr}T23:59:59.999Z`;
  
  const { data: rawData, error } = await supabase
    .from('raw_machine_data')
    .select('full_tank, producing_water, compressor_on')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', startDate)
    .lte('timestamp_utc', endDate);

  if (error || !rawData || rawData.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  return calculateStatusPercentages(rawData);
}

async function getWeeklyStatusBreakdown(supabase: any, machineId: string, weekStartStr: string) {
  const weekStart = new Date(weekStartStr);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  const { data: rawData, error } = await supabase
    .from('raw_machine_data')
    .select('full_tank, producing_water, compressor_on')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', weekStart.toISOString())
    .lte('timestamp_utc', weekEnd.toISOString());

  if (error || !rawData || rawData.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  return calculateStatusPercentages(rawData);
}

async function getMonthlyStatusBreakdown(supabase: any, machineId: string, monthStr: string) {
  const monthStart = new Date(monthStr);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0); // Last day of month
  monthEnd.setHours(23, 59, 59, 999);
  
  const { data: rawData, error } = await supabase
    .from('raw_machine_data')
    .select('full_tank, producing_water, compressor_on')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', monthStart.toISOString())
    .lte('timestamp_utc', monthEnd.toISOString());

  if (error || !rawData || rawData.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  return calculateStatusPercentages(rawData);
}

async function getYearlyStatusBreakdown(supabase: any, machineId: string, year: number) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  
  const { data: rawData, error } = await supabase
    .from('raw_machine_data')
    .select('full_tank, producing_water, compressor_on')
    .eq('machine_id', machineId)
    .gte('timestamp_utc', yearStart.toISOString())
    .lte('timestamp_utc', yearEnd.toISOString());

  if (error || !rawData || rawData.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  return calculateStatusPercentages(rawData);
}

function calculateStatusPercentages(rawData: RawMachineData[]) {
  let producing = 0, idle = 0, fullWater = 0, disconnected = 0;
  
  for (const record of rawData) {
    if (record.full_tank) {
      fullWater++;
    } else if (record.producing_water || record.compressor_on) {
      producing++;
    } else {
      idle++;
    }
  }
  
  const total = rawData.length;
  if (total === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }
  
  return {
    producing: Math.round((producing / total) * 100),
    idle: Math.round((idle / total) * 100),
    fullWater: Math.round((fullWater / total) * 100),
    disconnected: Math.max(0, 100 - Math.round(((producing + idle + fullWater) / total) * 100))
  };
}

async function updateMachineTotal(supabase: any, machineId: string) {
  // Calculate total production from all events
  const { data: totalResult, error: totalError } = await supabase
    .from('water_production_events')
    .select('production_liters')
    .eq('machine_id', machineId)
    .eq('event_type', 'production');

  if (totalError) {
    throw new Error(`Failed to calculate total production: ${totalError.message}`);
  }

  const totalProduction = totalResult?.reduce((sum: number, event: any) => sum + event.production_liters, 0) || 0;

  // Get the latest production event ID
  const { data: latestEvent, error: latestError } = await supabase
    .from('water_production_events')
    .select('id')
    .eq('machine_id', machineId)
    .order('timestamp_utc', { ascending: false })
    .limit(1)
    .single();

  if (latestError && latestError.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`Failed to get latest event: ${latestError.message}`);
  }

  // Upsert machine total
  const { error: upsertError } = await supabase
    .from('machine_production_totals')
    .upsert({
      machine_id: machineId,
      total_production_liters: totalProduction,
      last_production_event_id: latestEvent?.id || null,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'machine_id',
      ignoreDuplicates: false
    });

  if (upsertError) {
    throw new Error(`Failed to update machine total: ${upsertError.message}`);
  }

  console.log(`💧 Updated total production for ${machineId}: ${totalProduction.toFixed(2)}L`);
}

function getISOWeekYear(date: Date): number {
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  return thursday.getFullYear();
}

function getISOWeekNumber(date: Date): number {
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  return Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}