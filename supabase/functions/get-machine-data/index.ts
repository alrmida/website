
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

// Lookup machine ID from microcontroller UID
async function getMachineIdFromUID(supabase: any, microcontrollerUID: string): Promise<string | null> {
  try {
    console.log('🔍 Looking up machine ID for UID:', microcontrollerUID);
    
    const { data: machine, error } = await supabase
      .from('machines')
      .select('machine_id')
      .eq('microcontroller_uid', microcontrollerUID)
      .maybeSingle();

    if (error) {
      console.error('❌ Error looking up machine:', error);
      return null;
    }

    if (!machine) {
      console.log('⚠️ No machine found for UID:', microcontrollerUID);
      return null;
    }

    console.log('✅ Found machine ID:', machine.machine_id, 'for UID:', microcontrollerUID);
    return machine.machine_id;
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

// New simplified approach - get all fields with separate queries
async function fetchLatestMachineData(queryApi: any, machineUID: string) {
  console.log('🔍 Fetching latest machine data using direct field queries for UID:', machineUID);
  
  // Define the fields we want to fetch
  const fields = [
    'water_level_L', 'ambient_temp_C', 'refrigerant_temp_C', 'ambient_rh_pct',
    'exhaust_temp_C', 'exhaust_rh_pct', 'current_A', 'collector_ls1',
    'compressor_on', 'eev_position', 'treating_water', 'serving_water',
    'producing_water', 'full_tank', 'disinfecting', 'frost_identified',
    'defrosting', 'time_seconds'
  ];

  // Use your proven query pattern - get latest data with wider time range
  const baseQuery = `
    from(bucket: "KumulusData")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "awg_data_full")
      |> filter(fn: (r) => r["uid"] == "${machineUID}")
  `;

  const result: any = {};
  let latestTime: string | null = null;

  // Fetch each field individually to avoid pivot issues
  for (const field of fields) {
    try {
      const query = `${baseQuery}
        |> filter(fn: (r) => r["_field"] == "${field}")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)`;

      console.log(`📊 Fetching ${field} for UID: ${machineUID}`);

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
        // Parse the CSV response (skip header)
        const dataLine = csvLines.find(line => !line.startsWith('#') && line !== csvLines[0]);
        if (dataLine) {
          const values = dataLine.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const headers = csvLines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          
          const timeIndex = headers.indexOf('_time');
          const valueIndex = headers.indexOf('_value');
          
          if (timeIndex >= 0 && valueIndex >= 0) {
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
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${field}:`, error);
      // Continue with other fields even if one fails
    }
  }

  if (latestTime) {
    result._time = latestTime;
    console.log('✅ Successfully fetched latest machine data:', {
      timestamp: latestTime,
      fieldsCount: Object.keys(result).length - 1,
      waterLevel: result.water_level_L,
      compressor: result.compressor_on
    });
  } else {
    console.log('⚠️ No recent data found for UID:', machineUID);
    return null;
  }

  return result;
}

// Process raw data to match database schema
function processRawData(data: any, machineId: string) {
  console.log('🔄 Processing raw data for machine:', machineId);

  const dataPoint = {
    machine_id: machineId,
    timestamp_utc: data._time,
    // Core sensor data
    time_seconds: data.time_seconds,
    water_level_l: data.water_level_L,
    ambient_temp_c: data.ambient_temp_C,
    refrigerant_temp_c: data.refrigerant_temp_C,
    ambient_rh_pct: data.ambient_rh_pct,
    exhaust_temp_c: data.exhaust_temp_C,
    exhaust_rh_pct: data.exhaust_rh_pct,
    current_a: data.current_A,
    // Control and status fields
    collector_ls1: data.collector_ls1,
    compressor_on: data.compressor_on || 0,
    eev_position: data.eev_position,
    // Boolean status fields
    treating_water: data.treating_water || false,
    serving_water: data.serving_water || false,
    producing_water: data.producing_water || false,
    full_tank: data.full_tank || false,
    disinfecting: data.disinfecting || false,
    frost_identified: data.frost_identified || false,
    defrosting: data.defrosting || false,
  };

  console.log('✅ Processed data point with all fields:', {
    machine_id: dataPoint.machine_id,
    timestamp: dataPoint.timestamp_utc,
    water_level: dataPoint.water_level_l,
    compressor: dataPoint.compressor_on
  });
  
  return dataPoint;
}

// Store data in Supabase
async function storeDataPoint(supabase: any, dataPoint: any) {
  try {
    const { data: existingData } = await supabase
      .from('raw_machine_data')
      .select('id')
      .eq('machine_id', dataPoint.machine_id)
      .eq('timestamp_utc', dataPoint.timestamp_utc)
      .maybeSingle();

    if (!existingData) {
      const { error: insertError } = await supabase
        .from('raw_machine_data')
        .insert([dataPoint]);

      if (insertError) {
        console.error('❌ Error storing data in Supabase:', insertError);
      } else {
        console.log('✅ Successfully stored new data point for machine:', dataPoint.machine_id);
      }
    } else {
      console.log('ℹ️ Data point already exists, skipping insert');
    }
  } catch (storageError) {
    console.error('❌ Exception storing data:', storageError);
  }
}

// Build response
function buildResponse(data: any) {
  console.log('🏗️ Building response from data');
  
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
      frost_identified: data.frost_identified,
      defrosting: data.defrosting,
      eev_position: data.eev_position,
      time_seconds: data.time_seconds,
    },
    debug: {
      queryApproach: 'direct_field_queries',
      fieldsRetrieved: Object.keys(data).length - 1,
      waterLevel: data.water_level_L,
      compressorStatus: data.compressor_on,
      timestamp: data._time
    }
  };

  console.log('📤 Built response with direct query approach');
  return response;
}

// Main serve function
serve(async (req) => {
  console.log('🚀 Fixed Edge Function get-machine-data invoked:', req.method);

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

    console.log('🔍 Processing data for machine UID using direct queries:', machineUID);

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

    // Fetch data using the new direct approach
    const parsedData = await fetchLatestMachineData(queryApi, machineUID);
    
    if (!parsedData) {
      return new Response(
        JSON.stringify({ 
          status: 'no_data', 
          message: 'No recent data found for this machine UID',
          uid: machineUID
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
    
    // Process the raw data using the correct machine ID
    const processedData = processRawData(parsedData, machineId);
    console.log('⚙️ Processed data with all sensor fields');

    // Store data in Supabase to restore the pipeline
    await storeDataPoint(supabase, processedData);
    
    // Build and return response
    const response = buildResponse(parsedData);
    console.log('📤 Returning response for UID:', machineUID, 'machine ID:', machineId);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Edge Function error:', error);
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
