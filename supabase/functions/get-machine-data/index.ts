
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const influxUrl = Deno.env.get('INFLUXDB_URL');
    const influxToken = Deno.env.get('INFLUXDB_TOKEN');
    const influxOrg = Deno.env.get('INFLUXDB_ORG');
    const influxBucket = Deno.env.get('INFLUXDB_BUCKET') || 'KumulusData';
    
    // Supabase credentials for storing data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('Environment check:', {
      hasUrl: !!influxUrl,
      hasToken: !!influxToken,
      hasOrg: !!influxOrg,
      bucket: influxBucket,
      url: influxUrl,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey
    });

    if (!influxUrl || !influxToken || !influxOrg) {
      throw new Error('Missing InfluxDB configuration');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query to get recent data points (last 10 minutes) to collect and store
    const fluxQuery = `
from(bucket: "${influxBucket}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "awg_data_full")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"])`;

    console.log('Executing Flux query:', fluxQuery);

    const baseUrl = influxUrl.endsWith('/') ? influxUrl.slice(0, -1) : influxUrl;
    const queryUrl = `${baseUrl}/api/v2/query?org=${encodeURIComponent(influxOrg)}`;
    
    console.log('Query URL:', queryUrl);

    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${influxToken}`,
        'Content-Type': 'application/vnd.flux',
        'Accept': 'application/csv',
      },
      body: fluxQuery,
    });

    console.log('InfluxDB response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('InfluxDB query failed:', response.status, response.statusText, errorText);
      return new Response(JSON.stringify({ 
        error: `InfluxDB returned ${response.status} ${response.statusText}: ${errorText}` 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseText = await response.text();
    console.log('InfluxDB raw response:', responseText);

    // Parse CSV response
    const lines = responseText.trim().split('\n');
    if (lines.length < 2) {
      console.log('No data found in CSV response');
      return new Response(JSON.stringify({ error: 'No data returned from InfluxDB' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
    console.log('CSV headers:', headers);

    // Process each data row (skip header)
    const dataPointsToStore = [];
    let latestDataPoint = null;

    for (let i = 1; i < lines.length; i++) {
      const dataRow = lines[i].split(',').map(d => d.trim().replace(/\r$/, ''));
      
      if (dataRow.length !== headers.length) {
        console.error(`CSV parsing error at row ${i}: header/data length mismatch`);
        continue;
      }

      // Build data object from CSV row
      const data: any = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j].trim();
        const value = dataRow[j].trim();
        
        if (header !== '_time' && !isNaN(Number(value)) && value !== '') {
          data[header] = Number(value);
        } else {
          data[header] = value;
        }
      }

      // Convert timestamp to proper format
      const timestamp = new Date(data._time);
      
      // Prepare data point for storage
      const dataPoint = {
        machine_id: 'KU001619000079', // The actual machine ID
        timestamp_utc: timestamp.toISOString(),
        water_level_l: data.water_level_L || null,
        compressor_on: data.compressor_on || 0,
        ambient_temp_c: data.ambient_temp_C || null,
        ambient_rh_pct: data.ambient_rh_pct || null,
        refrigerant_temp_c: data.refrigerant_temp_C || null,
        exhaust_temp_c: data.exhaust_temp_C || null,
        current_a: data.current_A || null,
        treating_water: data.treating_water === 1 || data.treating_water === true,
        serving_water: data.serving_water === 1 || data.serving_water === true,
        producing_water: data.producing_water === 1 || data.producing_water === true,
        full_tank: data.full_tank === 1 || data.full_tank === true,
        disinfecting: data.disinfecting === 1 || data.disinfecting === true
      };

      dataPointsToStore.push(dataPoint);
      
      // Keep track of the latest data point for the response
      if (!latestDataPoint || timestamp > new Date(latestDataPoint.timestamp_utc)) {
        latestDataPoint = dataPoint;
      }
    }

    console.log(`Processed ${dataPointsToStore.length} data points`);

    // Store data points in Supabase (using regular insert, checking for duplicates manually)
    if (dataPointsToStore.length > 0) {
      try {
        // Check which timestamps already exist to avoid duplicates
        const timestamps = dataPointsToStore.map(d => d.timestamp_utc);
        const { data: existingData } = await supabase
          .from('raw_machine_data')
          .select('timestamp_utc')
          .eq('machine_id', 'KU001619000079')
          .in('timestamp_utc', timestamps);

        const existingTimestamps = new Set(existingData?.map(d => d.timestamp_utc) || []);
        const newDataPoints = dataPointsToStore.filter(d => !existingTimestamps.has(d.timestamp_utc));

        if (newDataPoints.length > 0) {
          const { data: insertedData, error: insertError } = await supabase
            .from('raw_machine_data')
            .insert(newDataPoints);

          if (insertError) {
            console.error('Error storing data in Supabase:', insertError);
            // Continue processing even if storage fails
          } else {
            console.log(`Successfully stored ${newDataPoints.length} new data points`);
          }
        } else {
          console.log('No new data points to store (all already exist)');
        }
      } catch (storageError) {
        console.error('Exception storing data:', storageError);
        // Continue processing even if storage fails
      }
    }

    // Return the latest data point for the current dashboard display
    if (!latestDataPoint) {
      return new Response(JSON.stringify({ error: 'No valid data points found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format response to match current dashboard expectations
    const responseData = {
      _time: latestDataPoint.timestamp_utc,
      water_level_L: latestDataPoint.water_level_l,
      compressor_on: latestDataPoint.compressor_on
    };

    const result = {
      status: 'ok',
      data: responseData,
      stored_points: dataPointsToStore.length
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-machine-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
