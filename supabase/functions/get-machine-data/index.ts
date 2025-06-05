
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

    // Flux query exactly as specified by ChatGPT
    const fluxQuery = `from(bucket: "${influxBucket}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "awg_data_full")
  |> group(columns: [])
  |> last()
  |> pivot(
       rowKey:   ["_time"],
       columnKey: ["_field"],
       valueColumn: "_value"
     )
  |> limit(n: 1)`;

    console.log('Executing Flux query:', fluxQuery);

    const response = await fetch(`${influxUrl}/api/v2/query?org=${encodeURIComponent(influxOrg)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${influxToken}`,
        'Content-Type': 'application/vnd.flux',
        'Accept': 'application/json',
      },
      body: fluxQuery,
    });

    console.log('InfluxDB response status:', response.status);
    console.log('InfluxDB response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('InfluxDB query failed:', response.status, response.statusText, errorText);
      return new Response(JSON.stringify({ 
        error: `InfluxDB returned ${response.status} ${response.statusText}` 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jsonData = await response.json();
    console.log('InfluxDB JSON response:', JSON.stringify(jsonData, null, 2));

    // Check if we have tables and records
    if (!jsonData.tables || jsonData.tables.length === 0) {
      console.log('No tables found in response');
      return new Response(JSON.stringify({ error: 'No data returned from InfluxDB' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const table = jsonData.tables[0];
    if (!table.records || table.records.length === 0) {
      console.log('No records found in table');
      return new Response(JSON.stringify({ error: 'No data returned from InfluxDB' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the flat object from the first record
    const record = table.records[0];
    console.log('Processing record:', record);

    // Extract all field data from the record
    const data: any = {};
    
    // Add timestamp
    if (record._time) {
      data._time = record._time;
    }

    // Add all other fields (excluding metadata fields that start with _)
    Object.keys(record).forEach(key => {
      if (!key.startsWith('_') || key === '_time') {
        data[key] = record[key];
      }
    });

    console.log('Extracted data:', data);

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
