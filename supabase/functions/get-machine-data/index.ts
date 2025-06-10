
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

    // Query to get the latest data point only
    const fluxQuery = `
from(bucket: "${influxBucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "awg_data_full")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 1)`;

    console.log('Executing Flux query for latest data point:', fluxQuery);

    // Fix URL construction - remove double slashes and ensure proper formatting
    const baseUrl = influxUrl.replace(/\/+$/, ''); // Remove trailing slashes
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
    console.log('InfluxDB response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('InfluxDB query failed:', response.status, response.statusText, errorText);
      return new Response(JSON.stringify({ 
        error: `InfluxDB returned ${response.status} ${response.statusText}: ${errorText}`,
        details: { url: queryUrl, status: response.status }
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseText = await response.text();
    console.log('InfluxDB raw response (first 500 chars):', responseText.substring(0, 500));

    // Parse CSV response
    const lines = responseText.trim().split('\n');
    if (lines.length < 2) {
      console.log('No data found in CSV response');
      return new Response(JSON.stringify({ 
        error: 'No data returned from InfluxDB',
        details: { responseLines: lines.length, rawResponse: responseText.substring(0, 200) }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
    console.log('CSV headers:', headers);

    // Process the latest data point (should be only one)
    const dataRow = lines[1].split(',').map(d => d.trim().replace(/\r$/, ''));
    
    if (dataRow.length !== headers.length) {
      console.error('CSV parsing error: header/data length mismatch');
      throw new Error('Invalid CSV format from InfluxDB');
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

    console.log('Parsed data from InfluxDB:', data);

    // Convert timestamp to proper format
    const timestamp = new Date(data._time);
    
    // Prepare data point for storage with proper field mapping
    const dataPoint = {
      machine_id: 'KU001619000079', // The actual machine ID
      timestamp_utc: timestamp.toISOString(),
      water_level_l: data.water_level_L || data['water_level_L'] || null,
      compressor_on: data.compressor_on || 0,
      ambient_temp_c: data.ambient_temp_C || data['ambient_temp_C'] || null,
      ambient_rh_pct: data.ambient_rh_pct || data['ambient_rh_pct'] || null,
      refrigerant_temp_c: data.refrigerant_temp_C || data['refrigerant_temp_C'] || null,
      exhaust_temp_c: data.exhaust_temp_C || data['exhaust_temp_C'] || null,
      current_a: data.current_A || data['current_A'] || null,
      treating_water: data.treating_water === 1 || data.treating_water === true,
      serving_water: data.serving_water === 1 || data.serving_water === true,
      producing_water: data.producing_water === 1 || data.producing_water === true,
      full_tank: data.full_tank === 1 || data.full_tank === true,
      disinfecting: data.disinfecting === 1 || data.disinfecting === true
    };

    console.log('Processed data point for storage:', dataPoint);

    // Store data point in Supabase (check for existing timestamp first)
    try {
      const { data: existingData } = await supabase
        .from('raw_machine_data')
        .select('timestamp_utc')
        .eq('machine_id', 'KU001619000079')
        .eq('timestamp_utc', dataPoint.timestamp_utc)
        .single();

      if (!existingData) {
        const { data: insertedData, error: insertError } = await supabase
          .from('raw_machine_data')
          .insert([dataPoint]);

        if (insertError) {
          console.error('Error storing data in Supabase:', insertError);
          // Continue processing even if storage fails
        } else {
          console.log('Successfully stored new data point');
        }
      } else {
        console.log('Data point already exists, skipping insert');
      }
    } catch (storageError) {
      console.error('Exception storing data:', storageError);
      // Continue processing even if storage fails
    }

    // Format response for the dashboard (same as before)
    const responseData = {
      _time: dataPoint.timestamp_utc,
      water_level_L: dataPoint.water_level_l,
      compressor_on: dataPoint.compressor_on
    };

    const result = {
      status: 'ok',
      data: responseData,
      debug: {
        influxHeaders: headers,
        influxData: data,
        storedData: dataPoint
      }
    };

    console.log('Final response:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-machine-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
