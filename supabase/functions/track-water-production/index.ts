
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
        };
        Insert: {
          machine_id: string;
          production_liters: number;
          previous_level: number;
          current_level: number;
          timestamp_utc?: string;
        };
      };
    };
  };
}

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting server-side water production tracking...');

    // Get the latest water level data from raw_machine_data
    const { data: latestData, error: latestError } = await supabase
      .from('raw_machine_data')
      .select('machine_id, water_level_l, timestamp_utc')
      .order('timestamp_utc', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latestData) {
      console.log('❌ No recent machine data found:', latestError);
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'No recent machine data found' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { machine_id, water_level_l, timestamp_utc } = latestData;
    
    if (!water_level_l || water_level_l <= 0) {
      console.log('⚠️ Invalid water level data:', water_level_l);
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'Invalid water level data' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Processing data for machine ${machine_id}: ${water_level_l}L at ${timestamp_utc}`);

    // Store the current snapshot
    const { error: snapshotError } = await supabase
      .from('simple_water_snapshots')
      .insert({
        machine_id,
        water_level_l,
        timestamp_utc
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
      .eq('machine_id', machine_id)
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

    console.log(`🔍 Comparing snapshots:`, {
      current: currentSnapshot.water_level_l,
      previous: previousSnapshot.water_level_l,
      difference: waterLevelDiff
    });

    // Only consider it production if increase is > 0.1L (to avoid noise)
    if (waterLevelDiff > 0.1) {
      console.log(`💧 Water production detected: ${waterLevelDiff}L`);
      
      // Store the production event
      const { error: productionError } = await supabase
        .from('water_production_events')
        .insert({
          machine_id,
          production_liters: waterLevelDiff,
          previous_level: previousSnapshot.water_level_l,
          current_level: currentSnapshot.water_level_l,
          timestamp_utc: currentSnapshot.timestamp_utc
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
        production: waterLevelDiff
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('📊 No significant production detected');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'No production detected in this period' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error in track-water-production:', error);
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
