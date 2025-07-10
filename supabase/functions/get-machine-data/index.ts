
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './config.ts';
import { createInfluxClient } from './influx-client.ts';
import { parseCSVData } from './csv-parser.ts';
import { processRawData } from './data-processor.ts';
import { buildResponse } from './response-builder.ts';
import { storeDataPoint } from './supabase-client.ts';
import type { ProcessedDataPoint } from './types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log('🚀 Edge Function get-machine-data invoked:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let machineUID: string | null = null;

    // Extract UID from query parameters or request body
    if (req.method === 'GET') {
      const url = new URL(req.url);
      machineUID = url.searchParams.get('uid');
    } else if (req.method === 'POST') {
      const body = await req.json();
      machineUID = body.uid;
    }

    // If no UID provided, use the default one for backward compatibility
    if (!machineUID) {
      machineUID = '353636343034510C003F0046';
      console.log('⚠️ No UID provided, using default UID:', machineUID);
    }

    console.log('🔍 Processing data for machine UID:', machineUID);

    // Create InfluxDB client
    const influxClient = createInfluxClient();
    
    // Create Flux query with UID filter
    const fluxQuery = `
      from(bucket: "awg_data_full")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "awg_data")
        |> filter(fn: (r) => r.uid == "${machineUID}")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    console.log('📊 Executing Flux query:', fluxQuery);

    // Log to data ingestion table
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const logData = {
      machine_id: `UID_${machineUID}`,
      log_type: 'data_fetch',
      message: `Fetching data for UID: ${machineUID}`,
      influx_query: fluxQuery,
      data_timestamp: new Date().toISOString(),
      data_freshness_minutes: null,
      influx_response_size: null,
      error_details: null
    };

    try {
      await supabase.from('data_ingestion_logs').insert([logData]);
    } catch (logError) {
      console.log('Failed to log to database:', logError);
    }

    // Execute the query
    const queryApi = influxClient.getQueryApi('kumulus');
    const csvData: string[] = [];
    
    return new Promise((resolve) => {
      queryApi.queryRows(fluxQuery, {
        next: (row: string[], tableMeta: any) => {
          csvData.push(row.join(','));
        },
        error: (error: Error) => {
          console.error('❌ InfluxDB query error:', error);
          resolve(new Response(
            JSON.stringify({ 
              status: 'error', 
              message: 'Failed to fetch data from InfluxDB',
              error: error.message,
              uid: machineUID
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          ));
        },
        complete: async () => {
          console.log('✅ InfluxDB query completed. Rows received:', csvData.length);
          
          // Update log with response size
          try {
            await supabase
              .from('data_ingestion_logs')
              .update({ influx_response_size: csvData.length })
              .eq('machine_id', `UID_${machineUID}`)
              .eq('log_type', 'data_fetch')
              .gte('created_at', new Date(Date.now() - 5000).toISOString());
          } catch (logError) {
            console.log('Failed to update log:', logError);
          }

          if (csvData.length === 0) {
            console.log('⚠️ No data returned from InfluxDB for UID:', machineUID);
            resolve(new Response(
              JSON.stringify({ 
                status: 'no_data', 
                message: 'No recent data found',
                uid: machineUID
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            ));
            return;
          }

          try {
            // Parse and process the data
            const parsedData = parseCSVData(csvData);
            console.log('📋 Parsed data points:', parsedData.length);
            
            if (parsedData.length === 0) {
              resolve(new Response(
                JSON.stringify({ 
                  status: 'no_data', 
                  message: 'No valid data points found',
                  uid: machineUID
                }),
                { 
                  status: 200, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              ));
              return;
            }

            // Get the most recent data point
            const latestDataPoint = parsedData[0];
            console.log('🔄 Processing latest data point:', latestDataPoint._time);
            
            // Process the raw data
            const processedData: ProcessedDataPoint = processRawData(latestDataPoint, `UID_${machineUID}`);
            console.log('⚙️ Processed data:', processedData);

            // Store in Supabase
            await storeDataPoint(SUPABASE_URL, SUPABASE_SERVICE_KEY, processedData, latestDataPoint.water_level_L);
            
            // Build and return response
            const response = buildResponse(latestDataPoint);
            console.log('📤 Returning response for UID:', machineUID);
            
            resolve(new Response(
              JSON.stringify(response),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            ));
            
          } catch (processingError) {
            console.error('❌ Error processing data:', processingError);
            resolve(new Response(
              JSON.stringify({ 
                status: 'error', 
                message: 'Error processing data',
                error: processingError.message,
                uid: machineUID
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            ));
          }
        }
      });
    });

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Internal server error',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
