
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      machines: {
        Row: {
          id: number;
          machine_id: string;
          name: string;
        };
      };
      machine_microcontrollers: {
        Row: {
          id: string;
          machine_id: number;
          microcontroller_uid: string;
          assigned_at: string;
          unassigned_at: string | null;
        };
      };
      raw_machine_data: {
        Row: {
          id: string;
          machine_id: string;
          timestamp_utc: string;
          water_level_l: number;
          compressor_on: number;
          producing_water: boolean;
          full_tank: boolean;
        };
        Insert: {
          machine_id: string;
          timestamp_utc?: string;
          water_level_l?: number;
          compressor_on?: number;
          producing_water?: boolean;
          full_tank?: boolean;
        };
      };
      simple_water_snapshots: {
        Row: {
          id: string;
          machine_id: string;
          water_level_l: number;
          timestamp_utc: string;
        };
        Insert: {
          machine_id: string;
          water_level_l: number;
          timestamp_utc?: string;
        };
      };
      water_production_events: {
        Row: {
          id: string;
          machine_id: string;
          production_liters: number;
          previous_level: number;
          current_level: number;
          timestamp_utc: string;
          event_type: string;
        };
        Insert: {
          machine_id: string;
          production_liters: number;
          previous_level: number;
          current_level: number;
          timestamp_utc?: string;
          event_type?: string;
        };
      };
      data_ingestion_logs: {
        Insert: {
          machine_id: string;
          log_type: string;
          message: string;
          data_timestamp?: string;
          data_freshness_minutes?: number;
          influx_query?: string;
          influx_response_size?: number;
          error_details?: string;
        };
      };
    };
  };
}

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// InfluxDB configuration
const INFLUX_URL = Deno.env.get('INFLUXDB_URL');
const INFLUX_TOKEN = Deno.env.get('INFLUXDB_TOKEN');
const INFLUX_ORG = Deno.env.get('INFLUXDB_ORG');
const INFLUX_BUCKET = Deno.env.get('INFLUXDB_BUCKET') || 'KumulusData';

async function logDataIngestion(
  machineId: string,
  logType: string, 
  message: string, 
  extraData?: {
    dataTimestamp?: string;
    freshnessMinutes?: number;
    influxQuery?: string;
    influxResponseSize?: number;
    errorDetails?: string;
  }
) {
  try {
    await supabase.from('data_ingestion_logs').insert({
      machine_id: machineId,
      log_type: logType,
      message,
      data_timestamp: extraData?.dataTimestamp,
      data_freshness_minutes: extraData?.freshnessMinutes,
      influx_query: extraData?.influxQuery,
      influx_response_size: extraData?.influxResponseSize,
      error_details: extraData?.errorDetails
    });
  } catch (error) {
    console.error(`Failed to log data ingestion event for ${machineId}:`, error);
  }
}

async function getActiveMachines() {
  console.log('🔍 Fetching all active machines from database using new schema...');
  
  // Query machines with their current microcontroller assignments
  const { data: machinesWithUIDs, error } = await supabase
    .from('machines')
    .select(`
      id,
      machine_id,
      name,
      machine_microcontrollers!inner(
        microcontroller_uid,
        assigned_at,
        unassigned_at
      )
    `)
    .is('machine_microcontrollers.unassigned_at', null)
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Error fetching machines with UIDs:', error);
    throw new Error(`Failed to fetch machines: ${error.message}`);
  }

  if (!machinesWithUIDs || machinesWithUIDs.length === 0) {
    console.log('⚠️ No machines with active microcontroller assignments found');
    return [];
  }

  // Transform the data to a simpler format
  const machines = machinesWithUIDs.map(machine => ({
    machine_id: machine.machine_id,
    name: machine.name,
    microcontroller_uid: machine.machine_microcontrollers[0]?.microcontroller_uid || null
  })).filter(machine => machine.microcontroller_uid);

  console.log(`✅ Found ${machines.length} active machines with UIDs:`, machines.map(m => ({
    id: m.machine_id,
    uid: m.microcontroller_uid,
    name: m.name
  })));

  return machines;
}

async function fetchLatestDataFromInflux(machineUID: string, machineId: string): Promise<{ waterLevel: number; timestamp: string; compressorOn: number; producingWater: boolean; fullTank: boolean } | null> {
  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG) {
    console.log(`❌ InfluxDB configuration missing for machine ${machineId}`);
    await logDataIngestion(machineId, 'ERROR', 'InfluxDB configuration missing', {
      errorDetails: 'Missing INFLUX_URL, INFLUX_TOKEN, or INFLUX_ORG environment variables'
    });
    return null;
  }

  try {
    console.log(`🔍 Starting InfluxDB query for machine ${machineId} (UID: ${machineUID})...`);
    
    // Query InfluxDB for essential fields using the microcontroller UID
    const query = `
      from(bucket: "${INFLUX_BUCKET}")
        |> range(start: -2h)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> filter(fn: (r) => r._field == "water_level_L" or r._field == "compressor_on" or r._field == "producing_water" or r._field == "full_tank")
        |> filter(fn: (r) => r.uid == "${machineUID}")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 4)
    `;

    const baseUrl = INFLUX_URL.replace(/\/+$/, '');
    const queryUrl = `${baseUrl}/api/v2/query?org=${encodeURIComponent(INFLUX_ORG)}`;
    
    console.log(`🔗 Query URL for ${machineId}:`, queryUrl);
    console.log(`📝 Query for ${machineId}:`, query);
    
    await logDataIngestion(machineId, 'INFO', `Starting InfluxDB query for UID: ${machineUID}`, {
      influxQuery: query
    });
    
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${INFLUX_TOKEN}`,
        'Content-Type': 'application/vnd.flux',
        'Accept': 'application/csv',
      },
      body: query,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ InfluxDB query failed for ${machineId}:`, response.status, errorText);
      await logDataIngestion(machineId, 'ERROR', 'InfluxDB query failed', {
        errorDetails: `Status: ${response.status}, Response: ${errorText}`
      });
      return null;
    }

    const responseText = await response.text();
    const lines = responseText.trim().split('\n');
    
    console.log(`📊 InfluxDB Response Analysis for ${machineId}:`);
    console.log(`   - Total lines: ${lines.length}`);
    console.log(`   - Response size: ${responseText.length} characters`);
    
    await logDataIngestion(machineId, 'INFO', 'InfluxDB query successful', {
      influxResponseSize: responseText.length
    });
    
    if (lines.length < 2) {
      console.log(`⚠️ No data found in InfluxDB response for ${machineId} - trying longer time range`);
      
      // Try a longer time range if no recent data
      const longerQuery = `
        from(bucket: "${INFLUX_BUCKET}")
          |> range(start: -24h)
          |> filter(fn: (r) => r._measurement == "awg_data_full")
          |> filter(fn: (r) => r._field == "water_level_L" or r._field == "compressor_on" or r._field == "producing_water" or r._field == "full_tank")
          |> filter(fn: (r) => r.uid == "${machineUID}")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 4)
      `;
      
      const longerResponse = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${INFLUX_TOKEN}`,
          'Content-Type': 'application/vnd.flux',
          'Accept': 'application/csv',
        },
        body: longerQuery,
      });
      
      if (longerResponse.ok) {
        const longerResponseText = await longerResponse.text();
        const longerLines = longerResponseText.trim().split('\n');
        console.log(`📊 Extended search for ${machineId} found:`, longerLines.length, 'lines');
        
        if (longerLines.length >= 2) {
          lines.length = 0;
          lines.push(...longerLines);
        }
      }
      
      if (lines.length < 2) {
        await logDataIngestion(machineId, 'WARNING', 'No data in InfluxDB response even with 24h range', {
          influxResponseSize: responseText.length
        });
        return null;
      }
    }

    // Parse CSV response and extract data by field
    const headers = lines[0].split(',').map(h => h.trim());
    console.log(`📋 Headers for ${machineId}:`, headers);
    
    const timeIndex = headers.indexOf('_time');
    const valueIndex = headers.indexOf('_value');
    const fieldIndex = headers.indexOf('_field');
    
    if (timeIndex === -1 || valueIndex === -1 || fieldIndex === -1) {
      console.error(`❌ Invalid CSV format from InfluxDB for ${machineId}`);
      await logDataIngestion(machineId, 'ERROR', 'Invalid CSV format from InfluxDB', {
        errorDetails: `Headers: ${headers.join(', ')}`
      });
      return null;
    }

    // Extract latest values for each field
    let waterLevel = 0;
    let timestamp = '';
    let compressorOn = 0;
    let producingWater = false;
    let fullTank = false;
    let latestTime = '';

    for (let i = 1; i < lines.length; i++) {
      const dataRow = lines[i].split(',').map(d => d.trim());
      if (dataRow.length < Math.max(timeIndex, valueIndex, fieldIndex) + 1) continue;
      
      const rowTime = dataRow[timeIndex];
      const fieldName = dataRow[fieldIndex];
      const value = dataRow[valueIndex];
      
      if (!latestTime || rowTime > latestTime) {
        latestTime = rowTime;
        timestamp = rowTime;
      }
      
      switch (fieldName) {
        case 'water_level_L':
          waterLevel = parseFloat(value) || 0;
          break;
        case 'compressor_on':
          compressorOn = parseInt(value) || 0;
          break;
        case 'producing_water':
          producingWater = value === '1' || value.toLowerCase() === 'true';
          break;
        case 'full_tank':
          fullTank = value === '1' || value.toLowerCase() === 'true';
          break;
      }
    }

    if (!timestamp) {
      console.error(`❌ No valid timestamp found for ${machineId}`);
      await logDataIngestion(machineId, 'ERROR', 'No valid timestamp found');
      return null;
    }

    const dataAge = Date.now() - new Date(timestamp).getTime();
    const freshnessMinutes = Math.round(dataAge / 1000 / 60);
    
    console.log(`✅ Latest data point for ${machineId}:`, { timestamp, waterLevel, compressorOn, producingWater, fullTank, freshnessMinutes });
    
    if (freshnessMinutes > 60) {
      console.log(`⚠️ Data is older than 1 hour for ${machineId}`);
      await logDataIngestion(machineId, 'WARNING', 'Data is older than 1 hour', {
        dataTimestamp: timestamp,
        freshnessMinutes
      });
    } else {
      console.log(`✅ Data is relatively fresh for ${machineId}`);
      await logDataIngestion(machineId, 'SUCCESS', 'Fresh data retrieved', {
        dataTimestamp: timestamp,
        freshnessMinutes
      });
    }

    return { 
      waterLevel, 
      timestamp,
      compressorOn,
      producingWater,
      fullTank
    };

  } catch (error) {
    console.error(`❌ Error fetching from InfluxDB for ${machineId}:`, error);
    await logDataIngestion(machineId, 'ERROR', 'InfluxDB fetch error', {
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

async function upsertRawMachineData(machineId: string, timestamp: string, waterLevel: number, compressorOn: number, producingWater: boolean, fullTank: boolean) {
  try {
    console.log(`💾 Upserting raw machine data for ${machineId}...`);
    
    // Check for existing data at the same timestamp to avoid duplicates
    const { data: existingData, error: checkError } = await supabase
      .from('raw_machine_data')
      .select('id, timestamp_utc')
      .eq('machine_id', machineId)
      .eq('timestamp_utc', timestamp)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
      console.error(`❌ Error checking existing raw data for ${machineId}:`, checkError);
      await logDataIngestion(machineId, 'ERROR', 'Failed to check existing raw data', {
        errorDetails: checkError.message
      });
      return { success: false, action: 'error', reason: checkError.message };
    }

    if (existingData) {
      console.log(`ℹ️ Raw data already exists for ${machineId} at ${timestamp}, skipping upsert`);
      await logDataIngestion(machineId, 'INFO', 'Raw data already exists, skipped upsert');
      return { success: true, action: 'skipped', reason: 'duplicate timestamp' };
    }

    // Insert new raw machine data
    const { data: insertData, error: insertError } = await supabase
      .from('raw_machine_data')
      .insert([{
        machine_id: machineId,
        timestamp_utc: timestamp,
        water_level_l: waterLevel,
        compressor_on: compressorOn,
        producing_water: producingWater,
        full_tank: fullTank
      }])
      .select('id, timestamp_utc, water_level_l');

    if (insertError) {
      console.error(`❌ Raw data insert error for ${machineId}:`, insertError);
      await logDataIngestion(machineId, 'ERROR', 'Failed to insert raw data', {
        errorDetails: insertError.message
      });
      return { success: false, action: 'error', reason: insertError.message };
    }

    console.log(`✅ Successfully upserted raw data for ${machineId}:`, insertData[0]);
    await logDataIngestion(machineId, 'SUCCESS', 'Raw data upserted successfully', {
      dataTimestamp: timestamp
    });
    
    return { success: true, action: 'inserted', data: insertData[0] };

  } catch (error) {
    console.error(`❌ Critical upsert error for ${machineId}:`, error);
    await logDataIngestion(machineId, 'ERROR', 'Critical upsert error', {
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, action: 'error', reason: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function detectDrainageEvent(currentLevel: number, previousLevel: number): boolean {
  const decrease = previousLevel - currentLevel;
  const percentageDecrease = (decrease / previousLevel) * 100;
  
  return decrease > 3.0 || percentageDecrease > 50;
}

function isValidProduction(production: number, timeDiffMinutes: number): boolean {
  const maxProductionRate = 0.05;
  const maxExpectedProduction = maxProductionRate * timeDiffMinutes;
  
  return production > 0.05 && production <= maxExpectedProduction;
}

async function processMachine(machine: { machine_id: string; microcontroller_uid: string; name: string }) {
  const { machine_id: machineId, microcontroller_uid: machineUID, name: machineName } = machine;
  
  console.log(`🔄 Processing machine: ${machineName} (ID: ${machineId}, UID: ${machineUID})`);
  
  await logDataIngestion(machineId, 'INFO', `Track water production started for ${machineName}`);

  const latestData = await fetchLatestDataFromInflux(machineUID, machineId);
  
  if (!latestData) {
    console.log(`❌ No fresh machine data available from InfluxDB for ${machineId}`);
    await logDataIngestion(machineId, 'WARNING', 'No data available from InfluxDB');
    return {
      machineId,
      status: 'warning',
      message: 'No fresh machine data available from InfluxDB'
    };
  }

  const { waterLevel, timestamp, compressorOn, producingWater, fullTank } = latestData;
  
  if (!waterLevel || waterLevel < 0) {
    console.log(`⚠️ Invalid water level data for ${machineId}:`, waterLevel);
    await logDataIngestion(machineId, 'ERROR', 'Invalid water level data', {
      errorDetails: `Water level: ${waterLevel}`
    });
    return {
      machineId,
      status: 'warning',
      message: 'Invalid water level data'
    };
  }

  console.log(`📊 Processing data for machine ${machineId}: ${waterLevel}L at ${timestamp}`);

  // Store the snapshot with enhanced error handling
  const { error: snapshotError } = await supabase
    .from('simple_water_snapshots')
    .insert({
      machine_id: machineId,
      water_level_l: waterLevel,
      timestamp_utc: timestamp
    });

  if (snapshotError) {
    console.error(`❌ Error storing snapshot for ${machineId}:`, snapshotError);
    await logDataIngestion(machineId, 'ERROR', 'Failed to store snapshot', {
      errorDetails: snapshotError.message
    });
  } else {
    console.log(`✅ Snapshot stored successfully for ${machineId}`);
    await logDataIngestion(machineId, 'SUCCESS', 'Snapshot stored successfully', {
      dataTimestamp: timestamp
    });
  }

  // NEW: Upsert essential data to raw_machine_data for dashboard connectivity
  const rawDataResult = await upsertRawMachineData(machineId, timestamp, waterLevel, compressorOn, producingWater, fullTank);
  console.log(`📊 Raw data upsert result for ${machineId}:`, rawDataResult);

  const { data: previousSnapshots, error: previousError } = await supabase
    .from('simple_water_snapshots')
    .select('*')
    .eq('machine_id', machineId)
    .order('timestamp_utc', { ascending: false })
    .limit(2);

  if (previousError) {
    console.error(`❌ Error fetching previous snapshots for ${machineId}:`, previousError);
    await logDataIngestion(machineId, 'ERROR', 'Failed to fetch previous snapshots', {
      errorDetails: previousError.message
    });
    return {
      machineId,
      status: 'error',
      message: 'Failed to fetch previous snapshots',
      rawDataUpsert: rawDataResult
    };
  }

  if (!previousSnapshots || previousSnapshots.length < 2) {
    console.log(`📝 Not enough snapshots for comparison yet for ${machineId}`);
    await logDataIngestion(machineId, 'INFO', 'Initial snapshot stored, waiting for next comparison');
    return {
      machineId,
      status: 'ok',
      message: 'Initial snapshot stored, waiting for next comparison',
      rawDataUpsert: rawDataResult
    };
  }

  const currentSnapshot = previousSnapshots[0];
  const previousSnapshot = previousSnapshots[1];
  const waterLevelDiff = currentSnapshot.water_level_l - previousSnapshot.water_level_l;
  const timeDiff = new Date(currentSnapshot.timestamp_utc).getTime() - new Date(previousSnapshot.timestamp_utc).getTime();
  const timeDiffMinutes = timeDiff / (1000 * 60);

  console.log(`🔍 Comparison for ${machineId}:`, {
    current: currentSnapshot.water_level_l,
    previous: previousSnapshot.water_level_l,
    difference: waterLevelDiff,
    timeDiffMinutes: Math.round(timeDiffMinutes)
  });

  await logDataIngestion(machineId, 'INFO', 'Snapshot comparison completed', {
    dataTimestamp: currentSnapshot.timestamp_utc
  });

  if (detectDrainageEvent(currentSnapshot.water_level_l, previousSnapshot.water_level_l)) {
    console.log(`🚰 Drainage event detected for ${machineId}: ${Math.abs(waterLevelDiff).toFixed(2)}L removed`);
    
    await logDataIngestion(machineId, 'EVENT', 'Drainage event detected', {
      dataTimestamp: currentSnapshot.timestamp_utc
    });
    
    const { error: drainageError } = await supabase
      .from('water_production_events')
      .insert({
        machine_id: machineId,
        production_liters: waterLevelDiff,
        previous_level: previousSnapshot.water_level_l,
        current_level: currentSnapshot.water_level_l,
        timestamp_utc: currentSnapshot.timestamp_utc,
        event_type: 'drainage'
      });

    if (drainageError) {
      console.error(`❌ Error storing drainage event for ${machineId}:`, drainageError);
      await logDataIngestion(machineId, 'ERROR', 'Failed to store drainage event', {
        errorDetails: drainageError.message
      });
    } else {
      console.log(`✅ Drainage event stored successfully for ${machineId}`);
      await logDataIngestion(machineId, 'SUCCESS', 'Drainage event stored successfully');
    }
    
    return {
      machineId,
      status: 'ok',
      message: `Drainage event detected: ${Math.abs(waterLevelDiff).toFixed(2)}L removed`,
      event_type: 'drainage',
      water_removed: Math.abs(waterLevelDiff),
      rawDataUpsert: rawDataResult
    };
  }

  if (waterLevelDiff > 0.05 && isValidProduction(waterLevelDiff, timeDiffMinutes)) {
    console.log(`💧 Water production detected for ${machineId}: ${waterLevelDiff.toFixed(2)}L over ${Math.round(timeDiffMinutes)} minutes`);
    
    await logDataIngestion(machineId, 'EVENT', 'Production event detected', {
      dataTimestamp: currentSnapshot.timestamp_utc
    });
    
    const { error: productionError } = await supabase
      .from('water_production_events')
      .insert({
        machine_id: machineId,
        production_liters: waterLevelDiff,
        previous_level: previousSnapshot.water_level_l,
        current_level: currentSnapshot.water_level_l,
        timestamp_utc: currentSnapshot.timestamp_utc,
        event_type: 'production'
      });

    if (productionError) {
      console.error(`❌ Error storing production event for ${machineId}:`, productionError);
      await logDataIngestion(machineId, 'ERROR', 'Failed to store production event', {
        errorDetails: productionError.message
      });
      return {
        machineId,
        status: 'error',
        message: 'Failed to store production event',
        rawDataUpsert: rawDataResult
      };
    }

    console.log(`✅ Production event stored successfully for ${machineId}`);
    await logDataIngestion(machineId, 'SUCCESS', 'Production event stored successfully');
    
    return {
      machineId,
      status: 'ok',
      message: `Production tracked: ${waterLevelDiff.toFixed(2)}L`,
      production: waterLevelDiff,
      event_type: 'production',
      production_rate_lh: (waterLevelDiff / timeDiffMinutes) * 60,
      rawDataUpsert: rawDataResult
    };
  } else if (waterLevelDiff > 0.05) {
    console.log(`⚠️ Water increase detected for ${machineId} (${waterLevelDiff.toFixed(2)}L) but production rate seems unrealistic`);
    await logDataIngestion(machineId, 'WARNING', 'Unrealistic production rate detected');
    return {
      machineId,
      status: 'warning',
      message: `Unrealistic production rate detected: ${waterLevelDiff.toFixed(2)}L in ${Math.round(timeDiffMinutes)} minutes`,
      rawDataUpsert: rawDataResult
    };
  } else {
    console.log(`📊 No significant production detected for ${machineId}`);
    await logDataIngestion(machineId, 'INFO', 'No production detected in this period');
    return {
      machineId,
      status: 'ok',
      message: 'No production detected in this period',
      water_level_change: waterLevelDiff,
      event_type: 'no_change',
      rawDataUpsert: rawDataResult
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced water production tracking started at:', new Date().toISOString());
    console.log('🔄 Processing ALL machines with raw_machine_data upserts...');

    // Get all active machines from database using the new schema
    const machines = await getActiveMachines();
    
    if (machines.length === 0) {
      console.log('⚠️ No active machines found to process');
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'No active machines found to process',
        processed_machines: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process all machines with concurrency limit (max 3 concurrent)
    const results = [];
    const CONCURRENCY_LIMIT = 3;
    
    for (let i = 0; i < machines.length; i += CONCURRENCY_LIMIT) {
      const batch = machines.slice(i, i + CONCURRENCY_LIMIT);
      const batchPromises = batch.map(async (machine) => {
        try {
          const result = await processMachine(machine);
          return result;
        } catch (error) {
          console.error(`❌ Error processing machine ${machine.machine_id}:`, error);
          return {
            machineId: machine.machine_id,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    console.log(`✅ Processed ${machines.length} machines successfully`);
    
    // Count successful raw data upserts
    const rawDataUpserts = results.filter(r => r.rawDataUpsert?.success).length;
    const rawDataSkipped = results.filter(r => r.rawDataUpsert?.action === 'skipped').length;
    
    return new Response(JSON.stringify({ 
      status: 'ok', 
      message: `Processed ${machines.length} machines`,
      processed_machines: machines.length,
      raw_data_upserts: rawDataUpserts,
      raw_data_skipped: rawDataSkipped,
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Unexpected error in enhanced track-water-production:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
