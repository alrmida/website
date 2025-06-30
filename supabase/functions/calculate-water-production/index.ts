
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

const MACHINE_ID = 'KU001619000079';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting water production calculation...');
    console.log('📊 Request method:', req.method);
    console.log('📊 Request URL:', req.url);
    
    // Parse request body to check if this is a manual trigger
    let isManualTrigger = false;
    try {
      const body = await req.json();
      isManualTrigger = body.manual === true;
      console.log('📊 Manual trigger:', isManualTrigger);
    } catch (e) {
      // Ignore JSON parsing errors for scheduled calls
      console.log('📊 Scheduled trigger (no JSON body)');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasInfluxUrl: !!Deno.env.get('INFLUXDB_URL'),
      hasInfluxToken: !!Deno.env.get('INFLUXDB_TOKEN'),
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, let's test our database connection
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

    // Get current machine data from InfluxDB
    console.log('📡 Fetching current machine data from InfluxDB...');
    const currentData = await fetchCurrentMachineData();
    
    if (!currentData) {
      console.log('❌ No current machine data available - trying to use sample data for testing');
      
      // For testing purposes, create sample data if this is a manual trigger
      if (isManualTrigger) {
        console.log('🧪 Creating sample data for testing...');
        const sampleData = {
          _time: new Date().toISOString(),
          water_level_L: 5.5 + Math.random() * 2, // Random between 5.5-7.5L
          compressor_on: Math.random() > 0.5 ? 1 : 0,
          full_tank: 0,
          producing_water: 1
        };
        console.log('🧪 Sample data:', sampleData);
        await processDataPoint(supabase, sampleData);
        
        return new Response(JSON.stringify({ 
          status: 'ok', 
          message: 'Sample data processed successfully',
          data: sampleData
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'No machine data available from InfluxDB' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('📊 Current machine data received:', currentData);
    
    // Process the current data point
    const result = await processDataPoint(supabase, currentData);
    
    return new Response(JSON.stringify({ 
      status: 'ok', 
      message: 'Water production calculation completed',
      data: result
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Error in water production calculation:', error);
    console.error('❌ Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error.message,
      stack: error.stack
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function processDataPoint(supabase: any, currentData: MachineData) {
  console.log('🔄 Processing data point...');
  
  // Store current snapshot
  const currentSnapshot = {
    machine_id: MACHINE_ID,
    timestamp_utc: currentData._time,
    water_level_l: currentData.water_level_L,
    full_tank: currentData.full_tank === 1,
    machine_status: calculateMachineStatus(currentData)
  };

  console.log('💾 Storing current snapshot:', currentSnapshot);

  const { error: snapshotError } = await supabase
    .from('water_level_snapshots')
    .insert([currentSnapshot]);

  if (snapshotError) {
    console.error('❌ Error storing snapshot:', snapshotError);
    throw new Error(`Failed to store snapshot: ${snapshotError.message}`);
  }

  console.log('✅ Snapshot stored successfully');

  // Get the previous snapshot for production calculation
  console.log('🔍 Looking for previous snapshots...');
  const { data: previousSnapshots, error: fetchError } = await supabase
    .from('water_level_snapshots')
    .select('*')
    .eq('machine_id', MACHINE_ID)
    .order('timestamp_utc', { ascending: false })
    .limit(2);

  if (fetchError) {
    console.error('❌ Error fetching previous snapshots:', fetchError);
    throw new Error(`Failed to fetch previous snapshots: ${fetchError.message}`);
  }

  console.log('📊 Previous snapshots found:', previousSnapshots?.length || 0);

  if (!previousSnapshots || previousSnapshots.length < 2) {
    console.log('ℹ️ Not enough data for production calculation yet');
    return {
      snapshot: currentSnapshot,
      message: 'Snapshot stored, waiting for more data to calculate production'
    };
  }

  const [current, previous] = previousSnapshots;
  console.log('🔍 Comparing snapshots:', { 
    current: { time: current.timestamp_utc, level: current.water_level_l },
    previous: { time: previous.timestamp_utc, level: previous.water_level_l }
  });

  // Calculate production period
  const productionPeriod = calculateProductionPeriod(previous, current);
  console.log('⚡ Production period calculated:', productionPeriod);

  // Store production period
  const { error: periodError } = await supabase
    .from('water_production_periods')
    .insert([productionPeriod]);

  if (periodError) {
    console.error('❌ Error storing production period:', periodError);
    throw new Error(`Failed to store production period: ${periodError.message}`);
  }

  console.log('✅ Production period stored successfully');

  return {
    snapshot: currentSnapshot,
    production: productionPeriod
  };
}

async function fetchCurrentMachineData(): Promise<MachineData | null> {
  try {
    const influxToken = Deno.env.get('INFLUXDB_TOKEN');
    const influxUrl = Deno.env.get('INFLUXDB_URL');
    const influxOrg = Deno.env.get('INFLUXDB_ORG');

    console.log('🔧 InfluxDB config check:', {
      hasToken: !!influxToken,
      hasUrl: !!influxUrl,
      hasOrg: !!influxOrg,
      url: influxUrl
    });

    if (!influxToken || !influxUrl || !influxOrg) {
      console.error('❌ Missing InfluxDB configuration');
      return null;
    }

    const query = `
      from(bucket: "KumulusData")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    console.log('📡 Executing InfluxDB query...');
    console.log('🔍 Query URL:', `${influxUrl}/api/v2/query?org=${influxOrg}`);

    const response = await fetch(`${influxUrl}/api/v2/query?org=${influxOrg}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${influxToken}`,
        'Accept': 'application/csv',
        'Content-Type': 'application/vnd.flux'
      },
      body: query
    });

    console.log('📡 InfluxDB response status:', response.status);
    console.log('📡 InfluxDB response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ InfluxDB query failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ InfluxDB error details:', errorText);
      return null;
    }

    const csvData = await response.text();
    console.log('📊 InfluxDB raw response (first 500 chars):', csvData.substring(0, 500));
    
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      console.log('ℹ️ No data found in InfluxDB response');
      return null;
    }

    const headers = lines[0].split(',');
    const values = lines[1].split(',');
    
    console.log('📊 CSV headers:', headers);
    console.log('📊 CSV values:', values);
    
    const data: any = {};
    headers.forEach((header, index) => {
      const value = values[index];
      if (header === '_time') {
        data[header] = value;
      } else if (header === 'water_level_L' || header === 'compressor_on' || header === 'full_tank' || header === 'producing_water') {
        data[header] = parseFloat(value) || 0;
      }
    });

    console.log('📊 Parsed InfluxDB data:', data);

    return data as MachineData;
  } catch (error) {
    console.error('❌ Error fetching machine data:', error);
    console.error('❌ Error stack:', error.stack);
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

function calculateProductionPeriod(previous: any, current: any) {
  const periodStart = previous.timestamp_utc;
  const periodEnd = current.timestamp_utc;
  const waterLevelStart = previous.water_level_l || 0;
  const waterLevelEnd = current.water_level_l || 0;
  const fullTankStart = previous.full_tank || false;
  const fullTankEnd = current.full_tank || false;

  let productionLiters = 0;
  let periodStatus = 'no_data';

  console.log('🧮 Calculating production:', {
    waterLevelStart,
    waterLevelEnd,
    fullTankStart,
    fullTankEnd,
    timeDiff: new Date(periodEnd).getTime() - new Date(periodStart).getTime()
  });

  // Enhanced production calculation logic
  if (!fullTankStart && !fullTankEnd) {
    // Normal production calculation
    const waterIncrease = waterLevelEnd - waterLevelStart;
    if (waterIncrease > 0) {
      productionLiters = waterIncrease;
      periodStatus = 'producing';
    } else if (waterIncrease < -0.5) {
      // Significant water decrease - likely consumption
      productionLiters = 0;
      periodStatus = 'consumption';
    } else {
      // Small decrease or no change - idle
      productionLiters = 0;
      periodStatus = 'idle';
    }
  } else if (fullTankStart && fullTankEnd) {
    // Tank was full throughout the period
    periodStatus = 'tank_full';
    productionLiters = 0;
  } else {
    // Tank became full or empty during the period
    periodStatus = 'transitioning';
    if (!fullTankStart && fullTankEnd) {
      // Tank became full - calculate partial production
      const maxCapacity = 10.0; // Assuming 10L tank capacity
      productionLiters = Math.max(0, maxCapacity - waterLevelStart);
    } else {
      // Tank became empty (water was dispensed)
      productionLiters = 0;
    }
  }

  console.log('🧮 Production result:', {
    productionLiters,
    periodStatus
  });

  return {
    machine_id: MACHINE_ID,
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
