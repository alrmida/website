
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple function to get machine data from InfluxDB using proven query pattern
serve(async (req) => {
  console.log('🚀 Simple machine data function invoked');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get machine UID from request
    const { uid } = await req.json();
    
    if (!uid) {
      return new Response(
        JSON.stringify({ error: 'Machine UID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Fetching data for UID:', uid);

    // Create InfluxDB client
    const INFLUXDB_URL = Deno.env.get('INFLUXDB_URL')!;
    const INFLUXDB_TOKEN = Deno.env.get('INFLUXDB_TOKEN')!;
    const INFLUXDB_ORG = Deno.env.get('INFLUXDB_ORG')!;
    
    const { InfluxDB } = await import('https://esm.sh/@influxdata/influxdb-client@1.33.2');
    const client = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN });
    const queryApi = client.getQueryApi(INFLUXDB_ORG);

    // Simple query for water level (most important metric)
    const waterLevelQuery = `
      from(bucket: "KumulusData")
        |> range(start: -24h)
        |> filter(fn: (r) => r["_measurement"] == "awg_data_full")
        |> filter(fn: (r) => r["uid"] == "${uid}")
        |> filter(fn: (r) => r["_field"] == "water_level_L")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    // Query for compressor status
    const compressorQuery = `
      from(bucket: "KumulusData")
        |> range(start: -24h)
        |> filter(fn: (r) => r["_measurement"] == "awg_data_full")
        |> filter(fn: (r) => r["uid"] == "${uid}")
        |> filter(fn: (r) => r["_field"] == "compressor_on")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    // Execute queries
    const [waterLevelResult, compressorResult] = await Promise.all([
      queryApi.collectRows(waterLevelQuery),
      queryApi.collectRows(compressorQuery)
    ]);

    // Extract values
    const waterLevel = waterLevelResult.length > 0 ? waterLevelResult[0]._value : 0;
    const compressorOn = compressorResult.length > 0 ? compressorResult[0]._value : 0;
    const lastUpdate = waterLevelResult.length > 0 ? waterLevelResult[0]._time : null;

    // Determine machine status
    const isOnline = lastUpdate && (new Date().getTime() - new Date(lastUpdate).getTime()) < 300000; // 5 minutes
    const status = isOnline ? (compressorOn ? 'Producing' : 'Idle') : 'Offline';

    const response = {
      uid,
      waterLevel: Number(waterLevel) || 0,
      compressorOn: Boolean(compressorOn),
      status,
      isOnline: Boolean(isOnline),
      lastUpdate,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Data fetched successfully:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error fetching machine data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch machine data', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
