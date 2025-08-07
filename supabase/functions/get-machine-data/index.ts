
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment validation
function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INFLUXDB_URL', 'INFLUXDB_TOKEN', 'INFLUXDB_ORG'];
  const missing = required.filter(key => !Deno.env.get(key));
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ Environment variables validated');
}

// Lookup machine ID from microcontroller UID using the new schema
async function getMachineIdFromUID(supabase: any, microcontrollerUID: string): Promise<string | null> {
  try {
    console.log('🔍 Looking up machine ID for UID:', microcontrollerUID);
    
    // Query the machine_microcontrollers relationship table
    const { data: assignment, error } = await supabase
      .from('machine_microcontrollers')
      .select(`
        machine_id,
        machines!inner(machine_id)
      `)
      .eq('microcontroller_uid', microcontrollerUID)
      .is('unassigned_at', null)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error looking up machine:', error);
      return null;
    }

    if (!assignment) {
      console.log('⚠️ No active machine assignment found for UID:', microcontrollerUID);
      return null;
    }

    const machineId = assignment.machines.machine_id;
    console.log('✅ Found machine ID:', machineId, 'for UID:', microcontrollerUID);
    return machineId;
  } catch (error) {
    console.error('❌ Exception during machine lookup:', error);
    return null;
  }
}

// Simplified InfluxDB client creation
async function createInfluxClient() {
  try {
    const INFLUXDB_URL = Deno.env.get('INFLUXDB_URL')!;
    const INFLUXDB_TOKEN = Deno.env.get('INFLUXDB_TOKEN')!;
    
    console.log('🔧 Creating InfluxDB client');
    
    const { InfluxDB } = await import('https://esm.sh/@influxdata/influxdb-client@1.33.2');
    
    const client = new InfluxDB({
      url: INFLUXDB_URL,
      token: INFLUXDB_TOKEN,
    });

    console.log('✅ InfluxDB client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create InfluxDB client:', error);
    throw new Error(`InfluxDB client creation failed: ${error.message}`);
  }
}

// Fixed CSV parsing function
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(field => field.trim());
}

// Enhanced approach with wider time range for troubleshooting
async function fetchLatestMachineData(queryApi: any, machineUID: string) {
  console.log('🔍 Fetching latest machine data with enhanced debugging for UID:', machineUID);
  
  // Define the fields we want to fetch
  const fields = [
    'water_level_L', 'ambient_temp_C', 'refrigerant_temp_C', 'ambient_rh_pct',
    'exhaust_temp_C', 'exhaust_rh_pct', 'current_A', 'collector_ls1',
    'compressor_on', 'eev_position', 'treating_water', 'serving_water',
    'producing_water', 'full_tank', 'disinfecting', 'frost_identified',
    'defrosting', 'time_seconds'
  ];

  // Try multiple time ranges for troubleshooting
  const timeRanges = ['-1h', '-6h', '-24h'];
  let dataFound = false;
  let result: any = {};
  let latestTime: string | null = null;

  for (const timeRange of timeRanges) {
    console.log(`🔍 Trying time range: ${timeRange} for UID: ${machineUID}`);
    
    const baseQuery = `
      from(bucket: "KumulusData")
        |> range(start: ${timeRange})
        |> filter(fn: (r) => r["_measurement"] == "awg_data_full")
        |> filter(fn: (r) => r["uid"] == "${machineUID}")
    `;

    let fieldsFound = 0;

    // Fetch each field individually to avoid pivot issues
    for (const field of fields) {
      try {
        const query = `${baseQuery}
          |> filter(fn: (r) => r["_field"] == "${field}")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1)`;

        const csvLines: string[] = [];
        await new Promise<void>((resolve, reject) => {
          queryApi.queryLines(query, {
            next: (line: string) => {
              csvLines.push(line);
            },
            error: (error: Error) => {
              console.error(`❌ Error fetching ${field}:`, error);
              reject(error);
            },
            complete: () => {
              resolve();
            }
          });
        });

        if (csvLines.length > 1) {
          // Find the header line and data line
          let headerLineIndex = -1;
          let dataLineIndex = -1;
          
          for (let i = 0; i < csvLines.length; i++) {
            const line = csvLines[i];
            if (line.startsWith(',result,table')) {
              headerLineIndex = i;
            } else if (headerLineIndex >= 0 && line.length > 0 && !line.startsWith('#') && !line.startsWith(',result')) {
              dataLineIndex = i;
              break;
            }
          }

          if (headerLineIndex >= 0 && dataLineIndex >= 0) {
            const headers = parseCSVLine(csvLines[headerLineIndex]);
            const values = parseCSVLine(csvLines[dataLineIndex]);
            
            const timeIndex = headers.indexOf('_time');
            const valueIndex = headers.indexOf('_value');
            
            if (timeIndex >= 0 && valueIndex >= 0 && timeIndex < values.length && valueIndex < values.length) {
              const timestamp = values[timeIndex];
              const value = values[valueIndex];
              
              // Track the latest timestamp
              if (!latestTime || timestamp > latestTime) {
                latestTime = timestamp;
              }
              
              // Store the value with appropriate type conversion
              if (value && value !== '' && value !== 'null') {
                if (['treating_water', 'serving_water', 'producing_water', 'full_tank', 
                     'disinfecting', 'frost_identified', 'defrosting'].includes(field)) {
                  result[field] = value === '1' || value.toLowerCase() === 'true';
                } else if (['collector_ls1', 'compressor_on', 'eev_position'].includes(field)) {
                  result[field] = parseInt(value) || 0;
                } else {
                  result[field] = parseFloat(value) || 0;
                }
                fieldsFound++;
                dataFound = true;
              }
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to fetch ${field}:`, error);
      }
    }

    console.log(`📊 Time range ${timeRange}: Found ${fieldsFound} fields for UID ${machineUID}`);
    
    if (dataFound) {
      result._time = latestTime;
      console.log(`✅ Data found in range ${timeRange} at timestamp: ${latestTime}`);
      break;
    }
  }

  if (!dataFound) {
    console.log(`❌ No data found for UID: ${machineUID} in any time range`);
    return null;
  }

  return result;
}

// Enhanced data processing with better error handling
function processRawData(data: any, machineId: string) {
  console.log('🔄 Processing raw data for machine:', machineId);
  console.log('📊 Raw data keys:', Object.keys(data));

  try {
    const dataPoint = {
      machine_id: machineId,
      timestamp_utc: data._time,
      // Core sensor data with null fallbacks
      time_seconds: data.time_seconds || null,
      water_level_l: data.water_level_L || null,
      ambient_temp_c: data.ambient_temp_C || null,
      refrigerant_temp_c: data.refrigerant_temp_C || null,
      ambient_rh_pct: data.ambient_rh_pct || null,
      exhaust_temp_c: data.exhaust_temp_C || null,
      exhaust_rh_pct: data.exhaust_rh_pct || null,
      current_a: data.current_A || null,
      // Control and status fields
      collector_ls1: data.collector_ls1 || null,
      compressor_on: data.compressor_on || 0,
      eev_position: data.eev_position || null,
      // Boolean status fields
      treating_water: data.treating_water || false,
      serving_water: data.serving_water || false,
      producing_water: data.producing_water || false,
      full_tank: data.full_tank || false,
      disinfecting: data.disinfecting || false,
      frost_identified: data.frost_identified || false,
      defrosting: data.defrosting || false,
    };

    console.log('✅ Processed data point:', {
      machine_id: dataPoint.machine_id,
      timestamp: dataPoint.timestamp_utc,
      water_level: dataPoint.water_level_l,
      producing_water: dataPoint.producing_water,
      field_count: Object.keys(dataPoint).length
    });
    
    return dataPoint;
  } catch (error) {
    console.error('❌ Error processing raw data:', error);
    throw new Error(`Data processing failed: ${error.message}`);
  }
}

// Enhanced storage with detailed error logging
async function storeDataPoint(supabase: any, dataPoint: any) {
  try {
    console.log('💾 Attempting to store data point for machine:', dataPoint.machine_id);
    console.log('📊 Data point structure:', {
      keys: Object.keys(dataPoint),
      timestamp: dataPoint.timestamp_utc,
      water_level: dataPoint.water_level_l
    });

    // Check for existing data first
    const { data: existingData, error: checkError } = await supabase
      .from('raw_machine_data')
      .select('id, timestamp_utc')
      .eq('machine_id', dataPoint.machine_id)
      .eq('timestamp_utc', dataPoint.timestamp_utc)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing data:', checkError);
      throw new Error(`Failed to check existing data: ${checkError.message}`);
    }

    if (existingData) {
      console.log('ℹ️ Data point already exists, skipping insert:', existingData.id);
      return { success: true, action: 'skipped', reason: 'duplicate' };
    }

    // Insert new data point
    const { data: insertData, error: insertError } = await supabase
      .from('raw_machine_data')
      .insert([dataPoint])
      .select('id, timestamp_utc, water_level_l');

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      console.error('❌ Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log('✅ Successfully stored new data point:', insertData[0]);
    return { success: true, action: 'inserted', data: insertData[0] };

  } catch (error) {
    console.error('❌ Critical storage error:', error);
    throw error;
  }
}

// Build enhanced response with debug info
function buildResponse(data: any, storageResult?: any) {
  console.log('🏗️ Building enhanced response from data');
  
  const response = {
    status: 'ok',
    data: {
      _time: data._time,
      water_level_L: data.water_level_L,
      compressor_on: data.compressor_on || 0,
      current_A: data.current_A,
      collector_ls1: data.collector_ls1,
      ambient_temp_C: data.ambient_temp_C,
      refrigerant_temp_C: data.refrigerant_temp_C,
      exhaust_temp_C: data.exhaust_temp_C,
      exhaust_rh_pct: data.exhaust_rh_pct,
      frost_identified: data.frost_identified || false,
      defrosting: data.defrosting || false,
      eev_position: data.eev_position,
      time_seconds: data.time_seconds,
      producing_water: data.producing_water || false,
      full_tank: data.full_tank || false,
      treating_water: data.treating_water || false,
      serving_water: data.serving_water || false,
      disinfecting: data.disinfecting || false,
    },
    storage: storageResult || { success: false, action: 'not_attempted' },
    debug: {
      queryApproach: 'enhanced_multi_range_debugging',
      fieldsRetrieved: Object.keys(data).length - 1,
      waterLevel: data.water_level_L,
      compressorStatus: data.compressor_on,
      producingWater: data.producing_water,
      fullTank: data.full_tank,
      timestamp: data._time,
      dataFreshness: data._time ? `${Math.round((new Date().getTime() - new Date(data._time).getTime()) / (1000 * 60))} minutes old` : 'unknown'
    }
  };

  console.log('📤 Built enhanced response with storage info');
  return response;
}

// Main serve function
serve(async (req) => {
  console.log('🚀 Enhanced Edge Function get-machine-data invoked:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment
    validateEnvironment();

    let machineUID: string | null = null;

    // Extract UID from query parameters or request body
    if (req.method === 'GET') {
      const url = new URL(req.url);
      machineUID = url.searchParams.get('uid');
    } else if (req.method === 'POST') {
      const body = await req.json();
      machineUID = body.uid;
    }

    // Use default UID if none provided
    if (!machineUID) {
      machineUID = '353636343034510C003F0046';
      console.log('⚠️ No UID provided, using default UID:', machineUID);
    }

    console.log('🔍 Processing data for machine UID with enhanced debugging:', machineUID);

    // Create Supabase client for machine lookup
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Look up the actual machine ID from the UID
    const machineId = await getMachineIdFromUID(supabase, machineUID);
    
    if (!machineId) {
      console.log('❌ Machine ID not found for UID:', machineUID);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Machine not found for the provided UID',
          uid: machineUID
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Using machine ID:', machineId, 'for UID:', machineUID);

    // Create InfluxDB client
    const influxClient = await createInfluxClient();
    
    // Get the InfluxDB organization from environment variable
    const INFLUXDB_ORG = Deno.env.get('INFLUXDB_ORG')!;
    console.log('🔧 Using InfluxDB organization:', INFLUXDB_ORG);
    
    const queryApi = influxClient.getQueryApi(INFLUXDB_ORG);

    // Fetch data using the enhanced approach
    const parsedData = await fetchLatestMachineData(queryApi, machineUID);
    
    if (!parsedData) {
      console.log('❌ No data retrieved from InfluxDB for UID:', machineUID);
      return new Response(
        JSON.stringify({ 
          status: 'no_data', 
          message: 'No recent data found for this machine UID in the last 24 hours',
          uid: machineUID,
          debug: {
            searchRanges: ['1 hour', '6 hours', '24 hours'],
            bucket: 'KumulusData',
            measurement: 'awg_data_full'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔄 Processing data point:', parsedData._time);
    console.log('💧 Water level:', parsedData.water_level_L);
    console.log('⚡ Compressor:', parsedData.compressor_on);
    
    // Process the raw data
    const processedData = processRawData(parsedData, machineId);
    console.log('⚙️ Processed data with all sensor fields');

    // Store data in Supabase with enhanced error handling
    let storageResult;
    try {
      storageResult = await storeDataPoint(supabase, processedData);
      console.log('💾 Storage result:', storageResult);
    } catch (storageError) {
      console.error('❌ Storage failed:', storageError);
      storageResult = { 
        success: false, 
        action: 'failed', 
        error: storageError.message 
      };
    }
    
    // Build and return enhanced response
    const response = buildResponse(parsedData, storageResult);
    console.log('📤 Returning enhanced response for UID:', machineUID, 'machine ID:', machineId);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Critical Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Internal server error',
        error: error.message,
        debug: 'Check function logs for detailed error information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
