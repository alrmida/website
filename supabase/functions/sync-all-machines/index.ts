
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

// Get all active machines with UIDs
async function getActiveMachines(supabase: any) {
  try {
    console.log('🔍 Fetching all active machines with microcontroller UIDs...');
    
    const { data: machines, error } = await supabase
      .from('machines')
      .select(`
        id,
        machine_id,
        name,
        machine_microcontrollers!inner(
          microcontroller_uid,
          assigned_at
        )
      `)
      .is('machine_microcontrollers.unassigned_at', null)
      .order('machine_microcontrollers.assigned_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching machines:', error);
      throw new Error(`Failed to fetch machines: ${error.message}`);
    }

    const activeMachines = machines?.map(machine => ({
      machineId: machine.machine_id,
      name: machine.name,
      uid: machine.machine_microcontrollers[0]?.microcontroller_uid
    })).filter(m => m.uid) || [];

    console.log(`✅ Found ${activeMachines.length} active machines with UIDs:`, activeMachines);
    return activeMachines;
  } catch (error) {
    console.error('❌ Exception fetching machines:', error);
    throw error;
  }
}

// Create InfluxDB client
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

// CSV parsing function
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

// Fetch latest machine data from InfluxDB
async function fetchLatestMachineData(queryApi: any, machineUID: string) {
  console.log(`🔍 Fetching latest data for UID: ${machineUID}`);
  
  const fields = [
    'water_level_L', 'ambient_temp_C', 'refrigerant_temp_C', 'ambient_rh_pct',
    'exhaust_temp_C', 'exhaust_rh_pct', 'current_A', 'collector_ls1',
    'compressor_on', 'eev_position', 'treating_water', 'serving_water',
    'producing_water', 'full_tank', 'disinfecting', 'frost_identified',
    'defrosting', 'time_seconds'
  ];

  const timeRanges = ['-1h', '-6h', '-24h'];
  let result: any = {};
  let latestTime: string | null = null;
  let dataFound = false;

  for (const timeRange of timeRanges) {
    console.log(`🔍 Trying time range: ${timeRange} for UID: ${machineUID}`);
    
    const baseQuery = `
      from(bucket: "KumulusData")
        |> range(start: ${timeRange})
        |> filter(fn: (r) => r["_measurement"] == "awg_data_full")
        |> filter(fn: (r) => r["uid"] == "${machineUID}")
    `;

    let fieldsFound = 0;

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
              
              if (!latestTime || timestamp > latestTime) {
                latestTime = timestamp;
              }
              
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
      console.log(`✅ Data found for ${machineUID} in range ${timeRange} at timestamp: ${latestTime}`);
      break;
    }
  }

  if (!dataFound) {
    console.log(`❌ No data found for UID: ${machineUID} in any time range`);
    return null;
  }

  return result;
}

// Process raw data
function processRawData(data: any, machineId: string) {
  console.log(`🔄 Processing raw data for machine: ${machineId}`);

  try {
    const dataPoint = {
      machine_id: machineId,
      timestamp_utc: data._time,
      time_seconds: data.time_seconds || null,
      water_level_l: data.water_level_L || null,
      ambient_temp_c: data.ambient_temp_C || null,
      refrigerant_temp_c: data.refrigerant_temp_C || null,
      ambient_rh_pct: data.ambient_rh_pct || null,
      exhaust_temp_c: data.exhaust_temp_C || null,
      exhaust_rh_pct: data.exhaust_rh_pct || null,
      current_a: data.current_A || null,
      collector_ls1: data.collector_ls1 || null,
      compressor_on: data.compressor_on || 0,
      eev_position: data.eev_position || null,
      treating_water: data.treating_water || false,
      serving_water: data.serving_water || false,
      producing_water: data.producing_water || false,
      full_tank: data.full_tank || false,
      disinfecting: data.disinfecting || false,
      frost_identified: data.frost_identified || false,
      defrosting: data.defrosting || false,
    };

    console.log(`✅ Processed data point for ${machineId}:`, {
      timestamp: dataPoint.timestamp_utc,
      water_level: dataPoint.water_level_l,
      producing_water: dataPoint.producing_water
    });
    
    return dataPoint;
  } catch (error) {
    console.error(`❌ Error processing raw data for ${machineId}:`, error);
    throw new Error(`Data processing failed: ${error.message}`);
  }
}

// Store or update data point with deduplication
async function upsertDataPoint(supabase: any, dataPoint: any) {
  try {
    console.log(`💾 Upserting data point for machine: ${dataPoint.machine_id}`);

    // Check for existing data
    const { data: existingData, error: checkError } = await supabase
      .from('raw_machine_data')
      .select('id, timestamp_utc')
      .eq('machine_id', dataPoint.machine_id)
      .eq('timestamp_utc', dataPoint.timestamp_utc)
      .maybeSingle();

    if (checkError) {
      console.error(`❌ Error checking existing data for ${dataPoint.machine_id}:`, checkError);
      throw new Error(`Failed to check existing data: ${checkError.message}`);
    }

    if (existingData) {
      console.log(`ℹ️ Data point already exists for ${dataPoint.machine_id}, skipping insert`);
      return { success: true, action: 'skipped', reason: 'duplicate' };
    }

    // Insert new data point
    const { data: insertData, error: insertError } = await supabase
      .from('raw_machine_data')
      .insert([dataPoint])
      .select('id, timestamp_utc, water_level_l');

    if (insertError) {
      console.error(`❌ Database insert error for ${dataPoint.machine_id}:`, insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log(`✅ Successfully stored new data point for ${dataPoint.machine_id}:`, insertData[0]);
    return { success: true, action: 'inserted', data: insertData[0] };

  } catch (error) {
    console.error(`❌ Critical storage error for ${dataPoint.machine_id}:`, error);
    throw error;
  }
}

// Log ingestion result
async function logIngestionResult(supabase: any, machineId: string, success: boolean, message: string, errorDetails?: string) {
  try {
    await supabase
      .from('data_ingestion_logs')
      .insert([{
        machine_id: machineId,
        log_type: success ? 'success' : 'error',
        message: message,
        error_details: errorDetails || null
      }]);
  } catch (error) {
    console.error(`❌ Failed to log ingestion result for ${machineId}:`, error);
  }
}

// Main serve function
serve(async (req) => {
  console.log('🚀 Sync All Machines Edge Function invoked:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment
    validateEnvironment();

    // Create Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get all active machines
    const activeMachines = await getActiveMachines(supabase);
    
    if (activeMachines.length === 0) {
      console.log('⚠️ No active machines found');
      return new Response(
        JSON.stringify({ 
          status: 'warning', 
          message: 'No active machines with microcontroller UIDs found',
          processedMachines: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create InfluxDB client
    const influxClient = await createInfluxClient();
    const INFLUXDB_ORG = Deno.env.get('INFLUXDB_ORG')!;
    const queryApi = influxClient.getQueryApi(INFLUXDB_ORG);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each machine
    for (const machine of activeMachines) {
      try {
        console.log(`🔄 Processing machine: ${machine.name} (${machine.machineId})`);

        // Fetch latest data from InfluxDB
        const parsedData = await fetchLatestMachineData(queryApi, machine.uid);
        
        if (!parsedData) {
          console.log(`❌ No data found for machine: ${machine.machineId}`);
          await logIngestionResult(supabase, machine.machineId, false, 'No data found in InfluxDB');
          results.push({
            machineId: machine.machineId,
            name: machine.name,
            status: 'no_data',
            message: 'No recent data found in InfluxDB'
          });
          errorCount++;
          continue;
        }

        // Process and store the data
        const processedData = processRawData(parsedData, machine.machineId);
        const storageResult = await upsertDataPoint(supabase, processedData);

        await logIngestionResult(supabase, machine.machineId, true, 
          `Data ${storageResult.action} successfully`);

        results.push({
          machineId: machine.machineId,
          name: machine.name,
          status: 'success',
          action: storageResult.action,
          timestamp: processedData.timestamp_utc,
          waterLevel: processedData.water_level_l
        });
        
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing machine ${machine.machineId}:`, error);
        await logIngestionResult(supabase, machine.machineId, false, 
          'Processing failed', error.message);
        
        results.push({
          machineId: machine.machineId,
          name: machine.name,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`✅ Sync completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        status: 'completed',
        processedMachines: activeMachines.length,
        successCount,
        errorCount,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Critical Sync All Machines error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Internal server error',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
