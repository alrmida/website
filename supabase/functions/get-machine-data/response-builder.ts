
import type { InfluxDataPoint } from './types.ts';

export function buildResponse(data: InfluxDataPoint) {
  console.log('🏗️ Building response from data:', data);
  
  const response = {
    status: 'ok',
    data: {
      _time: data._time,
      water_level_L: data.water_level_L,
      compressor_on: data.compressor_on || 0,
      collector_ls1: data.collector_ls1 || null,
    },
    debug: {
      originalData: data,
      waterLevelPrecision: {
        original: data.water_level_L,
        returned: data.water_level_L
      }
    }
  };

  console.log('📤 Built response:', response);
  return response;
}
