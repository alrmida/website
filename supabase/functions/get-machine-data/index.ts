
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

// Fixed CSV parser - now expects proper CSV format
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
      } else if (header.includes('water_level') || header === 'water_level_L') {
        data.water_level_L = !isNaN(Number(value)) && value !== '' ? Number(value) : null;
      } else if (header.includes('compressor') || header === 'compressor_on') {
        data.compressor_on = !isNaN(Number(value)) && value !== '' ? Number(value) : 0;
      } else if (!isNaN(Number(value)) && value !== '') {
        data[header] = Number(value);
      } else {
        data[header] = value;
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

// Fixed data processor - now uses correct machine ID
function processRawData(data: any, machineId: string) {
  console.log('🔄 Processing raw data for machine:', machineId);

  const waterLevel = data.water_level_L ? Number(data.water_level_L) : null;
  
  const convertToBoolean = (value: number | boolean | undefined): boolean => {
    if (typeof value === 'boolean') return value;
    return value === 1;
  };

  const dataPoint = {
    machine_id: machineId, // Use the actual machine ID, not UID_prefix
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

  console.log('✅ Processed data point:', dataPoint);
  return dataPoint;
}

// Store data in Supabase - now uses dynamic machine ID
async function storeDataPoint(supabase: any, dataPoint: any, waterLevel: number | null) {
  try {
    const { data: existingData } = await supabase
      .from('raw_machine_data')
      .select('id')
      .eq('machine_id', dataPoint.machine_id) // Use the dynamic machine_id from dataPoint
      .eq('timestamp_utc', dataPoint.timestamp_utc)
      .maybeSingle();

    if (!existingData) {
      const { error: insertError } = await supabase
        .from('raw_machine_data')
        .insert([dataPoint]);

      if (insertError) {
        console.error('Error storing data in Supabase:', insertError);
      } else {
        console.log('Successfully stored new data point for machine:', dataPoint.machine_id, 'with water level:', waterLevel);
      }
    } else {
      console.log('Data point already exists, skipping insert');
    }
  } catch (storageError) {
    console.error('Exception storing data:', storageError);
  }
}

// Build response
function buildResponse(data: any) {
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

// Main serve function
serve(async (req) => {
  console.log('🚀 Edge Function get-machine-data invoked:', req.method);

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

    console.log('🔍 Processing data for machine UID:', machineUID);

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
    
    // Create Flux query with correct bucket and measurement names
    const query = `
      from(bucket: "KumulusData")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> filter(fn: (r) => r.uid == "${machineUID}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    console.log('📊 Executing Flux query for UID:', machineUID);
    console.log('🔍 Query details: bucket=KumulusData, measurement=awg_data_full');

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

    // Parse and process the data
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

    console.log('🔄 Processing data point:', parsedData._time);
    console.log('💧 Water level:', parsedData.water_level_L);
    console.log('⚡ Compressor:', parsedData.compressor_on);
    
    // Process the raw data using the correct machine ID
    const processedData = processRawData(parsedData, machineId);
    console.log('⚙️ Processed data:', processedData);

    // Store data in Supabase with correct machine ID
    await storeDataPoint(supabase, processedData, parsedData.water_level_L);
    
    // Build and return response
    const response = buildResponse(parsedData);
    console.log('📤 Returning response for UID:', machineUID, 'machine ID:', machineId, 'with water level:', parsedData.water_level_L);
    
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
