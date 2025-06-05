
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log('Environment check:', {
      hasUrl: !!influxUrl,
      hasToken: !!influxToken,
      hasOrg: !!influxOrg,
      bucket: influxBucket,
      url: influxUrl
    });

    if (!influxUrl || !influxToken || !influxOrg) {
      throw new Error('Missing InfluxDB configuration');
    }

    // Modified Flux query to get both fields separately and then join them
    const fluxQuery = `
import "join"

water_level = from(bucket: "${influxBucket}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "awg_data_full")
  |> filter(fn: (r) => r._field == "water_level_L")
  |> group(columns: [])
  |> last()
  |> drop(columns: ["_start", "_stop"])

compressor = from(bucket: "${influxBucket}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "awg_data_full")
  |> filter(fn: (r) => r._field == "compressor_on")
  |> group(columns: [])
  |> last()
  |> drop(columns: ["_start", "_stop"])

join.left(
  left: water_level,
  right: compressor,
  on: (l, r) => l._time == r._time,
  as: (l, r) => ({
    _time: l._time,
    water_level_L: l._value,
    compressor_on: if exists r._value then r._value else 0.0
  })
)`;

    console.log('Executing Flux query:', fluxQuery);

    // Ensure the URL doesn't have a trailing slash and construct the proper query endpoint
    const baseUrl = influxUrl.endsWith('/') ? influxUrl.slice(0, -1) : influxUrl;
    const queryUrl = `${baseUrl}/api/v2/query?org=${encodeURIComponent(influxOrg)}`;
    
    console.log('Query URL:', queryUrl);

    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${influxToken}`,
        'Content-Type': 'application/vnd.flux',
        'Accept': 'application/csv', // Request CSV format which is more reliable
      },
      body: fluxQuery,
    });

    console.log('InfluxDB response status:', response.status);
    console.log('InfluxDB response headers:', Object.fromEntries(response.headers.entries()));

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

    // Parse CSV headers - handle carriage returns
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
    console.log('CSV headers:', headers);

    // Parse data row (skip first line which is headers)
    const dataRow = lines[1].split(',').map(d => d.trim().replace(/\r$/, ''));
    console.log('CSV data row:', dataRow);

    if (dataRow.length !== headers.length) {
      console.error('CSV parsing error: header/data length mismatch');
      return new Response(JSON.stringify({ 
        error: 'CSV parsing error: header/data length mismatch' 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the data object from CSV
    const data: any = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim();
      const value = dataRow[i].trim();
      
      // Skip metadata columns but keep _time
      if (!header.startsWith('_') || header === '_time') {
        // Try to parse numeric values
        if (header !== '_time' && !isNaN(Number(value))) {
          data[header] = Number(value);
        } else {
          data[header] = value;
        }
      }
    }

    // Ensure compressor_on defaults to 0 if not present
    if (!data.hasOwnProperty('compressor_on')) {
      console.log('compressor_on field not found, defaulting to 0');
      data.compressor_on = 0;
    }

    console.log('Parsed data:', data);

    const result = {
      status: 'ok',
      data: data
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
