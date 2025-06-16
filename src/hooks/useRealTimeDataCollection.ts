
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
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start collecting data
  const startCollection = () => {
    if (intervalRef.current) return; // Already collecting

    console.log('🚀 Starting real-time data collection...');
    
    // Fetch data every 10 seconds
    intervalRef.current = setInterval(async () => {
      await fetchLatestDataPoint();
    }, 10000);

    // Also fetch immediately
    fetchLatestDataPoint();
  };

  // Stop collecting data
  const stopCollection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Stopped real-time data collection');
    }
  };

  // Fetch the latest data point
  const fetchLatestDataPoint = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', MACHINE_ID)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching latest data:', error);
        return;
      }

      if (data) {
        setCollectedData(prev => {
          // Check if this data point is already in our collection
          const exists = prev.some(item => item.id === data.id);
          if (exists) {
            console.log('📝 Data point already exists, skipping');
            return prev;
          }

          const newData = [...prev, data];
          console.log(`📊 Added new data point. Total: ${newData.length}/${MAX_LINES}`);
          
          // Auto-process when we reach max lines
          if (newData.length >= MAX_LINES) {
            console.log('🔄 Reached max lines, auto-processing batch...');
            setTimeout(() => processBatch(newData), 100);
          }
          
          return newData;
        });
      }
    } catch (error) {
      console.error('💥 Exception fetching latest data:', error);
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

    try {
      // Find pump events (collector_ls1 transitions from 1 to 0)
      const pumpEvents = findPumpEvents(batchData);
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

      // Reset collection
      setCollectedData([]);
      setLastProcessedAt(new Date());
      
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
    lastProcessedAt,
    startCollection,
    stopCollection,
    processBatch: () => processBatch(),
    dataCount: collectedData.length,
    maxLines: MAX_LINES,
  };
};
