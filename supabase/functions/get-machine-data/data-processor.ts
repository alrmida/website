
import type { InfluxDataPoint, ProcessedDataPoint } from './types.ts';
import { MACHINE_ID } from './config.ts';

export function processDataPoint(data: InfluxDataPoint): {
  dataPoint: ProcessedDataPoint;
  waterLevel: number | null;
} {
  // Convert timestamp to proper format
  const timestamp = new Date(data._time);
  
  // Prepare data point for storage with proper field mapping - preserve full precision
  const waterLevel = data.water_level_L || data['water_level_L'] || null;
  console.log('Water level from InfluxDB (full precision):', waterLevel);
  
  const dataPoint: ProcessedDataPoint = {
    machine_id: MACHINE_ID,
    timestamp_utc: timestamp.toISOString(),
    water_level_l: waterLevel, // Store with full precision
    compressor_on: data.compressor_on || 0,
    ambient_temp_c: data.ambient_temp_C || data['ambient_temp_C'] || null,
    ambient_rh_pct: data.ambient_rh_pct || data['ambient_rh_pct'] || null,
    refrigerant_temp_c: data.refrigerant_temp_C || data['refrigerant_temp_C'] || null,
    exhaust_temp_c: data.exhaust_temp_C || data['exhaust_temp_C'] || null,
    current_a: data.current_A || data['current_A'] || null,
    treating_water: data.treating_water === 1 || data.treating_water === true,
    serving_water: data.serving_water === 1 || data.serving_water === true,
    producing_water: data.producing_water === 1 || data.producing_water === true,
    full_tank: data.full_tank === 1 || data.full_tank === true,
    disinfecting: data.disinfecting === 1 || data.disinfecting === true
  };

  console.log('Processed data point for storage (with full precision):', dataPoint);
  
  return { dataPoint, waterLevel };
}
