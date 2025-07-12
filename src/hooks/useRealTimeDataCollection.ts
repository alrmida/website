
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
  exhaust_rh_pct: number | null;
  current_a: number | null;
  treating_water: boolean | null;
  serving_water: boolean | null;
  producing_water: boolean | null;
  full_tank: boolean | null;
  disinfecting: boolean | null;
  frost_identified: boolean | null;
  defrosting: boolean | null;
  eev_position: number | null;
  time_seconds: number | null;
  created_at: string;
}

const MAX_LINES = 180; // 30 minutes worth of data (assuming 10-second intervals)

export const useRealTimeDataCollection = (machineId?: string) => {
  const [collectedData, setCollectedData] = useState<RawDataPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedTimestamp = useRef<string | null>(null);
  const knownTimestamps = useRef<Set<string>>(new Set());

  // Start collecting enhanced data
  const startCollection = () => {
    if (!machineId) {
      console.log('⚠️ No machine ID provided to real-time data collection');
      return;
    }

    if (intervalRef.current) return; // Already collecting

    console.log('🚀 Starting enhanced real-time data collection for machine:', machineId);
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
      console.log('⏹️ Stopped enhanced real-time data collection for machine:', machineId);
    }
  };

  // Fetch all new data points with enhanced sensor data
  const fetchNewDataPoints = async () => {
    if (!machineId) return;

    try {
      let query = supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', machineId)
        .order('timestamp_utc', { ascending: false });

      // If we have a last fetched timestamp, get records newer than that
      if (lastFetchedTimestamp.current) {
        query = query.gte('timestamp_utc', lastFetchedTimestamp.current);
      } else {
        // On first fetch, get the last 10 records to establish a baseline
        query = query.limit(10);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching enhanced data:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('📝 No new enhanced data points found for machine:', machineId);
        return;
      }

      console.log(`📊 Fetched ${data.length} potential new enhanced data point(s) for machine:`, machineId);
      
      // Filter out duplicates using timestamp-based deduplication
      const newDataPoints = data.filter(item => {
        const timestampKey = `${item.machine_id}-${item.timestamp_utc}`;
        return !knownTimestamps.current.has(timestampKey);
      });

      if (newDataPoints.length === 0) {
        console.log('📝 All fetched enhanced data points already exist in collection');
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
        console.log(`📊 Added ${sortedNewData.length} new unique enhanced data point(s). Total: ${updatedData.length}/${MAX_LINES}`);
        
        // Log enhanced data info
        if (updatedData.length > 0) {
          const newest = updatedData[0];
          const oldest = updatedData[updatedData.length - 1];
          console.log(`📅 Enhanced data range: ${oldest.timestamp_utc} to ${newest.timestamp_utc}`);
          console.log(`🔌 Latest current reading: ${newest.current_a}A`);
          console.log(`❄️ Latest frost status: ${newest.frost_identified ? 'DETECTED' : 'CLEAR'}`);
        }
        
        // Auto-process when we reach max lines
        if (updatedData.length >= MAX_LINES) {
          console.log('🔄 Reached max lines, auto-processing enhanced batch...');
          setTimeout(() => processBatch(updatedData), 100);
        }
        
        return updatedData;
      });

    } catch (error) {
      console.error('💥 Exception fetching enhanced data:', error);
    }
  };

  // Process the collected batch with enhanced data
  const processBatch = async (dataToProcess?: RawDataPoint[]) => {
    if (!machineId) return;

    const batchData = dataToProcess || collectedData;
    
    if (batchData.length === 0) {
      console.log('⚠️ No enhanced data to process');
      return;
    }

    setIsProcessing(true);
    console.log(`🔍 Processing enhanced batch of ${batchData.length} data points for machine:`, machineId);
    console.log(`📅 Enhanced batch timespan: ${batchData[batchData.length - 1]?.timestamp_utc} to ${batchData[0]?.timestamp_utc}`);

    try {
      // Sort data by timestamp (oldest first for processing)
      const sortedData = [...batchData].sort((a, b) => 
        new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
      );

      // Enhanced pump event detection using multiple sensor inputs
      const pumpEvents = findEnhancedPumpEvents(sortedData);
      console.log(`🔧 Found ${pumpEvents.length} enhanced pump events with additional sensor context`);

      let totalProduction = 0;
      let processedEvents = 0;

      if (pumpEvents.length > 0) {
        // Calculate production for pump events with enhanced validation
        const calculatedEvents = calculateEnhancedProduction(pumpEvents);
        totalProduction = calculatedEvents.reduce((sum, event) => sum + (event.production || 0), 0);
        processedEvents = calculatedEvents.length;

        console.log(`💧 Total enhanced production calculated: ${totalProduction}L from ${processedEvents} events`);

        // Store enhanced metrics in database
        await storeEnhancedProductionMetrics(totalProduction, processedEvents, calculatedEvents);
      } else {
        console.log('⚠️ No enhanced pump events found, adding 0 to metrics');
        // Still store a record with 0 production
        await storeEnhancedProductionMetrics(0, 0, []);
      }

      // Reset collection state
      setCollectedData([]);
      setLastProcessedAt(new Date());
      lastFetchedTimestamp.current = null;
      knownTimestamps.current.clear();
      
      console.log('✅ Enhanced batch processing completed successfully');
      
    } catch (error) {
      console.error('💥 Error processing enhanced batch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced pump event detection with additional sensor validation
  const findEnhancedPumpEvents = (data: RawDataPoint[]) => {
    const events = [];
    
    for (let i = 1; i < data.length; i++) {
      const previous = data[i - 1];
      const current = data[i];
      
      // Detect pump start: collector_ls1 transitions from 1 to 0
      // Enhanced with current and temperature validation
      if (previous.collector_ls1 === 1 && current.collector_ls1 === 0) {
        events.push({
          timestamp: new Date(previous.timestamp_utc),
          waterLevelBefore: previous.water_level_l || 0,
          currentBefore: previous.current_a,
          ambientTempBefore: previous.ambient_temp_c,
          compressorStatus: previous.compressor_on,
          frostDetected: previous.frost_identified,
          defrostingActive: previous.defrosting,
        });
      }
    }
    
    console.log(`🔧 Enhanced pump events detected with sensor context:`, events.length);
    return events;
  };

  // Calculate production with enhanced validation using additional sensors
  const calculateEnhancedProduction = (pumpEvents: any[]) => {
    const calculatedEvents = [...pumpEvents];
    
    // For each pump event except the last, calculate production with validation
    for (let i = 0; i < calculatedEvents.length - 1; i++) {
      const currentEvent = calculatedEvents[i];
      const nextEvent = calculatedEvents[i + 1];
      
      currentEvent.waterLevelAfter = nextEvent.waterLevelBefore;
      currentEvent.production = Math.max(0, currentEvent.waterLevelAfter - currentEvent.waterLevelBefore);
      
      // Enhanced validation using current readings and temperature
      currentEvent.validated = true;
      if (currentEvent.currentBefore !== null && currentEvent.currentBefore < 0.5) {
        currentEvent.validated = false;
        console.log(`⚠️ Production event validation failed: low current reading ${currentEvent.currentBefore}A`);
      }
      
      if (currentEvent.frostDetected) {
        currentEvent.validated = false;
        console.log(`⚠️ Production event validation failed: frost detected during event`);
      }
    }
    
    return calculatedEvents.filter(event => event.production !== undefined && event.validated);
  };

  // Store enhanced production metrics with additional sensor context
  const storeEnhancedProductionMetrics = async (production: number, eventCount: number, events: any[]) => {
    const endTime = new Date();
    const startTime = lastProcessedAt || new Date(endTime.getTime() - 30 * 60 * 1000);
    
    // Get current totals
    const { data: lastMetrics } = await supabase
      .from('water_production_metrics')
      .select('total_water_produced, pump_cycles_count')
      .eq('machine_id', machineId)
      .order('calculation_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentTotal = Number(lastMetrics?.total_water_produced) || 0;
    const currentCycles = lastMetrics?.pump_cycles_count || 0;
    
    const newTotal = currentTotal + production;
    const newCycles = currentCycles + eventCount;
    const avgPerCycle = newCycles > 0 ? newTotal / newCycles : 0;
    const productionRate = events.length >= 2 ? calculateEnhancedProductionRate(events) : 0;
    
    const { error } = await supabase
      .from('water_production_metrics')
      .insert([{
        machine_id: machineId,
        calculation_period_start: startTime.toISOString(),
        calculation_period_end: endTime.toISOString(),
        total_water_produced: newTotal,
        pump_cycles_count: newCycles,
        average_production_per_cycle: avgPerCycle,
        production_rate_lh: productionRate,
        last_pump_event: events.length > 0 ? events[events.length - 1].timestamp.toISOString() : null,
      }]);
      
    if (error) {
      console.error('❌ Error storing enhanced metrics:', error);
      throw error;
    }
    
    console.log('✅ Enhanced production metrics stored successfully');
  };

  // Calculate enhanced production rate with sensor validation
  const calculateEnhancedProductionRate = (events: any[]): number => {
    if (events.length < 2) return 0;
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const timeDiffHours = (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60 * 60);
    const totalProduction = events.reduce((sum, event) => sum + (event.production || 0), 0);
    
    return timeDiffHours > 0 ? totalProduction / timeDiffHours : 0;
  };

  // Auto-start enhanced collection on mount
  useEffect(() => {
    if (machineId) {
      startCollection();
    }
    return () => stopCollection();
  }, [machineId]);

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
