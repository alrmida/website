
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InfluxDataPoint {
  _time: string;
  water_level_L: number;
  compressor_on: number;
  [key: string]: any;
}

function calculateMachineStatus(waterLevel: number, compressorOn: number, dataAge: number): string {
  // If no data for 60+ seconds, machine is disconnected
  if (dataAge > 60000) { // 60 seconds in milliseconds
    return 'Disconnected';
  }
  
  // Calculate status based on water level and compressor state
  if (waterLevel > 9.5 && compressorOn === 0) {
    return 'Full Water';
  } else if (waterLevel <= 9.5 && compressorOn === 1) {
    return 'Producing';
  } else if (waterLevel <= 9.5 && compressorOn === 0) {
    return 'Idle';
  }
  
  return 'Unknown';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const influxUrl = Deno.env.get('INFLUXDB_URL');
    const influxToken = Deno.env.get('INFLUXDB_TOKEN');
    const influxOrg = Deno.env.get('INFLUXDB_ORG');

    if (!influxUrl || !influxToken || !influxOrg) {
      throw new Error('Missing InfluxDB configuration');
    }

    // Query to get the latest data point
    const query = `
      from(bucket: "KumulusData")
        |> range(start: -10m)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> pivot(
             rowKey: ["_time"],
             columnKey: ["_field"], 
             valueColumn: "_value"
           )
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    console.log('Querying InfluxDB with:', { url: influxUrl, org: influxOrg });

    const response = await fetch(`${influxUrl}/api/v2/query?org=${influxOrg}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${influxToken}`,
        'Content-Type': 'application/vnd.flux',
        'Accept': 'application/csv',
      },
      body: query,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('InfluxDB query failed:', response.status, errorText);
      throw new Error(`InfluxDB query failed: ${response.status} ${errorText}`);
    }

    const csvData = await response.text();
    console.log('Raw CSV response:', csvData);

    // Parse CSV response (basic CSV parsing for InfluxDB format)
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('No data returned from InfluxDB');
    }

    // Get headers and data
    const headers = lines[0].split(',');
    const dataLine = lines[lines.length - 1].split(','); // Get last line of data

    // Create object from headers and data
    const dataPoint: any = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.trim();
      const value = dataLine[index]?.trim();
      
      if (cleanHeader === '_time') {
        dataPoint[cleanHeader] = value;
      } else if (cleanHeader === 'water_level_L' || cleanHeader === 'compressor_on') {
        dataPoint[cleanHeader] = parseFloat(value) || 0;
      }
    });

    console.log('Parsed data point:', dataPoint);

    // Calculate data age
    const dataTime = new Date(dataPoint._time);
    const now = new Date();
    const dataAge = now.getTime() - dataTime.getTime();

    // Calculate machine status
    const status = calculateMachineStatus(
      dataPoint.water_level_L || 0,
      dataPoint.compressor_on || 0,
      dataAge
    );

    const result = {
      waterLevel: dataPoint.water_level_L || 0,
      status: status,
      lastUpdated: dataPoint._time,
      dataAge: dataAge,
      compressorOn: dataPoint.compressor_on || 0
    };

    console.log('Returning result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-machine-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      waterLevel: 0,
      status: 'Disconnected',
      lastUpdated: new Date().toISOString(),
      dataAge: 999999
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
