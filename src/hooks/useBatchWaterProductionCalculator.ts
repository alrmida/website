
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WaterProductionData {
  currentProductionRate: number;
  totalProduced: number;
  lastPumpEvent: Date | null;
  pumpCycles: number;
  averageProductionPerCycle: number;
  lastCalculationTime: Date | null;
}

interface RawDataPoint {
  id: string;
  machine_id: string;
  timestamp_utc: string;
  water_level_l: number | null;
  collector_ls1: number | null;
  compressor_on: number | null;
}

interface PumpEvent {
  timestamp: Date;
  waterLevelBefore: number;
  waterLevelAfter?: number;
  production?: number;
}

const BATCH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
const MACHINE_ID = 'KU001619000079';

export const useBatchWaterProductionCalculator = () => {
  const [productionData, setProductionData] = useState<WaterProductionData>({
    currentProductionRate: 0,
    totalProduced: 0,
    lastPumpEvent: null,
    pumpCycles: 0,
    averageProductionPerCycle: 0,
    lastCalculationTime: null,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Load existing metrics from database on component mount
  useEffect(() => {
    console.log('Initializing batch water production calculator...');
    loadExistingMetrics();
    
    // Set up batch processing interval
    const interval = setInterval(() => {
      console.log('Triggering batch processing from interval...');
      processBatchData();
    }, BATCH_INTERVAL);

    // Run initial batch processing after a short delay
    const initialTimeout = setTimeout(() => {
      console.log('Running initial batch processing...');
      processBatchData();
    }, 5000); // 5 seconds delay

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  const loadExistingMetrics = async () => {
    try {
      console.log('Loading existing water production metrics...');
      
      const { data: metrics, error } = await supabase
        .from('water_production_metrics')
        .select('*')
        .eq('machine_id', MACHINE_ID)
        .order('calculation_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading existing metrics:', error);
        return;
      }

      if (metrics) {
        console.log('Loaded existing metrics:', metrics);
        setProductionData({
          currentProductionRate: Number(metrics.production_rate_lh) || 0,
          totalProduced: Number(metrics.total_water_produced) || 0,
          lastPumpEvent: metrics.last_pump_event ? new Date(metrics.last_pump_event) : null,
          pumpCycles: metrics.pump_cycles_count || 0,
          averageProductionPerCycle: Number(metrics.average_production_per_cycle) || 0,
          lastCalculationTime: new Date(metrics.calculation_period_end),
        });
      } else {
        console.log('No existing metrics found, starting fresh');
      }
    } catch (error) {
      console.error('Exception loading existing metrics:', error);
    }
  };

  const processBatchData = async () => {
    if (isProcessing) {
      console.log('Batch processing already in progress, skipping...');
      return;
    }

    setIsProcessing(true);
    console.log('Starting batch water production calculation...');

    try {
      // Determine the time window for this batch
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - BATCH_INTERVAL);
      
      // If we have previous metrics, start from where we left off
      const { data: lastMetrics } = await supabase
        .from('water_production_metrics')
        .select('calculation_period_end')
        .eq('machine_id', MACHINE_ID)
        .order('calculation_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      const actualStartTime = lastMetrics 
        ? new Date(lastMetrics.calculation_period_end)
        : new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Default to 24 hours ago

      console.log('Processing batch from', actualStartTime.toISOString(), 'to', endTime.toISOString());

      // Query raw data for the time period
      const { data: rawData, error } = await supabase
        .from('raw_machine_data')
        .select('id, machine_id, timestamp_utc, water_level_l, collector_ls1, compressor_on')
        .eq('machine_id', MACHINE_ID)
        .gte('timestamp_utc', actualStartTime.toISOString())
        .lt('timestamp_utc', endTime.toISOString())
        .order('timestamp_utc', { ascending: true });

      if (error) {
        console.error('Error querying raw data:', error);
        return;
      }

      if (!rawData || rawData.length === 0) {
        console.log('No raw data found for the time period');
        return;
      }

      console.log(`Processing ${rawData.length} raw data points...`);
      console.log('Sample data points:', rawData.slice(0, 3));

      // Process pump events from raw data
      const pumpEvents = findPumpEvents(rawData);
      console.log(`Found ${pumpEvents.length} pump events in batch`);

      if (pumpEvents.length === 0) {
        console.log('No pump events found in this batch');
        return;
      }

      // Calculate production for pump events
      const calculatedEvents = calculateProduction(pumpEvents);
      const newProduction = calculatedEvents.reduce((sum, event) => sum + (event.production || 0), 0);
      console.log('New production calculated:', newProduction, 'liters');

      // Load current totals and update
      const currentTotals = await getCurrentTotals();
      const updatedTotals = {
        totalProduced: currentTotals.totalProduced + newProduction,
        pumpCycles: currentTotals.pumpCycles + calculatedEvents.length,
        lastPumpEvent: calculatedEvents[calculatedEvents.length - 1]?.timestamp || null,
      };

      const averageProductionPerCycle = updatedTotals.pumpCycles > 0 
        ? updatedTotals.totalProduced / updatedTotals.pumpCycles 
        : 0;

      const productionRate = calculateProductionRate(calculatedEvents);

      console.log('Updated totals:', updatedTotals);
      console.log('Production rate:', productionRate, 'L/h');

      // Store the new metrics
      await storeMetrics({
        machine_id: MACHINE_ID,
        calculation_period_start: actualStartTime.toISOString(),
        calculation_period_end: endTime.toISOString(),
        total_water_produced: updatedTotals.totalProduced,
        pump_cycles_count: updatedTotals.pumpCycles,
        average_production_per_cycle: averageProductionPerCycle,
        production_rate_lh: productionRate,
        last_pump_event: updatedTotals.lastPumpEvent?.toISOString() || null,
      });

      // Update component state
      setProductionData({
        currentProductionRate: productionRate,
        totalProduced: updatedTotals.totalProduced,
        lastPumpEvent: updatedTotals.lastPumpEvent,
        pumpCycles: updatedTotals.pumpCycles,
        averageProductionPerCycle: averageProductionPerCycle,
        lastCalculationTime: endTime,
      });

      console.log('Batch processing completed successfully');
      
    } catch (error) {
      console.error('Error in batch processing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const findPumpEvents = (rawData: RawDataPoint[]): PumpEvent[] => {
    const events: PumpEvent[] = [];
    
    console.log('Analyzing pump events...');
    console.log('First few collector_ls1 values:', rawData.slice(0, 10).map(d => ({ time: d.timestamp_utc, collector_ls1: d.collector_ls1, water_level: d.water_level_l })));
    
    for (let i = 1; i < rawData.length; i++) {
      const previous = rawData[i - 1];
      const current = rawData[i];
      
      // Detect pump start: collector_ls1 transitions from 1 to 0
      const pumpStartDetected = previous.collector_ls1 === 1 && current.collector_ls1 === 0;
      
      if (pumpStartDetected) {
        console.log('Pump event detected at:', previous.timestamp_utc, 'water level before:', previous.water_level_l);
        events.push({
          timestamp: new Date(previous.timestamp_utc),
          waterLevelBefore: previous.water_level_l || 0,
        });
      }
    }
    
    console.log('Total pump events found:', events.length);
    return events;
  };

  const calculateProduction = (pumpEvents: PumpEvent[]): PumpEvent[] => {
    const calculatedEvents = [...pumpEvents];
    
    // For each pump event except the last, calculate production
    for (let i = 0; i < calculatedEvents.length - 1; i++) {
      const currentEvent = calculatedEvents[i];
      const nextEvent = calculatedEvents[i + 1];
      
      currentEvent.waterLevelAfter = nextEvent.waterLevelBefore;
      currentEvent.production = Math.max(0, currentEvent.waterLevelAfter - currentEvent.waterLevelBefore);
      
      console.log(`Pump cycle ${i + 1}: ${currentEvent.waterLevelBefore}L → ${currentEvent.waterLevelAfter}L = ${currentEvent.production}L`);
    }
    
    return calculatedEvents.filter(event => event.production !== undefined);
  };

  const getCurrentTotals = async () => {
    const { data: metrics } = await supabase
      .from('water_production_metrics')
      .select('total_water_produced, pump_cycles_count, last_pump_event')
      .eq('machine_id', MACHINE_ID)
      .order('calculation_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      totalProduced: Number(metrics?.total_water_produced) || 0,
      pumpCycles: metrics?.pump_cycles_count || 0,
      lastPumpEvent: metrics?.last_pump_event ? new Date(metrics.last_pump_event) : null,
    };
  };

  const calculateProductionRate = (events: PumpEvent[]): number => {
    if (events.length < 2) return 0;
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const timeDiffHours = (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60 * 60);
    const totalProduction = events.reduce((sum, event) => sum + (event.production || 0), 0);
    
    return timeDiffHours > 0 ? totalProduction / timeDiffHours : 0;
  };

  const storeMetrics = async (metrics: any) => {
    const { error } = await supabase
      .from('water_production_metrics')
      .insert([metrics]);
      
    if (error) {
      console.error('Error storing metrics:', error);
      throw error;
    }
    
    console.log('Successfully stored metrics:', metrics);
  };

  return {
    productionData,
    isProcessing,
    processBatchData: () => processBatchData(),
  };
};
