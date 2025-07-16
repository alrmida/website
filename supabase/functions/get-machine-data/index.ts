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

// Improved approach - get all fields with better debugging and wider time range
async function fetchLatestMachineData(queryApi: any, machineUID: string) {
  console.log('🔍 Fetching latest machine data with fixed CSV parsing for UID:', machineUID);
  
  // Define the fields we want to fetch
  const fields = [
    'water_level_L', 'ambient_temp_C', 'refrigerant_temp_C', 'ambient_rh_pct',
    'exhaust_temp_C', 'exhaust_rh_pct', 'current_A', 'collector_ls1',
    'compressor_on', 'eev_position', 'treating_water', 'serving_water',
    'producing_water', 'full_tank', 'disinfecting', 'frost_identified',
    'defrosting', 'time_seconds'
  ];

  // Use a much wider time range to ensure we catch recent data
  const baseQuery = `
    from(bucket: "KumulusData")
      |> range(start: -1h)
      |> filter(fn: (r) => r["_measurement"] == "awg_data_full")
      |> filter(fn: (r) => r["uid"] == "${machineUID}")
  `;

  console.log('📊 Base InfluxDB query:', baseQuery);

  const result: any = {};
  let latestTime: string | null = null;
  let fieldsFound = 0;

  // Fetch each field individually to avoid pivot issues
  for (const field of fields) {
    try {
      const query = `${baseQuery}
        |> filter(fn: (r) => r["_field"] == "${field}")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)`;

      console.log(`🔍 Executing query for ${field}`);

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

      console.log(`📄 Raw CSV response for ${field} (${csvLines.length} lines)`);

      if (csvLines.length > 1) {
        // Find the header line (starts with ,result,table...)
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
          
          console.log(`📋 Headers for ${field}:`, headers.slice(0, 10)); // Show first 10 for brevity
          console.log(`📋 Values for ${field}:`, values.slice(0, 10));
          
          const timeIndex = headers.indexOf('_time');
          const valueIndex = headers.indexOf('_value');
          
          if (timeIndex >= 0 && valueIndex >= 0 && timeIndex < values.length && valueIndex < values.length) {
            const timestamp = values[timeIndex];
            const value = values[valueIndex];
            
            console.log(`⏰ Found ${field} at timestamp ${timestamp} with value ${value}`);
            
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
              console.log(`✅ Successfully stored ${field}: ${result[field]}`);
            } else {
              console.log(`⚠️ Empty or null value for ${field}`);
            }
          } else {
            console.log(`❌ Missing _time or _value columns for ${field}. TimeIndex: ${timeIndex}, ValueIndex: ${valueIndex}, ValuesLength: ${values.length}`);
          }
        } else {
          console.log(`❌ Could not find header or data line for ${field}. HeaderIndex: ${headerLineIndex}, DataIndex: ${dataLineIndex}`);
        }
      } else {
        console.log(`⚠️ No CSV data returned for ${field} (only ${csvLines.length} lines)`);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${field}:`, error);
      // Continue with other fields even if one fails
    }
  }

  if (latestTime) {
    result._time = latestTime;
    
    // Calculate data freshness
    const now = new Date();
    const dataTime = new Date(latestTime);
    const ageMinutes = Math.round((now.getTime() - dataTime.getTime()) / (1000 * 60));
    
    console.log('✅ Successfully fetched latest machine data:', {
      timestamp: latestTime,
      dataAgeMinutes: ageMinutes,
      fieldsFound: fieldsFound,
      totalFields: fields.length,
      waterLevel: result.water_level_L,
      compressor: result.compressor_on
    });
    
    if (ageMinutes > 60) {
      console.log(`⚠️ Data is ${ageMinutes} minutes old - might be stale`);
    }
  } else {
    console.log('❌ No recent data found for UID:', machineUID);
    console.log('🔍 Debug: Total fields attempted:', fields.length, 'Fields found:', fieldsFound);
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
      frost_identified: data.frost_identified || false,
      defrosting: data.defrosting || false,
      eev_position: data.eev_position,
      time_seconds: data.time_seconds,
      // Add the missing boolean status fields
      producing_water: data.producing_water || false,
      full_tank: data.full_tank || false,
      treating_water: data.treating_water || false,
      serving_water: data.serving_water || false,
      disinfecting: data.disinfecting || false,
    },
    debug: {
      queryApproach: 'fixed_csv_parsing',
      fieldsRetrieved: Object.keys(data).length - 1,
      waterLevel: data.water_level_L,
      compressorStatus: data.compressor_on,
      producingWater: data.producing_water,
      fullTank: data.full_tank,
      timestamp: data._time,
      dataFreshness: data._time ? `${Math.round((new Date().getTime() - new Date(data._time).getTime()) / (1000 * 60))} minutes old` : 'unknown'
    }
  };

  console.log('📤 Built response with all status fields included');
  console.log('🔍 Status fields in response:', {
    producing_water: response.data.producing_water,
    full_tank: response.data.full_tank,
    compressor_on: response.data.compressor_on,
    defrosting: response.data.defrosting
  });
  
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

    console.log('🔍 Processing data for machine UID with fixed CSV parsing:', machineUID);

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

    // Fetch data using the fixed CSV parsing approach
    const parsedData = await fetchLatestMachineData(queryApi, machineUID);
    
    if (!parsedData) {
      console.log('❌ No data retrieved from InfluxDB for UID:', machineUID);
      return new Response(
        JSON.stringify({ 
          status: 'no_data', 
          message: 'No recent data found for this machine UID in the last hour',
          uid: machineUID,
          debug: {
            searchRange: '1 hour',
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
    
    // Process the raw data using the correct machine ID
    const processedData = processRawData(parsedData, machineId);
    console.log('⚙️ Processed data with all sensor fields');

    // Store data in Supabase to maintain the pipeline
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
