import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      raw_machine_data: {
        Row: {
          id: string;
          machine_id: string;
          timestamp_utc: string;
          water_level_l: number;
          compressor_on: number;
        };
      };
      simple_water_snapshots: {
        Row: {
          id: string;
          machine_id: string;
          water_level_l: number;
          timestamp_utc: string;
        };
        Insert: {
          machine_id: string;
          water_level_l: number;
          timestamp_utc?: string;
        };
      };
      water_production_events: {
        Row: {
          id: string;
          machine_id: string;
          production_liters: number;
          previous_level: number;
          current_level: number;
          timestamp_utc: string;
          event_type: string;
        };
        Insert: {
          machine_id: string;
          production_liters: number;
          previous_level: number;
          current_level: number;
          timestamp_utc?: string;
          event_type?: string;
        };
      };
      data_ingestion_logs: {
        Insert: {
          machine_id: string;
          log_type: string;
          message: string;
          data_timestamp?: string;
          data_freshness_minutes?: number;
          influx_query?: string;
          influx_response_size?: number;
          error_details?: string;
        };
      };
    };
  };
}

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// InfluxDB configuration
const INFLUX_URL = Deno.env.get('INFLUXDB_URL');
const INFLUX_TOKEN = Deno.env.get('INFLUXDB_TOKEN');
const INFLUX_ORG = Deno.env.get('INFLUXDB_ORG');
const INFLUX_BUCKET = Deno.env.get('INFLUXDB_BUCKET') || 'KumulusData';
const MACHINE_ID = 'KU001619000079';

async function logDataIngestion(
  logType: string, 
  message: string, 
  extraData?: {
    dataTimestamp?: string;
    freshnessMinutes?: number;
    influxQuery?: string;
    influxResponseSize?: number;
    errorDetails?: string;
  }
) {
  try {
    await supabase.from('data_ingestion_logs').insert({
      machine_id: MACHINE_ID,
      log_type: logType,
      message,
      data_timestamp: extraData?.dataTimestamp,
      data_freshness_minutes: extraData?.freshnessMinutes,
      influx_query: extraData?.influxQuery,
      influx_response_size: extraData?.influxResponseSize,
      error_details: extraData?.errorDetails
    });
  } catch (error) {
    console.error('Failed to log data ingestion event:', error);
  }
}

async function fetchLatestDataFromInflux(): Promise<{ waterLevel: number; timestamp: string } | null> {
  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG) {
    console.log('❌ InfluxDB configuration missing');
    await logDataIngestion('ERROR', 'InfluxDB configuration missing', {
      errorDetails: 'Missing INFLUX_URL, INFLUX_TOKEN, or INFLUX_ORG environment variables'
    });
    return null;
  }

  try {
    console.log('🔍 Starting InfluxDB query for latest data...');
    
    // Use a shorter time range first to get the most recent data
    const query = `
      from(bucket: "${INFLUX_BUCKET}")
        |> range(start: -2h)
        |> filter(fn: (r) => r._measurement == "awg_data_full")
        |> filter(fn: (r) => r._field == "water_level_L")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    const baseUrl = INFLUX_URL.replace(/\/+$/, '');
    const queryUrl = `${baseUrl}/api/v2/query?org=${encodeURIComponent(INFLUX_ORG)}`;
    
    console.log('🔗 Query URL:', queryUrl);
    console.log('📝 Query:', query);
    console.log('⏰ Current time:', new Date().toISOString());
    
    await logDataIngestion('INFO', 'Starting InfluxDB query for latest data', {
      influxQuery: query
    });
    
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${INFLUX_TOKEN}`,
        'Content-Type': 'application/vnd.flux',
        'Accept': 'application/csv',
      },
      body: query,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ InfluxDB query failed:', response.status, errorText);
      await logDataIngestion('ERROR', 'InfluxDB query failed', {
        errorDetails: `Status: ${response.status}, Response: ${errorText}`
      });
      return null;
    }

    const responseText = await response.text();
    const lines = responseText.trim().split('\n');
    
    console.log('📊 InfluxDB Response Analysis:');
    console.log(`   - Total lines: ${lines.length}`);
    console.log(`   - Response size: ${responseText.length} characters`);
    console.log(`   - First few lines:`, lines.slice(0, 3));
    
    await logDataIngestion('INFO', 'InfluxDB query successful', {
      influxResponseSize: responseText.length
    });
    
    if (lines.length < 2) {
      console.log('⚠️ No data found in InfluxDB response - trying longer time range');
      
      // Try a longer time range if no recent data
      const longerQuery = `
        from(bucket: "${INFLUX_BUCKET}")
          |> range(start: -24h)
          |> filter(fn: (r) => r._measurement == "awg_data_full")
          |> filter(fn: (r) => r._field == "water_level_L")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1)
      `;
      
      const longerResponse = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${INFLUX_TOKEN}`,
          'Content-Type': 'application/vnd.flux',
          'Accept': 'application/csv',
        },
        body: longerQuery,
      });
      
      if (longerResponse.ok) {
        const longerResponseText = await longerResponse.text();
        const longerLines = longerResponseText.trim().split('\n');
        console.log('📊 Extended search found:', longerLines.length, 'lines');
        
        if (longerLines.length >= 2) {
          lines.length = 0;
          lines.push(...longerLines);
        }
      }
      
      if (lines.length < 2) {
        await logDataIngestion('WARNING', 'No data in InfluxDB response even with 24h range', {
          influxResponseSize: responseText.length
        });
        return null;
      }
    }

    // Parse CSV response
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('📋 Headers:', headers);
    
    const timeIndex = headers.indexOf('_time');
    const valueIndex = headers.indexOf('_value');
    
    if (timeIndex === -1 || valueIndex === -1) {
      console.error('❌ Invalid CSV format from InfluxDB');
      await logDataIngestion('ERROR', 'Invalid CSV format from InfluxDB', {
        errorDetails: `Headers: ${headers.join(', ')}`
      });
      return null;
    }

    // Get the latest data point
    const dataRow = lines[1].split(',').map(d => d.trim());
    const timestamp = dataRow[timeIndex];
    const waterLevel = parseFloat(dataRow[valueIndex]);
    
    if (isNaN(waterLevel)) {
      console.error('❌ No valid water level data found');
      await logDataIngestion('ERROR', 'No valid water level data found');
      return null;
    }

    const dataAge = Date.now() - new Date(timestamp).getTime();
    const freshnessMinutes = Math.round(dataAge / 1000 / 60);
    
    console.log('✅ Latest data point:', { timestamp, waterLevel, freshnessMinutes });
    
    if (freshnessMinutes > 60) {
      console.log('⚠️ Data is older than 1 hour');
      await logDataIngestion('WARNING', 'Data is older than 1 hour', {
        dataTimestamp: timestamp,
        freshnessMinutes
      });
    } else {
      console.log('✅ Data is relatively fresh');
      await logDataIngestion('SUCCESS', 'Fresh data retrieved', {
        dataTimestamp: timestamp,
        freshnessMinutes
      });
    }

    return { 
      waterLevel, 
      timestamp 
    };

  } catch (error) {
    console.error('❌ Error fetching from InfluxDB:', error);
    await logDataIngestion('ERROR', 'InfluxDB fetch error', {
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

function detectDrainageEvent(currentLevel: number, previousLevel: number): boolean {
  const decrease = previousLevel - currentLevel;
  const percentageDecrease = (decrease / previousLevel) * 100;
  
  console.log('🔍 Drainage detection:', {
    currentLevel,
    previousLevel,
    decrease,
    percentageDecrease: Math.round(percentageDecrease)
  });

  return decrease > 3.0 || percentageDecrease > 50;
}

function isValidProduction(production: number, timeDiffMinutes: number): boolean {
  const maxProductionRate = 0.05;
  const maxExpectedProduction = maxProductionRate * timeDiffMinutes;
  
  const isValid = production > 0.05 && production <= maxExpectedProduction;
  
  console.log('🔍 Production validation:', {
    production,
    timeDiffMinutes,
    maxExpectedProduction,
    isValid
  });

  return isValid;
}

function isDataFresh(timestamp: string): boolean {
  const dataAge = Date.now() - new Date(timestamp).getTime();
  const maxAge = 2 * 60 * 60 * 1000;
  
  const isFresh = dataAge <= maxAge;
  console.log('🕒 Data freshness check:', {
    timestamp,
    ageMinutes: Math.round(dataAge / 1000 / 60),
    isFresh
  });
  
  return isFresh;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Water production tracking started at:', new Date().toISOString());
    
    await logDataIngestion('INFO', 'Track water production function started');

    const latestData = await fetchLatestDataFromInflux();
    
    if (!latestData) {
      console.log('❌ No fresh machine data available from InfluxDB');
      await logDataIngestion('WARNING', 'No data available from InfluxDB');
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'No fresh machine data available from InfluxDB' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { waterLevel, timestamp } = latestData;
    
    if (!waterLevel || waterLevel < 0) {
      console.log('⚠️ Invalid water level data:', waterLevel);
      await logDataIngestion('ERROR', 'Invalid water level data', {
        errorDetails: `Water level: ${waterLevel}`
      });
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: 'Invalid water level data' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Processing data for machine ${MACHINE_ID}: ${waterLevel}L at ${timestamp}`);

    // Store the snapshot with enhanced error handling
    const { error: snapshotError } = await supabase
      .from('simple_water_snapshots')
      .insert({
        machine_id: MACHINE_ID,
        water_level_l: waterLevel,
        timestamp_utc: timestamp
      });

    if (snapshotError) {
      console.error('❌ Error storing snapshot:', snapshotError);
      await logDataIngestion('ERROR', 'Failed to store snapshot', {
        errorDetails: snapshotError.message
      });
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Failed to store snapshot',
        error: snapshotError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Snapshot stored successfully');
    await logDataIngestion('SUCCESS', 'Snapshot stored successfully', {
      dataTimestamp: timestamp
    });

    const { data: previousSnapshots, error: previousError } = await supabase
      .from('simple_water_snapshots')
      .select('*')
      .eq('machine_id', MACHINE_ID)
      .order('timestamp_utc', { ascending: false })
      .limit(2);

    if (previousError) {
      console.error('❌ Error fetching previous snapshots:', previousError);
      await logDataIngestion('ERROR', 'Failed to fetch previous snapshots', {
        errorDetails: previousError.message
      });
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Failed to fetch previous snapshots' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!previousSnapshots || previousSnapshots.length < 2) {
      console.log('📝 Not enough snapshots for comparison yet');
      await logDataIngestion('INFO', 'Initial snapshot stored, waiting for next comparison');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Initial snapshot stored, waiting for next comparison' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentSnapshot = previousSnapshots[0];
    const previousSnapshot = previousSnapshots[1];
    const waterLevelDiff = currentSnapshot.water_level_l - previousSnapshot.water_level_l;
    const timeDiff = new Date(currentSnapshot.timestamp_utc).getTime() - new Date(previousSnapshot.timestamp_utc).getTime();
    const timeDiffMinutes = timeDiff / (1000 * 60);

    console.log(`🔍 Comparison:`, {
      current: currentSnapshot.water_level_l,
      previous: previousSnapshot.water_level_l,
      difference: waterLevelDiff,
      timeDiffMinutes: Math.round(timeDiffMinutes),
      currentTime: currentSnapshot.timestamp_utc,
      previousTime: previousSnapshot.timestamp_utc
    });

    await logDataIngestion('INFO', 'Snapshot comparison completed', {
      dataTimestamp: currentSnapshot.timestamp_utc
    });

    if (detectDrainageEvent(currentSnapshot.water_level_l, previousSnapshot.water_level_l)) {
      console.log(`🚰 Drainage event detected: ${Math.abs(waterLevelDiff).toFixed(2)}L removed`);
      
      await logDataIngestion('EVENT', 'Drainage event detected', {
        dataTimestamp: currentSnapshot.timestamp_utc
      });
      
      const { error: drainageError } = await supabase
        .from('water_production_events')
        .insert({
          machine_id: MACHINE_ID,
          production_liters: waterLevelDiff,
          previous_level: previousSnapshot.water_level_l,
          current_level: currentSnapshot.water_level_l,
          timestamp_utc: currentSnapshot.timestamp_utc,
          event_type: 'drainage'
        });

      if (drainageError) {
        console.error('❌ Error storing drainage event:', drainageError);
        await logDataIngestion('ERROR', 'Failed to store drainage event', {
          errorDetails: drainageError.message
        });
      } else {
        console.log('✅ Drainage event stored successfully');
        await logDataIngestion('SUCCESS', 'Drainage event stored successfully');
      }
      
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: `Drainage event detected: ${Math.abs(waterLevelDiff).toFixed(2)}L removed`,
        event_type: 'drainage',
        water_removed: Math.abs(waterLevelDiff)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (waterLevelDiff > 0.05 && isValidProduction(waterLevelDiff, timeDiffMinutes)) {
      console.log(`💧 Water production detected: ${waterLevelDiff.toFixed(2)}L over ${Math.round(timeDiffMinutes)} minutes`);
      
      await logDataIngestion('EVENT', 'Production event detected', {
        dataTimestamp: currentSnapshot.timestamp_utc
      });
      
      const { error: productionError } = await supabase
        .from('water_production_events')
        .insert({
          machine_id: MACHINE_ID,
          production_liters: waterLevelDiff,
          previous_level: previousSnapshot.water_level_l,
          current_level: currentSnapshot.water_level_l,
          timestamp_utc: currentSnapshot.timestamp_utc,
          event_type: 'production'
        });

      if (productionError) {
        console.error('❌ Error storing production event:', productionError);
        await logDataIngestion('ERROR', 'Failed to store production event', {
          errorDetails: productionError.message
        });
        return new Response(JSON.stringify({ 
          status: 'error', 
          message: 'Failed to store production event' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Production event stored successfully');
      await logDataIngestion('SUCCESS', 'Production event stored successfully');
      
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: `Production tracked: ${waterLevelDiff.toFixed(2)}L`,
        production: waterLevelDiff,
        event_type: 'production',
        production_rate_lh: (waterLevelDiff / timeDiffMinutes) * 60
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (waterLevelDiff > 0.05) {
      console.log(`⚠️ Water increase detected (${waterLevelDiff.toFixed(2)}L) but production rate seems unrealistic`);
      await logDataIngestion('WARNING', 'Unrealistic production rate detected');
      return new Response(JSON.stringify({ 
        status: 'warning', 
        message: `Unrealistic production rate detected: ${waterLevelDiff.toFixed(2)}L in ${Math.round(timeDiffMinutes)} minutes` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('📊 No significant production detected');
      await logDataIngestion('INFO', 'No production detected in this period');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'No production detected in this period',
        water_level_change: waterLevelDiff,
        event_type: 'no_change'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error in track-water-production:', error);
    await logDataIngestion('ERROR', 'Unexpected error in track-water-production', {
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
