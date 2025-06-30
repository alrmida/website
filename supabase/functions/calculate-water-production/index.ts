
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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current machine data from InfluxDB
    const currentData = await fetchCurrentMachineData();
    console.log('📊 Current machine data:', currentData);

    if (!currentData) {
      console.log('❌ No current machine data available');
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'No machine data available' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

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
    }

    // Get the previous snapshot for production calculation
    const { data: previousSnapshots } = await supabase
      .from('water_level_snapshots')
      .select('*')
      .eq('machine_id', MACHINE_ID)
      .order('timestamp_utc', { ascending: false })
      .limit(2);

    if (!previousSnapshots || previousSnapshots.length < 2) {
      console.log('ℹ️ Not enough data for production calculation yet');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Snapshot stored, waiting for more data' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const [current, previous] = previousSnapshots;
    console.log('🔍 Comparing snapshots:', { current: current.timestamp_utc, previous: previous.timestamp_utc });

    // Calculate production period
    const productionPeriod = calculateProductionPeriod(previous, current);
    console.log('⚡ Production period calculated:', productionPeriod);

    // Store production period
    const { error: periodError } = await supabase
      .from('water_production_periods')
      .insert([productionPeriod]);

    if (periodError) {
      console.error('❌ Error storing production period:', periodError);
    } else {
      console.log('✅ Production period stored successfully');
    }

    return new Response(JSON.stringify({ 
      status: 'ok', 
      snapshot: currentSnapshot,
      production: productionPeriod
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('❌ Error in water production calculation:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error.message 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function fetchCurrentMachineData(): Promise<MachineData | null> {
  try {
    const influxToken = Deno.env.get('INFLUXDB_TOKEN');
    const influxUrl = Deno.env.get('INFLUXDB_URL');
    const influxOrg = Deno.env.get('INFLUXDB_ORG');

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

    const response = await fetch(`${influxUrl}/api/v2/query?org=${influxOrg}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${influxToken}`,
        'Accept': 'application/csv',
        'Content-Type': 'application/vnd.flux'
      },
      body: query
    });

    if (!response.ok) {
      console.error('❌ InfluxDB query failed:', response.status);
      return null;
    }

    const csvData = await response.text();
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      console.log('ℹ️ No data found in InfluxDB response');
      return null;
    }

    const headers = lines[0].split(',');
    const values = lines[1].split(',');
    
    const data: any = {};
    headers.forEach((header, index) => {
      const value = values[index];
      if (header === '_time') {
        data[header] = value;
      } else if (header === 'water_level_L' || header === 'compressor_on' || header === 'full_tank' || header === 'producing_water') {
        data[header] = parseFloat(value) || 0;
      }
    });

    return data as MachineData;
  } catch (error) {
    console.error('❌ Error fetching machine data:', error);
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

  // Only calculate production if tank wasn't full during either period
  if (!fullTankStart && !fullTankEnd) {
    // Normal production calculation
    const waterIncrease = waterLevelEnd - waterLevelStart;
    if (waterIncrease > 0) {
      productionLiters = waterIncrease;
      periodStatus = 'producing';
    } else {
      // Water level decreased or stayed same (consumption or measurement error)
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
