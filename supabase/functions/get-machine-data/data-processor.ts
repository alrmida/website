
import type { InfluxDataPoint, ProcessedDataPoint } from './types.ts';
import { MACHINE_ID } from './config.ts';

export function processDataPoint(data: InfluxDataPoint): { dataPoint: ProcessedDataPoint; waterLevel: number | null } {
  console.log('Processing data point:', data);

  // Extract water level with precision handling
  const waterLevel = data.water_level_L ? Number(data.water_level_L) : null;
  
  // Convert numeric boolean fields to actual booleans
  const convertToBoolean = (value: number | boolean | undefined): boolean => {
    if (typeof value === 'boolean') return value;
    return value === 1;
  };

  const dataPoint: ProcessedDataPoint = {
    machine_id: MACHINE_ID,
    timestamp_utc: data._time,
    water_level_l: waterLevel,
    compressor_on: data.compressor_on || 0,
    ambient_temp_c: data.ambient_temp_C ? Number(data.ambient_temp_C) : null,
    ambient_rh_pct: data.ambient_rh_pct ? Number(data.ambient_rh_pct) : null,
    refrigerant_temp_c: data.refrigerant_temp_C ? Number(data.refrigerant_temp_C) : null,
    exhaust_temp_c: data.exhaust_temp_C ? Number(data.exhaust_temp_C) : null,
    current_a: data.current_A ? Number(data.current_A) : null,
    treating_water: convertToBoolean(data.treating_water),
    serving_water: convertToBoolean(data.serving_water),
    producing_water: convertToBoolean(data.producing_water),
    full_tank: convertToBoolean(data.full_tank),
    disinfecting: convertToBoolean(data.disinfecting),
    collector_ls1: data.collector_ls1 ? Number(data.collector_ls1) : null,
  };

  console.log('Processed data point:', dataPoint);
  console.log('Water level precision check:', {
    original: data.water_level_L,
    processed: waterLevel,
    stored: dataPoint.water_level_l
  });

  return { dataPoint, waterLevel };
}
