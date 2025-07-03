
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      raw_machine_data: {
        Row: {
          id: string;
          machine_id: string;
          timestamp_utc: string;
          water_level_l: number;
          compressor_on: number;
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
const MACHINE_ID = 'KU001619000079';

async function fetchLatestDataFromInflux(): Promise<{ waterLevel: number; timestamp: string } | null> {
  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG) {
    console.log('❌ InfluxDB configuration missing');
    return null;
  }

  try {
    const query = `
      from(bucket: "${INFLUX_BUCKET}")
        |> range(start: -2h)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> filter(fn: (r) => r._field == "water_level_L")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    const baseUrl = INFLUX_URL.replace(/\/+$/, '');
    const queryUrl = `${baseUrl}/api/v2/query?org=${encodeURIComponent(INFLUX_ORG)}`;
    
    console.log('🔍 Fetching latest data from InfluxDB for independent tracking...');
    
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
      console.error('❌ InfluxDB query failed:', response.status, errorText);
      return null;
    }

    const responseText = await response.text();
    const lines = responseText.trim().split('\n');
    
    if (lines.length < 2) {
      console.log('⚠️ No data found in InfluxDB response');
      return null;
    }

    // Parse CSV response
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRow = lines[1].split(',').map(d => d.trim());
    
    const timeIndex = headers.indexOf('_time');
    const valueIndex = headers.indexOf('_value');
    
    if (timeIndex === -1 || valueIndex === -1) {
      console.error('❌ Invalid CSV format from InfluxDB');
      return null;
    }

    const timestamp = dataRow[timeIndex];
    const waterLevel = parseFloat(dataRow[valueIndex]);
    
    if (isNaN(waterLevel)) {
      console.error('❌ Invalid water level value from InfluxDB:', dataRow[valueIndex]);
      return null;
    }

    console.log('✅ Successfully fetched from InfluxDB:', { waterLevel, timestamp });
    return { waterLevel, timestamp };

  } catch (error) {
    console.error('❌ Error fetching from InfluxDB:', error);
    return null;
  }
}

function detectDrainageEvent(currentLevel: number, previousLevel: number): boolean {
  // Detect if water level dropped by more than 50% or more than 3L
  const decrease = previousLevel - currentLevel;
  const percentageDecrease = (decrease / previousLevel) * 100;
  
  console.log('🔍 Drainage detection:', {
    currentLevel,
    previousLevel,
    decrease,
    percentageDecrease: Math.round(percentageDecrease)
  });

  return decrease > 3.0 || percentageDecrease > 50;
}

function isValidProduction(production: number, timeDiffMinutes: number): boolean {
  // Validate production is reasonable
  // Max reasonable production rate: ~2L/hour = 0.033L/minute
  const maxProductionRate = 0.05; // L/minute (slightly higher for safety)
  const maxExpectedProduction = maxProductionRate * timeDiffMinutes;
  
  const isValid = production > 0.05 && production <= maxExpectedProduction;
  
  console.log('🔍 Production validation:', {
    production,
    timeDiffMinutes,
    maxExpectedProduction,
    isValid
  });

  return isValid;
}

function isDataFresh(timestamp: string): boolean {
  const dataAge = Date.now() - new Date(timestamp).getTime();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  
  const isFresh = dataAge <= maxAge;
  console.log('🕒 Data freshness check:', {
    timestamp,
    ageMinutes: Math.round(dataAge / 1000 / 60),
    isFresh
  });
  
  return isFresh;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting truly independent water production tracking...');

    // Get fresh data directly from InfluxDB (independent of dashboard activity)
    const latestData = await fetchLatestDataFromInflux();
    
    if (!latestData) {
      console.log('❌ No fresh machine data available from InfluxDB');
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'No fresh machine data available from InfluxDB' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { waterLevel, timestamp } = latestData;
    
    // Validate data freshness
    if (!isDataFresh(timestamp)) {
      console.log('⚠️ Data is too old, skipping production calculation');
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'Data is too old for reliable production calculation' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!waterLevel || waterLevel < 0) {
      console.log('⚠️ Invalid water level data:', waterLevel);
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'Invalid water level data' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Processing fresh data for machine ${MACHINE_ID}: ${waterLevel}L at ${timestamp}`);

    // Store the current snapshot
    const { error: snapshotError } = await supabase
      .from('simple_water_snapshots')
      .insert({
        machine_id: MACHINE_ID,
        water_level_l: waterLevel,
        timestamp_utc: timestamp
      });

    if (snapshotError) {
      console.error('❌ Error storing snapshot:', snapshotError);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Failed to store snapshot' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Snapshot stored successfully');

    // Get the previous snapshot to compare
    const { data: previousSnapshots, error: previousError } = await supabase
      .from('simple_water_snapshots')
      .select('*')
      .eq('machine_id', MACHINE_ID)
      .order('timestamp_utc', { ascending: false })
      .limit(2);

    if (previousError) {
      console.error('❌ Error fetching previous snapshots:', previousError);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Failed to fetch previous snapshots' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!previousSnapshots || previousSnapshots.length < 2) {
      console.log('📝 Not enough snapshots for comparison yet');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Initial snapshot stored, waiting for next comparison' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compare current with previous snapshot
    const currentSnapshot = previousSnapshots[0];
    const previousSnapshot = previousSnapshots[1];
    const waterLevelDiff = currentSnapshot.water_level_l - previousSnapshot.water_level_l;
    const timeDiff = new Date(currentSnapshot.timestamp_utc).getTime() - new Date(previousSnapshot.timestamp_utc).getTime();
    const timeDiffMinutes = timeDiff / (1000 * 60);

    console.log(`🔍 Comparing snapshots:`, {
      current: currentSnapshot.water_level_l,
      previous: previousSnapshot.water_level_l,
      difference: waterLevelDiff,
      timeDiffMinutes: Math.round(timeDiffMinutes)
    });

    // Check for drainage event (handles the overnight draining scenario)
    if (detectDrainageEvent(currentSnapshot.water_level_l, previousSnapshot.water_level_l)) {
      console.log(`🚰 Drainage event detected: ${Math.abs(waterLevelDiff).toFixed(2)}L removed`);
      
      // Store the drainage event
      const { error: drainageError } = await supabase
        .from('water_production_events')
        .insert({
          machine_id: MACHINE_ID,
          production_liters: waterLevelDiff, // Negative value for drainage
          previous_level: previousSnapshot.water_level_l,
          current_level: currentSnapshot.water_level_l,
          timestamp_utc: currentSnapshot.timestamp_utc,
          event_type: 'drainage'
        });

      if (drainageError) {
        console.error('❌ Error storing drainage event:', drainageError);
      } else {
        console.log('✅ Drainage event stored successfully');
      }
      
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: `Drainage event detected: ${Math.abs(waterLevelDiff).toFixed(2)}L removed`,
        event_type: 'drainage',
        water_removed: Math.abs(waterLevelDiff)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for valid production (positive increase > 0.05L and reasonable rate)
    if (waterLevelDiff > 0.05 && isValidProduction(waterLevelDiff, timeDiffMinutes)) {
      console.log(`💧 Water production detected: ${waterLevelDiff.toFixed(2)}L over ${Math.round(timeDiffMinutes)} minutes`);
      
      // Store the production event
      const { error: productionError } = await supabase
        .from('water_production_events')
        .insert({
          machine_id: MACHINE_ID,
          production_liters: waterLevelDiff,
          previous_level: previousSnapshot.water_level_l,
          current_level: currentSnapshot.water_level_l,
          timestamp_utc: currentSnapshot.timestamp_utc,
          event_type: 'production'
        });

      if (productionError) {
        console.error('❌ Error storing production event:', productionError);
        return new Response(JSON.stringify({ 
          status: 'error', 
          message: 'Failed to store production event' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Production event stored successfully');
      
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: `Production tracked: ${waterLevelDiff.toFixed(2)}L`,
        production: waterLevelDiff,
        event_type: 'production',
        production_rate_lh: (waterLevelDiff / timeDiffMinutes) * 60
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (waterLevelDiff > 0.05) {
      console.log(`⚠️ Water increase detected (${waterLevelDiff.toFixed(2)}L) but production rate seems unrealistic`);
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: `Unrealistic production rate detected: ${waterLevelDiff.toFixed(2)}L in ${Math.round(timeDiffMinutes)} minutes` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('📊 No significant production detected');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'No production detected in this period',
        water_level_change: waterLevelDiff,
        event_type: 'no_change'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error in independent track-water-production:', error);
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
