
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

// Enhanced CSV parser to handle all 18 Node-RED fields
function parseCSVResponse(csvText: string) {
  console.log('🔍 Parsing CSV response (first 200 chars):', csvText.substring(0, 200));
  
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      console.log('⚠️ No data found in CSV response');
      return null;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
    const dataRow = lines[1].split(',').map(d => d.trim().replace(/\r$/, ''));
    
    console.log('📊 CSV headers:', headers);
    console.log('📋 Data row:', dataRow);
    
    if (dataRow.length !== headers.length) {
      console.error('❌ CSV parsing error: header/data length mismatch');
      return null;
    }

    const data: any = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim();
      const value = dataRow[i].trim();
      
      if (header === '_time') {
        data[header] = value;
      } else {
        // Map all InfluxDB field names to our expected format
        const fieldMapping: { [key: string]: string } = {
          'time_seconds': 'time_seconds',
          'ambient_temp_C': 'ambient_temp_C',
          'refrigerant_temp_C': 'refrigerant_temp_C',
          'ambient_rh_pct': 'ambient_rh_pct',
          'exhaust_temp_C': 'exhaust_temp_C',
          'exhaust_rh_pct': 'exhaust_rh_pct',
          'water_level_L': 'water_level_L',
          'current_A': 'current_A',
          'collector_ls1': 'collector_ls1',
          'treating_water': 'treating_water',
          'serving_water': 'serving_water',
          'producing_water': 'producing_water',
          'compressor_on': 'compressor_on',
          'full_tank': 'full_tank',
          'disinfecting': 'disinfecting',
          'frost_identified': 'frost_identified',
          'defrosting': 'defrosting',
          'eev_position': 'eev_position'
        };

        const mappedField = fieldMapping[header] || header;
        
        // Parse numeric values
        if (['time_seconds', 'ambient_temp_C', 'refrigerant_temp_C', 'ambient_rh_pct', 
             'exhaust_temp_C', 'exhaust_rh_pct', 'water_level_L', 'current_A'].includes(mappedField)) {
          data[mappedField] = !isNaN(Number(value)) && value !== '' ? Number(value) : null;
        }
        // Parse integer values
        else if (['collector_ls1', 'compressor_on', 'eev_position'].includes(mappedField)) {
          data[mappedField] = !isNaN(Number(value)) && value !== '' ? Math.round(Number(value)) : null;
        }
        // Parse boolean values (1/0 from Node-RED)
        else if (['treating_water', 'serving_water', 'producing_water', 'full_tank', 
                  'disinfecting', 'frost_identified', 'defrosting'].includes(mappedField)) {
          data[mappedField] = Number(value) === 1;
        }
        else {
          data[header] = value;
        }
      }
    }

    console.log('✅ Parsed data from InfluxDB:', data);
    
    if (!data._time) {
      console.error('❌ Missing _time field in parsed data');
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ CSV parsing error:', error);
    return null;
  }
}

// Enhanced data processor to handle all 18 fields
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

  console.log('✅ Processed data point with all 18 fields:', dataPoint);
  return dataPoint;
}

// Store data in Supabase
async function storeDataPoint(supabase: any, dataPoint: any, waterLevel: number | null) {
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
        console.error('Error storing data in Supabase:', insertError);
      } else {
        console.log('Successfully stored new data point for machine:', dataPoint.machine_id, 'with all sensor data');
      }
    } else {
      console.log('Data point already exists, skipping insert');
    }
  } catch (storageError) {
    console.error('Exception storing data:', storageError);
  }
}

// Build response with enhanced debug info
function buildResponse(data: any) {
  console.log('🏗️ Building response from data:', data);
  
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
      frost_identified: data.frost_identified,
      defrosting: data.defrosting,
    },
    debug: {
      originalData: data,
      allFieldsCount: Object.keys(data).length,
      parsedFields: Object.keys(data).filter(key => key !== '_time')
    }
  };

  console.log('📤 Built enhanced response with all available fields:', response);
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

    console.log('🔍 Processing enhanced data for machine UID:', machineUID);

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
    
    // Create enhanced Flux query to get all 18 fields
    const query = `
      from(bucket: "KumulusData")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> filter(fn: (r) => r.uid == "${machineUID}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    console.log('📊 Executing enhanced Flux query for UID:', machineUID);
    console.log('🔍 Query details: bucket=KumulusData, measurement=awg_data_full, retrieving all 18 sensor fields');

    // Execute query with proper CSV handling
    const queryApi = influxClient.getQueryApi(INFLUXDB_ORG);
    
    // Collect CSV lines properly
    const csvLines: string[] = [];
    
    const queryResult = await new Promise<string>((resolve, reject) => {
      queryApi.queryLines(query, {
        next: (line: string) => {
          console.log('📥 Received line from InfluxDB:', line);
          csvLines.push(line);
        },
        error: (error: Error) => {
          console.error('❌ InfluxDB query error:', error);
          reject(error);
        },
        complete: () => {
          console.log('✅ InfluxDB query completed. Lines received:', csvLines.length);
          resolve(csvLines.join('\n'));
        }
      });
    });

    if (csvLines.length === 0) {
      console.log('⚠️ No data returned from query for UID:', machineUID);
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

    // Parse and process the enhanced data
    const parsedData = parseCSVResponse(queryResult);
    
    if (!parsedData) {
      return new Response(
        JSON.stringify({ 
          status: 'no_data', 
          message: 'No valid data points found after parsing',
          uid: machineUID
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔄 Processing enhanced data point:', parsedData._time);
    console.log('💧 Water level:', parsedData.water_level_L);
    console.log('⚡ Compressor:', parsedData.compressor_on);
    console.log('🔌 Current:', parsedData.current_A);
    console.log('❄️ Frost identified:', parsedData.frost_identified);
    console.log('🧊 Defrosting:', parsedData.defrosting);
    
    // Process the raw data using the correct machine ID with all 18 fields
    const processedData = processRawData(parsedData, machineId);
    console.log('⚙️ Processed enhanced data with all sensor fields:', processedData);

    // Store enhanced data in Supabase
    await storeDataPoint(supabase, processedData, parsedData.water_level_L);
    
    // Build and return enhanced response
    const response = buildResponse(parsedData);
    console.log('📤 Returning enhanced response for UID:', machineUID, 'machine ID:', machineId, 'with all sensor data');
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Enhanced Edge Function error:', error);
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
