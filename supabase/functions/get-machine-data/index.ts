
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './config.ts';
import { createInfluxClient } from './influx-client.ts';
import { parseCSVResponse } from './csv-parser.ts';
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

    // Create InfluxDB client - now async
    const influxClient = await createInfluxClient();
    
    // Create multiple Flux queries to try different approaches
    const queries = [
      // Primary query - exact UID match with updated measurement name
      `
        from(bucket: "awg_data_full")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "awg_data")
          |> filter(fn: (r) => r.uid == "${machineUID}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1)
      `,
      // Fallback query - try awg_data_full measurement
      `
        from(bucket: "awg_data_full")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "awg_data_full")
          |> filter(fn: (r) => r.uid == "${machineUID}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1)
      `,
      // Debug query - get any recent data to see what's available
      `
        from(bucket: "awg_data_full")
          |> range(start: -30m)
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 5)
      `
    ];

    // Create Supabase client for logging
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    console.log('📊 Executing primary Flux query for UID:', machineUID);

    // Execute the primary query first
    const queryApi = influxClient.getQueryApi('kumulus');
    const csvData: string[] = [];
    
    return new Promise((resolve) => {
      queryApi.queryRows(queries[0], {
        next: (row: string[], tableMeta: any) => {
          console.log('📥 Received row from InfluxDB:', row);
          csvData.push(row.join(','));
        },
        error: async (error: Error) => {
          console.error('❌ Primary InfluxDB query error:', error);
          
          // Log the error with more details
          try {
            await supabase.from('data_ingestion_logs').insert([{
              machine_id: `UID_${machineUID}`,
              log_type: 'query_error',
              message: `Primary query failed: ${error.message}`,
              influx_query: queries[0],
              data_timestamp: new Date().toISOString(),
              error_details: error.stack
            }]);
          } catch (logError) {
            console.log('Failed to log error:', logError);
          }

          // Try fallback query
          console.log('🔄 Trying fallback query with different measurement name...');
          
          const fallbackData: string[] = [];
          queryApi.queryRows(queries[1], {
            next: (row: string[], tableMeta: any) => {
              console.log('📥 Fallback row from InfluxDB:', row);
              fallbackData.push(row.join(','));
            },
            error: async (fallbackError: Error) => {
              console.error('❌ Fallback query also failed:', fallbackError);
              
              // Try debug query to see what data is available
              console.log('🔍 Executing debug query to see available data...');
              const debugData: string[] = [];
              
              queryApi.queryRows(queries[2], {
                next: (row: string[], tableMeta: any) => {
                  console.log('🐛 Debug row from InfluxDB:', row);
                  debugData.push(row.join(','));
                },
                error: (debugError: Error) => {
                  console.error('❌ Debug query failed:', debugError);
                  resolve(new Response(
                    JSON.stringify({ 
                      status: 'error', 
                      message: 'All InfluxDB queries failed',
                      error: fallbackError.message,
                      uid: machineUID,
                      debug: 'No data available in InfluxDB'
                    }),
                    { 
                      status: 500, 
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    }
                  ));
                },
                complete: async () => {
                  console.log('🐛 Debug query results:', debugData.length, 'rows found');
                  if (debugData.length > 0) {
                    console.log('🐛 Sample data structure:', debugData.slice(0, 3));
                  }
                  
                  resolve(new Response(
                    JSON.stringify({ 
                      status: 'no_data', 
                      message: 'No data found for the specified UID',
                      uid: machineUID,
                      debug: `Found ${debugData.length} recent records in InfluxDB, but none matching UID ${machineUID}`,
                      sampleData: debugData.slice(0, 3)
                    }),
                    { 
                      status: 200, 
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    }
                  ));
                }
              });
            },
            complete: async () => {
              console.log('✅ Fallback query completed. Rows received:', fallbackData.length);
              if (fallbackData.length > 0) {
                // Process fallback data
                await processQueryResults(fallbackData, machineUID, supabase, resolve);
              } else {
                resolve(new Response(
                  JSON.stringify({ 
                    status: 'no_data', 
                    message: 'No data found with fallback measurement name',
                    uid: machineUID
                  }),
                  { 
                    status: 200, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  }
                ));
              }
            }
          });
        },
        complete: async () => {
          console.log('✅ Primary InfluxDB query completed. Rows received:', csvData.length);
          
          if (csvData.length === 0) {
            console.log('⚠️ No data returned from primary query for UID:', machineUID);
            resolve(new Response(
              JSON.stringify({ 
                status: 'no_data', 
                message: 'No recent data found for this machine UID',
                uid: machineUID
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            ));
            return;
          }

          await processQueryResults(csvData, machineUID, supabase, resolve);
        }
      });
    });

    // Helper function to process query results
    async function processQueryResults(csvData: string[], machineUID: string, supabase: any, resolve: Function) {
      try {
        console.log('🔄 Processing CSV data:', csvData);

        // Parse and process the data - using correct function name
        const parsedData = parseCSVResponse(csvData.join('\n'));
        console.log('📋 Parsed data:', parsedData);
        
        if (!parsedData) {
          resolve(new Response(
            JSON.stringify({ 
              status: 'no_data', 
              message: 'No valid data points found after parsing',
              uid: machineUID
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          ));
          return;
        }

        console.log('🔄 Processing data point:', parsedData._time);
        console.log('💧 Water level:', parsedData.water_level_L);
        console.log('⚡ Compressor:', parsedData.compressor_on);
        
        // Process the raw data
        const processedData: ProcessedDataPoint = processRawData(parsedData, `UID_${machineUID}`);
        console.log('⚙️ Processed data:', processedData);

        // Store in Supabase
        await storeDataPoint(SUPABASE_URL, SUPABASE_SERVICE_KEY, processedData, parsedData.water_level_L);
        
        // Build and return response
        const response = buildResponse(parsedData);
        console.log('📤 Returning response for UID:', machineUID, 'with water level:', parsedData.water_level_L);
        
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
