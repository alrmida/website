
import type { ApiResponse, InfluxDataPoint, ProcessedDataPoint } from './types.ts';

export function buildApiResponse(
  headers: string[],
  influxData: InfluxDataPoint,
  dataPoint: ProcessedDataPoint,
  waterLevel: number | null
): ApiResponse {
  // Format response for the dashboard (same as before) - preserve full precision
  const responseData = {
    _time: dataPoint.timestamp_utc,
    water_level_L: waterLevel, // Return with full precision
    compressor_on: dataPoint.compressor_on
  };

  const result: ApiResponse = {
    status: 'ok',
    data: responseData,
    debug: {
      influxHeaders: headers,
      influxData: influxData,
      storedData: dataPoint,
      waterLevelPrecision: {
        original: waterLevel,
        stored: dataPoint.water_level_l,
        returned: responseData.water_level_L
      }
    }
  };

  console.log('Final response with precision info:', result);
  return result;
}
