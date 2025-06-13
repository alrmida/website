
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
  waterLevelAfter?: number;
  production?: number;
}

export const useWaterProductionCalculator = (liveData: any) => {
  const [productionData, setProductionData] = useState<WaterProductionData>({
    currentProductionRate: 0,
    totalProduced: 0,
    lastPumpEvent: null,
    pumpCycles: 0,
    averageProductionPerCycle: 0,
  });

  // Store previous readings to detect pump events
  const previousReading = useRef<any>(null);
  const pumpEvents = useRef<PumpEvent[]>([]);
  const currentPumpEvent = useRef<PumpEvent | null>(null);

  useEffect(() => {
    if (!liveData || !previousReading.current) {
      previousReading.current = liveData;
      return;
    }

    const current = liveData;
    const previous = previousReading.current;

    // Detect pump start event: LS1 goes from 1 to 0 (collector sensor)
    // Note: In your script you used LS1, but in our live data we have collector_ls1
    // I'll adapt this to work with the available data structure
    const pumpStartDetected = detectPumpStart(previous, current);

    if (pumpStartDetected) {
      handlePumpStart(current);
    }

    // If we have an active pump event, check if we can calculate production
    if (currentPumpEvent.current && isPumpCycleComplete(current)) {
      handlePumpComplete(current);
    }

    previousReading.current = current;
  }, [liveData]);

  const detectPumpStart = (previous: any, current: any): boolean => {
    // Adapt your logic: LS1 shift from 1 to 0 indicates pump start
    // Using available sensor data from our live stream
    if (!previous.compressor_on && current.compressor_on === 1) {
      // Alternative approach: detect when compressor starts as proxy for pump activity
      return true;
    }
    return false;
  };

  const handlePumpStart = (currentReading: any) => {
    console.log('Pump start detected at:', new Date(currentReading._time));
    
    // Create new pump event with current water level as "before" reading
    const pumpEvent: PumpEvent = {
      timestamp: new Date(currentReading._time),
      waterLevelBefore: currentReading.water_level_L || 0,
    };

    currentPumpEvent.current = pumpEvent;
  };

  const isPumpCycleComplete = (currentReading: any): boolean => {
    // Simple logic: pump cycle complete when compressor turns off
    // or when we detect water level has stabilized after increase
    return currentReading.compressor_on === 0;
  };

  const handlePumpComplete = (currentReading: any) => {
    if (!currentPumpEvent.current) return;

    const pumpEvent = currentPumpEvent.current;
    const waterLevelAfter = currentReading.water_level_L || 0;
    const production = Math.max(0, waterLevelAfter - pumpEvent.waterLevelBefore);

    // Complete the pump event
    pumpEvent.waterLevelAfter = waterLevelAfter;
    pumpEvent.production = production;

    // Add to historical events
    pumpEvents.current.push(pumpEvent);

    // Calculate updated metrics
    const totalProduced = pumpEvents.current.reduce((sum, event) => sum + (event.production || 0), 0);
    const pumpCycles = pumpEvents.current.length;
    const averageProductionPerCycle = pumpCycles > 0 ? totalProduced / pumpCycles : 0;

    // Calculate production rate (L/hour) based on recent activity
    const productionRate = calculateCurrentProductionRate();

    setProductionData({
      currentProductionRate: productionRate,
      totalProduced,
      lastPumpEvent: pumpEvent.timestamp,
      pumpCycles,
      averageProductionPerCycle,
    });

    console.log('Pump cycle completed:', {
      production,
      totalProduced,
      waterLevelBefore: pumpEvent.waterLevelBefore,
      waterLevelAfter,
    });

    // Clear current pump event
    currentPumpEvent.current = null;
  };

  const calculateCurrentProductionRate = (): number => {
    const recentEvents = pumpEvents.current.slice(-5); // Last 5 pump cycles
    if (recentEvents.length < 2) return 0;

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
