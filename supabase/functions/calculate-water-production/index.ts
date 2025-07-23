
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MachineData {
  _time: string;
  water_level_L: number;
  compressor_on: number;
  full_tank: number;
  producing_water: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting water production calculation for all machines...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test database connection
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('water_level_snapshots')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Database connection failed',
        error: testError
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
    console.log('✅ Database connection successful');

    // Get all active machines from database using the new schema
    console.log('🔍 Fetching all active machines from database...');
    const { data: machinesWithUIDs, error: machinesError } = await supabase
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

    if (machinesError) {
      console.error('❌ Error fetching machines:', machinesError);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Failed to fetch machines',
        error: machinesError
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    if (!machinesWithUIDs || machinesWithUIDs.length === 0) {
      console.log('⚠️ No machines with microcontroller UIDs found');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'No machines with microcontroller UIDs found - nothing to process',
        processed_machines: 0
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Transform the data to a simpler format
    const machines = machinesWithUIDs.map(machine => ({
      machine_id: machine.machine_id,
      name: machine.name,
      microcontroller_uid: machine.machine_microcontrollers[0]?.microcontroller_uid || null
    })).filter(machine => machine.microcontroller_uid);

    console.log(`✅ Found ${machines.length} active machines:`, machines.map(m => ({
      id: m.machine_id,
      uid: m.microcontroller_uid,
      name: m.name
    })));

    // Process each machine
    const results = [];
    for (const machine of machines) {
      try {
        console.log(`🔄 Processing machine: ${machine.name} (ID: ${machine.machine_id}, UID: ${machine.microcontroller_uid})`);
        
        // Get current machine data from InfluxDB
        console.log(`📡 Fetching current machine data from InfluxDB for ${machine.machine_id}...`);
        const currentData = await fetchCurrentMachineData(machine.microcontroller_uid!, machine.machine_id);
        
        if (!currentData) {
          console.log(`⚠️ No current machine data available from InfluxDB for ${machine.machine_id}`);
          results.push({
            machineId: machine.machine_id,
            status: 'ok',
            message: 'No machine data available from InfluxDB - will retry on next cycle'
          });
          continue;
        }

        console.log(`📊 Current machine data received for ${machine.machine_id}:`, {
          time: currentData._time,
          waterLevel: currentData.water_level_L,
          compressorOn: currentData.compressor_on
        });
        
        // Process the current data point for this machine
        const result = await processDataPoint(supabase, currentData, machine.machine_id);
        results.push({
          machineId: machine.machine_id,
          status: 'ok',
          message: 'Water production calculation completed successfully',
          data: result
        });
        
      } catch (error) {
        console.error(`❌ Error processing machine ${machine.machine_id}:`, error);
        results.push({
          machineId: machine.machine_id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`✅ Processed ${machines.length} machines successfully`);
    
    return new Response(JSON.stringify({ 
      status: 'ok', 
      message: `Water production calculation completed for ${machines.length} machines`,
      processed_machines: machines.length,
      results: results
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Error in water production calculation:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function processDataPoint(supabase: any, currentData: MachineData, machineId: string) {
  console.log(`🔄 Processing data point for machine ${machineId}...`);
  
  // Store current snapshot
  const currentSnapshot = {
    machine_id: machineId,
    timestamp_utc: currentData._time,
    water_level_l: currentData.water_level_L,
    full_tank: currentData.full_tank === 1,
    machine_status: calculateMachineStatus(currentData)
  };

  console.log(`💾 Storing snapshot for ${machineId}:`, {
    waterLevel: currentSnapshot.water_level_l,
    status: currentSnapshot.machine_status,
    time: currentSnapshot.timestamp_utc
  });

  const { error: snapshotError } = await supabase
    .from('water_level_snapshots')
    .insert([currentSnapshot]);

  if (snapshotError) {
    console.error(`❌ Error storing snapshot for ${machineId}:`, snapshotError);
    throw new Error(`Failed to store snapshot for ${machineId}: ${snapshotError.message}`);
  }

  console.log(`✅ Snapshot stored successfully for ${machineId}`);

  // Get the previous snapshot for production calculation
  const { data: previousSnapshots, error: fetchError } = await supabase
    .from('water_level_snapshots')
    .select('*')
    .eq('machine_id', machineId)
    .order('timestamp_utc', { ascending: false })
    .limit(2);

  if (fetchError) {
    console.error(`❌ Error fetching previous snapshots for ${machineId}:`, fetchError);
    throw new Error(`Failed to fetch previous snapshots for ${machineId}: ${fetchError.message}`);
  }

  console.log(`📊 Found snapshots for ${machineId}:`, previousSnapshots?.length || 0);

  if (!previousSnapshots || previousSnapshots.length < 2) {
    console.log(`ℹ️ Not enough data for production calculation yet for ${machineId} - need at least 2 snapshots`);
    return {
      snapshot: currentSnapshot,
      message: 'Snapshot stored, waiting for more data to calculate production'
    };
  }

  const [current, previous] = previousSnapshots;
  console.log(`🔍 Comparing snapshots for production calculation for ${machineId}:`, { 
    currentLevel: current.water_level_l,
    previousLevel: previous.water_level_l,
    timeDiff: new Date(current.timestamp_utc).getTime() - new Date(previous.timestamp_utc).getTime()
  });

  // Calculate production period
  const productionPeriod = calculateProductionPeriod(previous, current, machineId);
  console.log(`⚡ Production calculated for ${machineId}:`, {
    productionLiters: productionPeriod.production_liters,
    status: productionPeriod.period_status
  });

  // Store production period
  const { error: periodError } = await supabase
    .from('water_production_periods')
    .insert([productionPeriod]);

  if (periodError) {
    console.error(`❌ Error storing production period for ${machineId}:`, periodError);
    throw new Error(`Failed to store production period for ${machineId}: ${periodError.message}`);
  }

  console.log(`✅ Production period stored successfully for ${machineId}`);

  return {
    snapshot: currentSnapshot,
    production: productionPeriod
  };
}

async function fetchCurrentMachineData(machineUID: string, machineId: string): Promise<MachineData | null> {
  try {
    const influxToken = Deno.env.get('INFLUXDB_TOKEN');
    const influxUrl = Deno.env.get('INFLUXDB_URL');
    const influxOrg = Deno.env.get('INFLUXDB_ORG');

    console.log(`🔧 InfluxDB config check for ${machineId}:`, {
      hasToken: !!influxToken,
      hasUrl: !!influxUrl,
      hasOrg: !!influxOrg,
    });

    if (!influxToken || !influxUrl || !influxOrg) {
      console.error(`❌ Missing InfluxDB configuration for ${machineId}`);
      return null;
    }

    // Query using the microcontroller UID
    const query = `
      from(bucket: "KumulusData")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    console.log(`📡 Executing InfluxDB query for latest data for ${machineId} (UID: ${machineUID})...`);

    const response = await fetch(`${influxUrl}/api/v2/query?org=${influxOrg}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${influxToken}`,
        'Accept': 'application/csv',
        'Content-Type': 'application/vnd.flux'
      },
      body: query
    });

    console.log(`📡 InfluxDB response status for ${machineId}:`, response.status);

    if (!response.ok) {
      console.error(`❌ InfluxDB query failed for ${machineId}:`, response.status, response.statusText);
      return null;
    }

    const csvData = await response.text();
    console.log(`📊 InfluxDB response received for ${machineId} (first 200 chars):`, csvData.substring(0, 200));
    
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      console.log(`ℹ️ No data found in InfluxDB response for ${machineId}`);
      return null;
    }

    const headers = lines[0].split(',');
    const values = lines[1].split(',');
    
    const data: any = {};
    headers.forEach((header, index) => {
      const value = values[index];
      if (header === '_time') {
        data[header] = value;
      } else if (['water_level_L', 'compressor_on', 'full_tank', 'producing_water'].includes(header)) {
        data[header] = parseFloat(value) || 0;
      }
    });

    console.log(`📊 Parsed InfluxDB data for ${machineId}:`, data);
    return data as MachineData;
    
  } catch (error) {
    console.error(`❌ Error fetching machine data for ${machineId}:`, error);
    return null;
  }
}

function calculateMachineStatus(data: MachineData): string {
  if (data.full_tank === 1) {
    return 'Full Water';
  } else if (data.producing_water === 1 || data.compressor_on === 1) {
    return 'Producing';
  } else {
    return 'Idle';
  }
}

function calculateProductionPeriod(previous: any, current: any, machineId: string) {
  const periodStart = previous.timestamp_utc;
  const periodEnd = current.timestamp_utc;
  const waterLevelStart = previous.water_level_l || 0;
  const waterLevelEnd = current.water_level_l || 0;
  const fullTankStart = previous.full_tank || false;
  const fullTankEnd = current.full_tank || false;

  let productionLiters = 0;
  let periodStatus = 'idle';

  console.log(`🧮 Production calculation for ${machineId}:`, {
    waterLevelStart,
    waterLevelEnd,
    waterDifference: waterLevelEnd - waterLevelStart,
    fullTankStart,
    fullTankEnd,
    timeDiffMinutes: (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60)
  });

  // Enhanced production calculation logic
  if (!fullTankStart && !fullTankEnd) {
    // Normal operation - calculate based on water level change
    const waterIncrease = waterLevelEnd - waterLevelStart;
    if (waterIncrease > 0.1) { // Minimum threshold to avoid noise
      productionLiters = waterIncrease;
      periodStatus = 'producing';
      console.log(`✅ Production detected for ${machineId}:`, productionLiters, 'liters');
    } else if (waterIncrease < -0.2) {
      // Significant water decrease - likely consumption/dispensing
      productionLiters = 0;
      periodStatus = 'consumption';
      console.log(`📉 Water consumption detected for ${machineId}`);
    } else {
      // Small changes or no change - machine idle
      productionLiters = 0;
      periodStatus = 'idle';
      console.log(`😴 Machine idle for ${machineId}`);
    }
  } else if (fullTankStart && fullTankEnd) {
    // Tank was full throughout the period
    periodStatus = 'tank_full';
    productionLiters = 0;
    console.log(`🚰 Tank full throughout period for ${machineId}`);
  } else if (!fullTankStart && fullTankEnd) {
    // Tank became full during this period
    const maxCapacity = 10.0;
    productionLiters = Math.max(0, maxCapacity - waterLevelStart);
    periodStatus = 'producing';
    console.log(`🚰 Tank became full for ${machineId}, production:`, productionLiters);
  } else {
    // Tank was full, now not full (water was dispensed)
    productionLiters = 0;
    periodStatus = 'consumption';
    console.log(`📉 Tank was emptied for ${machineId}`);
  }

  return {
    machine_id: machineId,
    period_start: periodStart,
    period_end: periodEnd,
    water_level_start: waterLevelStart,
    water_level_end: waterLevelEnd,
    production_liters: productionLiters,
    period_status: periodStatus,
    full_tank_start: fullTankStart,
    full_tank_end: fullTankEnd
  };
}
