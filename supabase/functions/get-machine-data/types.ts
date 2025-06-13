
export interface InfluxDataPoint {
  _time: string;
  _measurement: string;
  water_level_L: number;
  compressor_on: number;
  ambient_temp_C?: number;
  ambient_rh_pct?: number;
  refrigerant_temp_C?: number;
  exhaust_temp_C?: number;
  current_A?: number;
  treating_water?: number | boolean;
  serving_water?: number | boolean;
  producing_water?: number | boolean;
  full_tank?: number | boolean;
  disinfecting?: number | boolean;
  [key: string]: any;
}

export interface ProcessedDataPoint {
  machine_id: string;
  timestamp_utc: string;
  water_level_l: number | null;
  compressor_on: number;
  ambient_temp_c: number | null;
  ambient_rh_pct: number | null;
  refrigerant_temp_c: number | null;
  exhaust_temp_c: number | null;
  current_a: number | null;
  treating_water: boolean;
  serving_water: boolean;
  producing_water: boolean;
  full_tank: boolean;
  disinfecting: boolean;
}

export interface ApiResponse {
  status: string;
  data: {
    _time: string;
    water_level_L: number | null;
    compressor_on: number;
  };
  debug: {
    influxHeaders: string[];
    influxData: InfluxDataPoint;
    storedData: ProcessedDataPoint;
    waterLevelPrecision: {
      original: number | null;
      stored: number | null;
      returned: number | null;
    };
  };
}
