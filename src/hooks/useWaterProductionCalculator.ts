
import { useState, useEffect, useRef } from 'react';

interface WaterProductionData {
  currentProductionRate: number; // L/hour
  totalProduced: number; // total liters since tracking started
  lastPumpEvent: Date | null;
  pumpCycles: number;
  averageProductionPerCycle: number;
}

interface PumpEvent {
  timestamp: Date;
  waterLevelBefore: number;
  production?: number; // calculated when we have the next pump event
}

export const useWaterProductionCalculator = (liveData: any) => {
  const [productionData, setProductionData] = useState<WaterProductionData>({
    currentProductionRate: 0,
    totalProduced: 0,
    lastPumpEvent: null,
    pumpCycles: 0,
    averageProductionPerCycle: 0,
  });

  // Store previous readings and pump events
  const previousReading = useRef<any>(null);
  const pumpEvents = useRef<PumpEvent[]>([]);

  useEffect(() => {
    if (!liveData || !liveData.waterLevel) {
      console.log('No live data available for water production calculation');
      return;
    }

    if (!previousReading.current) {
      console.log('Setting initial reading:', liveData);
      previousReading.current = liveData;
      return;
    }

    const current = liveData;
    const previous = previousReading.current;

    console.log('Checking for pump events:', {
      currentWaterLevel: current.waterLevel,
      previousWaterLevel: previous.waterLevel,
      currentCompressor: current.compressorOn,
      previousCompressor: previous.compressorOn,
      currentTime: current.lastUpdated
    });

    // Detect pump start: significant water level increase OR compressor state change
    const pumpStartDetected = detectPumpStart(previous, current);

    if (pumpStartDetected) {
      console.log('Pump start detected!');
      handlePumpStart(previous, current);
    }

    previousReading.current = current;
  }, [liveData]);

  const detectPumpStart = (previous: any, current: any): boolean => {
    // Method 1: Detect significant water level increase (indicating production)
    const waterLevelIncrease = current.waterLevel - previous.waterLevel;
    const significantIncrease = waterLevelIncrease > 0.1; // More than 0.1L increase
    
    // Method 2: Compressor state change from off to on
    const compressorStarted = previous.compressorOn === 0 && current.compressorOn === 1;
    
    // Method 3: If we see a water level decrease followed by increase (tank being used then refilled)
    const waterLevelDecrease = waterLevelIncrease < -0.05; // Water level dropped by more than 0.05L
    
    console.log('Pump detection analysis:', {
      waterLevelIncrease,
      significantIncrease,
      compressorStarted,
      waterLevelDecrease
    });

    // For now, let's use water level changes as the primary detection method
    // We'll consider any significant change in water level as a "pump event"
    return significantIncrease || waterLevelDecrease || compressorStarted;
  };

  const handlePumpStart = (previousReading: any, currentReading: any) => {
    const eventTime = new Date(currentReading.lastUpdated);
    const waterLevelBefore = previousReading.waterLevel || 0;
    const waterLevelAfter = currentReading.waterLevel || 0;

    console.log('Handling pump event:', {
      eventTime,
      waterLevelBefore,
      waterLevelAfter,
      production: Math.abs(waterLevelAfter - waterLevelBefore)
    });

    // Calculate immediate production for this event
    const production = Math.abs(waterLevelAfter - waterLevelBefore);

    // Create new pump event with immediate production calculation
    const newPumpEvent: PumpEvent = {
      timestamp: eventTime,
      waterLevelBefore: waterLevelBefore,
      production: production
    };

    // Add the new pump event
    pumpEvents.current.push(newPumpEvent);

    console.log('Added pump event:', newPumpEvent);
    console.log('Total pump events:', pumpEvents.current.length);

    // Recalculate metrics
    updateProductionMetrics();
  };

  const updateProductionMetrics = () => {
    const events = pumpEvents.current;
    const eventsWithProduction = events.filter(e => e.production !== undefined && e.production > 0);
    
    console.log('Updating production metrics:', {
      totalEvents: events.length,
      eventsWithProduction: eventsWithProduction.length
    });

    if (eventsWithProduction.length === 0) {
      console.log('No events with production data yet');
      return;
    }

    // Calculate totals
    const totalProduced = eventsWithProduction.reduce((sum, event) => sum + (event.production || 0), 0);
    const pumpCycles = eventsWithProduction.length;
    const averageProductionPerCycle = totalProduced / pumpCycles;

    // Calculate production rate (L/hour) based on recent activity
    const productionRate = calculateCurrentProductionRate(eventsWithProduction);

    // Get last pump event time
    const lastPumpEvent = events.length > 0 ? events[events.length - 1].timestamp : null;

    const newProductionData = {
      currentProductionRate: productionRate,
      totalProduced,
      lastPumpEvent,
      pumpCycles,
      averageProductionPerCycle,
    };

    console.log('Updated production data:', newProductionData);

    setProductionData(newProductionData);
  };

  const calculateCurrentProductionRate = (events: PumpEvent[]): number => {
    if (events.length < 2) return 0;

    // Use last few events to calculate current rate
    const recentEvents = events.slice(-3); // Last 3 pump cycles
    const firstEvent = recentEvents[0];
    const lastEvent = recentEvents[recentEvents.length - 1];
    
    const timeDiffHours = (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60 * 60);
    const totalProduction = recentEvents.reduce((sum, event) => sum + (event.production || 0), 0);
    
    return timeDiffHours > 0 ? totalProduction / timeDiffHours : 0;
  };

  return {
    productionData,
    pumpEvents: pumpEvents.current,
  };
};
