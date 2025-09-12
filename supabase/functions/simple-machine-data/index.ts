
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced function to get machine data from InfluxDB with complete status logic
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

    console.log('📊 Fetching complete machine data for UID:', uid);

    // Create InfluxDB client
    const INFLUXDB_URL = Deno.env.get('INFLUXDB_URL')!;
    const INFLUXDB_TOKEN = Deno.env.get('INFLUXDB_TOKEN')!;
    const INFLUXDB_ORG = Deno.env.get('INFLUXDB_ORG')!;
    
    const { InfluxDB } = await import('https://esm.sh/@influxdata/influxdb-client@1.33.2');
    const client = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN });
    const queryApi = client.getQueryApi(INFLUXDB_ORG);

    // Enhanced query to get all required status flags
    const statusQuery = `
      from(bucket: "KumulusData")
        |> range(start: -24h)
        |> filter(fn: (r) => r["_measurement"] == "awg_data_full")
        |> filter(fn: (r) => r["uid"] == "${uid}")
        |> filter(fn: (r) => r["_field"] == "water_level_L" or 
                             r["_field"] == "compressor_on" or 
                             r["_field"] == "full_tank" or 
                             r["_field"] == "producing_water")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 4)
    `;

    console.log('🔍 Executing enhanced InfluxDB query for all status flags...');

    // Execute query to get all status data
    const queryResults = await queryApi.collectRows(statusQuery);

    console.log('📊 Query results received:', queryResults.length, 'records');

    if (queryResults.length === 0) {
      console.log('⚠️ No data found for UID:', uid);
      return new Response(
        JSON.stringify({
          uid,
          waterLevel: 0,
          compressorOn: false,
          fullTank: false,
          producingWater: false,
          status: 'Offline',
          isOnline: false,
          lastUpdate: null,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process results to extract latest values for each field
    const fieldData: { [key: string]: { value: any, time: string } } = {};
    
    queryResults.forEach(record => {
      const field = record._field;
      const value = record._value;
      const time = record._time;
      
      if (!fieldData[field] || new Date(time) > new Date(fieldData[field].time)) {
        fieldData[field] = { value, time };
      }
    });

    console.log('🔍 Processed field data:', Object.keys(fieldData));

    // Extract values with defaults
    const waterLevel = fieldData['water_level_L']?.value || 0;
    const compressorOn = Boolean(fieldData['compressor_on']?.value);
    const fullTank = Boolean(fieldData['full_tank']?.value);
    const producingWater = Boolean(fieldData['producing_water']?.value);
    const lastUpdate = fieldData['water_level_L']?.time || fieldData['compressor_on']?.time || null;

    console.log('📊 Extracted sensor values:', {
      waterLevel,
      compressorOn,
      fullTank,
      producingWater,
      lastUpdate
    });

    // Determine machine status using enhanced logic with all sensor flags
    let status = 'Offline';
    let isOnline = false;

    if (lastUpdate) {
      const dataAge = new Date().getTime() - new Date(lastUpdate).getTime();
      isOnline = dataAge < 90000; // 90 seconds threshold
      
      if (isOnline) {
        // Enhanced status logic based on all sensor flags
        if (fullTank && !compressorOn && !producingWater) {
          status = 'Full Water';
        } else if (compressorOn && producingWater) {
          status = 'Producing';
        } else if (!compressorOn && !fullTank && !producingWater) {
          status = 'Idle';
        } else {
          // Handle edge cases - compressor on but not producing, etc.
          status = compressorOn ? 'Producing' : 'Idle';
        }
      } else {
        status = 'Offline';
        isOnline = false;
      }
    }

    console.log('🎯 Status determination logic:', {
      fullTank,
      compressorOn,
      producingWater,
      dataAge: lastUpdate ? new Date().getTime() - new Date(lastUpdate).getTime() : 'N/A',
      finalStatus: status,
      isOnline
    });

    const response = {
      uid,
      waterLevel: Number(waterLevel) || 0,
      compressorOn,
      fullTank,
      producingWater,
      status,
      isOnline,
      lastUpdate,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Enhanced data fetched successfully:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error fetching enhanced machine data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch machine data', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
