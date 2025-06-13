
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CORS_HEADERS, getEnvironmentConfig } from './config.ts';
import { createInfluxQuery, fetchInfluxData } from './influx-client.ts';
import { parseCSVResponse } from './csv-parser.ts';
import { processDataPoint } from './data-processor.ts';
import { storeDataPoint } from './supabase-client.ts';
import { buildApiResponse } from './response-builder.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const config = getEnvironmentConfig();
    const fluxQuery = createInfluxQuery(config.influxBucket);
    const responseText = await fetchInfluxData(
      config.influxUrl,
      config.influxToken,
      config.influxOrg,
      fluxQuery
    );

    // Parse CSV response
    const lines = responseText.trim().split('\n');
    if (lines.length < 2) {
      console.log('No data found in CSV response');
      return new Response(JSON.stringify({ 
        error: 'No data returned from InfluxDB',
        details: { responseLines: lines.length, rawResponse: responseText.substring(0, 200) }
      }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
    const data = parseCSVResponse(responseText);
    const { dataPoint, waterLevel } = processDataPoint(data);

    await storeDataPoint(
      config.supabaseUrl,
      config.supabaseServiceKey,
      dataPoint,
      waterLevel
    );

    const result = buildApiResponse(headers, data, dataPoint, waterLevel);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-machine-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
