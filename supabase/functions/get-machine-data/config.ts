
// Machine configuration
export const MACHINE_ID = 'KU001619000079';

// InfluxDB configuration
export const INFLUXDB_BUCKET = 'telemetry';
export const INFLUXDB_MEASUREMENT = 'telemetry';

// Data collection configuration - Updated to 1 hour for better collector_ls1 detection
export const MAX_LINES = 360; // Increased from 180 to get 1 hour of data (assuming 10-second intervals)
export const BATCH_SIZE = 50; // Process data in batches

// Time ranges for data collection
export const DEFAULT_HOURS_BACK = 1; // Default to 1 hour back
export const MAX_HOURS_BACK = 24; // Maximum 24 hours back

// CSV parsing configuration
export const EXPECTED_COLUMNS = [
  'timestamp_utc',
  'collector_ls1',
  'compressor_on',
  'ambient_temp_c',
  'ambient_rh_pct',
  'refrigerant_temp_c',
  'exhaust_temp_c',
  'current_a',
  'treating_water',
  'serving_water',
  'producing_water',
  'full_tank',
  'disinfecting',
  'water_level_l'
];

// Water level calculation constants
export const WATER_LEVEL_MIN = 0;
export const WATER_LEVEL_MAX = 10;
export const WATER_LEVEL_OFFSET = 0.5;

// Processing intervals - Updated to 1 hour
export const PROCESSING_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds
