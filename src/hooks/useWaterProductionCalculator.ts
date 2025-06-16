
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
  waterLevelAfter?: number; // will be set when next pump event occurs
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
      currentCollectorLS1: current.collector_ls1,
      previousCollectorLS1: previous.collector_ls1,
      currentTime: current.lastUpdated
    });

    // Detect pump start: collector_ls1 transitions from 1 to 0
    const pumpStartDetected = previous.collector_ls1 === 1 && current.collector_ls1 === 0;

    if (pumpStartDetected) {
      console.log('Pump start detected! collector_ls1: 1 -> 0');
      handlePumpStart(previous, current);
    }

    previousReading.current = current;
  }, [liveData]);

  const handlePumpStart = (previousReading: any, currentReading: any) => {
    const eventTime = new Date(currentReading.lastUpdated);
    const waterLevelBefore = previousReading.waterLevel || 0;

    console.log('Handling pump start event:', {
      eventTime,
      waterLevelBefore,
      totalEventsBeforeAdding: pumpEvents.current.length
    });

    // If we have a previous pump event, calculate its production now
    if (pumpEvents.current.length > 0) {
      const previousEvent = pumpEvents.current[pumpEvents.current.length - 1];
      
      // Set the water level after the previous pump event (which is the level before this new pump event)
      previousEvent.waterLevelAfter = waterLevelBefore;
      
      // Calculate production for the previous pump event
      // Production = water level after pump N+1 - water level before pump N
      const production = Math.max(0, previousEvent.waterLevelAfter - previousEvent.waterLevelBefore);
      previousEvent.production = production;

      console.log('Calculated production for previous pump event:', {
        eventIndex: pumpEvents.current.length - 1,
        waterLevelBefore: previousEvent.waterLevelBefore,
        waterLevelAfter: previousEvent.waterLevelAfter,
        production: production
      });
    }

    // Create new pump event (production will be calculated when next pump event occurs)
    const newPumpEvent: PumpEvent = {
      timestamp: eventTime,
      waterLevelBefore: waterLevelBefore,
      // waterLevelAfter and production will be set when next pump event occurs
    };

    // Add the new pump event
    pumpEvents.current.push(newPumpEvent);

    console.log('Added new pump event:', newPumpEvent);
    console.log('Total pump events:', pumpEvents.current.length);

    // Recalculate metrics
    updateProductionMetrics();
  };

  const updateProductionMetrics = () => {
    const events = pumpEvents.current;
    const eventsWithProduction = events.filter(e => e.production !== undefined && e.production > 0);
    
    console.log('Updating production metrics:', {
      totalEvents: events.length,
      eventsWithProduction: eventsWithProduction.length,
      productionValues: eventsWithProduction.map(e => e.production)
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
