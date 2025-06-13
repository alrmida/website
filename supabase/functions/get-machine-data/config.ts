
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const MACHINE_ID = 'KU001619000079';

export function getEnvironmentConfig() {
  const influxUrl = Deno.env.get('INFLUXDB_URL');
  const influxToken = Deno.env.get('INFLUXDB_TOKEN');
  const influxOrg = Deno.env.get('INFLUXDB_ORG');
  const influxBucket = Deno.env.get('INFLUXDB_BUCKET') || 'KumulusData';
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

  return {
    influxUrl,
    influxToken,
    influxOrg,
    influxBucket,
    supabaseUrl,
    supabaseServiceKey
  };
}
