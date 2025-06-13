
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
    if (!liveData || !previousReading.current) {
      previousReading.current = liveData;
      return;
    }

    const current = liveData;
    const previous = previousReading.current;

    // Detect pump start: LS1 goes from 1 to 0 (collector sensor)
    // In the live data, we need to check if collector_ls1 exists, otherwise use a proxy
    const pumpStartDetected = detectPumpStart(previous, current);

    if (pumpStartDetected) {
      handlePumpStart(previous, current); // pass previous to get water level before pump start
    }

    previousReading.current = current;
  }, [liveData]);

  const detectPumpStart = (previous: any, current: any): boolean => {
    // Check for LS1 transition from 1 to 0
    // Adapt based on available data structure - using collector_ls1 if available
    if (previous.collector_ls1 === 1 && current.collector_ls1 === 0) {
      return true;
    }
    
    // Fallback: if collector_ls1 not available, use compressor as approximation
    // but this is less precise than the LS1 sensor method
    if (!previous.compressor_on && current.compressor_on === 1) {
      return true;
    }
    
    return false;
  };

  const handlePumpStart = (previousReading: any, currentReading: any) => {
    const pumpStartTime = new Date(currentReading._time);
    const waterLevelBefore = previousReading.water_level_L || 0;

    console.log('Pump start detected at:', pumpStartTime, 'Water level before:', waterLevelBefore);

    // Create new pump event
    const newPumpEvent: PumpEvent = {
      timestamp: pumpStartTime,
      waterLevelBefore: waterLevelBefore,
    };

    // If we have a previous pump event, calculate production for it
    if (pumpEvents.current.length > 0) {
      const lastEvent = pumpEvents.current[pumpEvents.current.length - 1];
      const production = Math.max(0, waterLevelBefore - lastEvent.waterLevelBefore);
      
      // Update the last event with production data
      lastEvent.production = production;
      
      console.log('Production calculated for previous pump cycle:', {
        from: lastEvent.waterLevelBefore,
        to: waterLevelBefore,
        production: production,
        timePeriod: pumpStartTime.getTime() - lastEvent.timestamp.getTime()
      });
    }

    // Add the new pump event
    pumpEvents.current.push(newPumpEvent);

    // Recalculate metrics
    updateProductionMetrics();
  };

  const updateProductionMetrics = () => {
    const events = pumpEvents.current;
    const eventsWithProduction = events.filter(e => e.production !== undefined);
    
    if (eventsWithProduction.length === 0) {
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

    setProductionData({
      currentProductionRate: productionRate,
      totalProduced,
      lastPumpEvent,
      pumpCycles,
      averageProductionPerCycle,
    });
  };

  const calculateCurrentProductionRate = (events: PumpEvent[]): number => {
    if (events.length < 2) return 0;

    // Use last few events to calculate current rate
    const recentEvents = events.slice(-5); // Last 5 pump cycles
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
