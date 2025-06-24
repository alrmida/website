import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RawDataPoint {
  id: string;
  machine_id: string;
  timestamp_utc: string;
  water_level_l: number | null;
  collector_ls1: number | null;
  compressor_on: number | null;
  ambient_temp_c: number | null;
  ambient_rh_pct: number | null;
  refrigerant_temp_c: number | null;
  exhaust_temp_c: number | null;
  current_a: number | null;
  treating_water: boolean | null;
  serving_water: boolean | null;
  producing_water: boolean | null;
  full_tank: boolean | null;
  disinfecting: boolean | null;
  created_at: string;
}

const MACHINE_ID = 'KU001619000079';
const MAX_LINES = 180; // 30 minutes worth of data (assuming 10-second intervals)

export const useRealTimeDataCollection = () => {
  const [collectedData, setCollectedData] = useState<RawDataPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedTimestamp = useRef<string | null>(null);
  const knownTimestamps = useRef<Set<string>>(new Set());

  // Start collecting data
  const startCollection = () => {
    if (intervalRef.current) return; // Already collecting

    console.log('🚀 Starting real-time data collection...');
    setIsCollecting(true);
    
    // Reset tracking variables when starting fresh
    lastFetchedTimestamp.current = null;
    knownTimestamps.current.clear();
    
    // Fetch data every 10 seconds
    intervalRef.current = setInterval(async () => {
      await fetchNewDataPoints();
    }, 10000);

    // Also fetch immediately
    fetchNewDataPoints();
  };

  // Stop collecting data
  const stopCollection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsCollecting(false);
      console.log('⏹️ Stopped real-time data collection');
    }
  };

  // Fetch all new data points since last fetch with improved strategy
  const fetchNewDataPoints = async () => {
    try {
      let query = supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', MACHINE_ID)
        .order('timestamp_utc', { ascending: false });

      // If we have a last fetched timestamp, get records newer than that
      // Use gte (greater than or equal) to ensure we don't miss any edge cases
      if (lastFetchedTimestamp.current) {
        query = query.gte('timestamp_utc', lastFetchedTimestamp.current);
      } else {
        // On first fetch, get the last 10 records to establish a baseline
        query = query.limit(10);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching new data:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('📝 No new data points found');
        return;
      }

      console.log(`📊 Fetched ${data.length} potential new data point(s)`);
      
      // Filter out duplicates using timestamp-based deduplication
      const newDataPoints = data.filter(item => {
        const timestampKey = `${item.machine_id}-${item.timestamp_utc}`;
        return !knownTimestamps.current.has(timestampKey);
      });

      if (newDataPoints.length === 0) {
        console.log('📝 All fetched data points already exist in collection');
        return;
      }

      // Add new timestamps to our tracking set
      newDataPoints.forEach(item => {
        const timestampKey = `${item.machine_id}-${item.timestamp_utc}`;
        knownTimestamps.current.add(timestampKey);
      });

      // Sort new data by timestamp (oldest first) for proper chronological processing
      const sortedNewData = newDataPoints.sort((a, b) => 
        new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
      );

      // Update the last fetched timestamp to the newest record we actually processed
      if (sortedNewData.length > 0) {
        const newestTimestamp = sortedNewData[sortedNewData.length - 1].timestamp_utc;
        lastFetchedTimestamp.current = newestTimestamp;
        console.log(`🕒 Updated last fetched timestamp to: ${newestTimestamp}`);
      }

      setCollectedData(prev => {
        // Add new data in reverse chronological order (newest first for display)
        const updatedData = [...sortedNewData.reverse(), ...prev];
        console.log(`📊 Added ${sortedNewData.length} new unique data point(s). Total: ${updatedData.length}/${MAX_LINES}`);
        
        // Log timestamp range for debugging
        if (updatedData.length > 0) {
          const newest = updatedData[0];
          const oldest = updatedData[updatedData.length - 1];
          console.log(`📅 Data range: ${oldest.timestamp_utc} to ${newest.timestamp_utc}`);
        }
        
        // Auto-process when we reach max lines
        if (updatedData.length >= MAX_LINES) {
          console.log('🔄 Reached max lines, auto-processing batch...');
          setTimeout(() => processBatch(updatedData), 100);
        }
        
        return updatedData;
      });

    } catch (error) {
      console.error('💥 Exception fetching new data:', error);
    }
  };

  // Process the collected batch
  const processBatch = async (dataToProcess?: RawDataPoint[]) => {
    const batchData = dataToProcess || collectedData;
    
    if (batchData.length === 0) {
      console.log('⚠️ No data to process');
      return;
    }

    setIsProcessing(true);
    console.log(`🔍 Processing batch of ${batchData.length} data points...`);
    console.log(`📅 Batch timespan: ${batchData[batchData.length - 1]?.timestamp_utc} to ${batchData[0]?.timestamp_utc}`);

    try {
      // Sort data by timestamp (oldest first for processing)
      const sortedData = [...batchData].sort((a, b) => 
        new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
      );

      // Find pump events (collector_ls1 transitions from 1 to 0)
      const pumpEvents = findPumpEvents(sortedData);
      console.log(`🔧 Found ${pumpEvents.length} pump events`);

      let totalProduction = 0;
      let processedEvents = 0;

      if (pumpEvents.length > 0) {
        // Calculate production for pump events
        const calculatedEvents = calculateProduction(pumpEvents);
        totalProduction = calculatedEvents.reduce((sum, event) => sum + (event.production || 0), 0);
        processedEvents = calculatedEvents.length;

        console.log(`💧 Total production calculated: ${totalProduction}L from ${processedEvents} events`);

        // Store metrics in database
        await storeProductionMetrics(totalProduction, processedEvents, calculatedEvents);
      } else {
        console.log('⚠️ No pump events found, adding 0 to metrics');
        // Still store a record with 0 production
        await storeProductionMetrics(0, 0, []);
      }

      // Reset collection state
      setCollectedData([]);
      setLastProcessedAt(new Date());
      lastFetchedTimestamp.current = null;
      knownTimestamps.current.clear();
      
      console.log('✅ Batch processing completed successfully');
      
    } catch (error) {
      console.error('💥 Error processing batch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Find pump events in the data
  const findPumpEvents = (data: RawDataPoint[]) => {
    const events = [];
    
    for (let i = 1; i < data.length; i++) {
      const previous = data[i - 1];
      const current = data[i];
      
      // Detect pump start: collector_ls1 transitions from 1 to 0
      if (previous.collector_ls1 === 1 && current.collector_ls1 === 0) {
        events.push({
          timestamp: new Date(previous.timestamp_utc),
          waterLevelBefore: previous.water_level_l || 0,
        });
      }
    }
    
    return events;
  };

  // Calculate production for pump events
  const calculateProduction = (pumpEvents: any[]) => {
    const calculatedEvents = [...pumpEvents];
    
    // For each pump event except the last, calculate production
    for (let i = 0; i < calculatedEvents.length - 1; i++) {
      const currentEvent = calculatedEvents[i];
      const nextEvent = calculatedEvents[i + 1];
      
      currentEvent.waterLevelAfter = nextEvent.waterLevelBefore;
      currentEvent.production = Math.max(0, currentEvent.waterLevelAfter - currentEvent.waterLevelBefore);
    }
    
    return calculatedEvents.filter(event => event.production !== undefined);
  };

  // Store production metrics
  const storeProductionMetrics = async (production: number, eventCount: number, events: any[]) => {
    const endTime = new Date();
    const startTime = lastProcessedAt || new Date(endTime.getTime() - 30 * 60 * 1000);
    
    // Get current totals
    const { data: lastMetrics } = await supabase
      .from('water_production_metrics')
      .select('total_water_produced, pump_cycles_count')
      .eq('machine_id', MACHINE_ID)
      .order('calculation_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentTotal = Number(lastMetrics?.total_water_produced) || 0;
    const currentCycles = lastMetrics?.pump_cycles_count || 0;
    
    const newTotal = currentTotal + production;
    const newCycles = currentCycles + eventCount;
    const avgPerCycle = newCycles > 0 ? newTotal / newCycles : 0;
    const productionRate = events.length >= 2 ? calculateProductionRate(events) : 0;
    
    const { error } = await supabase
      .from('water_production_metrics')
      .insert([{
        machine_id: MACHINE_ID,
        calculation_period_start: startTime.toISOString(),
        calculation_period_end: endTime.toISOString(),
        total_water_produced: newTotal,
        pump_cycles_count: newCycles,
        average_production_per_cycle: avgPerCycle,
        production_rate_lh: productionRate,
        last_pump_event: events.length > 0 ? events[events.length - 1].timestamp.toISOString() : null,
      }]);
      
    if (error) {
      console.error('❌ Error storing metrics:', error);
      throw error;
    }
  };

  // Calculate production rate
  const calculateProductionRate = (events: any[]): number => {
    if (events.length < 2) return 0;
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const timeDiffHours = (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60 * 60);
    const totalProduction = events.reduce((sum, event) => sum + (event.production || 0), 0);
    
    return timeDiffHours > 0 ? totalProduction / timeDiffHours : 0;
  };

  // Auto-start collection on mount
  useEffect(() => {
    startCollection();
    return () => stopCollection();
  }, []);

  return {
    collectedData,
    isProcessing,
    isCollecting,
    lastProcessedAt,
    startCollection,
    stopCollection,
    processBatch: () => processBatch(),
    dataCount: collectedData.length,
    maxLines: MAX_LINES,
  };
};
