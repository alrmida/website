
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

// Simplified CSV parser
function parseCSVResponse(responseText: string) {
  console.log('🔍 Parsing CSV response:', responseText.substring(0, 200));
  
  try {
    const lines = responseText.trim().split('\n');
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

// Simplified data processor
function processRawData(data: any, machineId: string) {
  console.log('🔄 Processing raw data:', data);

  const waterLevel = data.water_level_L ? Number(data.water_level_L) : null;
  
  const convertToBoolean = (value: number | boolean | undefined): boolean => {
    if (typeof value === 'boolean') return value;
    return value === 1;
  };

  const dataPoint = {
    machine_id: machineId,
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

// Store data in Supabase
async function storeDataPoint(supabase: any, dataPoint: any, waterLevel: number | null) {
  try {
    const MACHINE_ID = 'KU001619000079';
    
    const { data: existingData } = await supabase
      .from('raw_machine_data')
      .select('id')
      .eq('machine_id', MACHINE_ID)
      .eq('timestamp_utc', dataPoint.timestamp_utc)
      .maybeSingle();

    if (!existingData) {
      const { error: insertError } = await supabase
        .from('raw_machine_data')
        .insert([dataPoint]);

      if (insertError) {
        console.error('Error storing data in Supabase:', insertError);
      } else {
        console.log('Successfully stored new data point with water level:', waterLevel);
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

    // Create InfluxDB client
    const influxClient = await createInfluxClient();
    
    // Create Flux query
    const query = `
      from(bucket: "awg_data_full")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "awg_data")
        |> filter(fn: (r) => r.uid == "${machineUID}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    console.log('📊 Executing Flux query for UID:', machineUID);

    // Execute query using async/await pattern
    const queryApi = influxClient.getQueryApi('kumulus');
    const csvData: string[] = [];
    
    // Use Promise to handle the callback-based query API
    const queryResult = await new Promise<string[]>((resolve, reject) => {
      queryApi.queryRows(query, {
        next: (row: string[], tableMeta: any) => {
          console.log('📥 Received row from InfluxDB:', row);
          csvData.push(row.join(','));
        },
        error: (error: Error) => {
          console.error('❌ InfluxDB query error:', error);
          reject(error);
        },
        complete: () => {
          console.log('✅ InfluxDB query completed. Rows received:', csvData.length);
          resolve(csvData);
        }
      });
    });

    if (queryResult.length === 0) {
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
    const parsedData = parseCSVResponse(queryResult.join('\n'));
    
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
    
    // Process the raw data
    const processedData = processRawData(parsedData, `UID_${machineUID}`);
    console.log('⚙️ Processed data:', processedData);

    // Create Supabase client and store data
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    await storeDataPoint(supabase, processedData, parsedData.water_level_L);
    
    // Build and return response
    const response = buildResponse(parsedData);
    console.log('📤 Returning response for UID:', machineUID, 'with water level:', parsedData.water_level_L);
    
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
