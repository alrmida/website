
export function createInfluxClient() {
  const INFLUXDB_URL = Deno.env.get('INFLUXDB_URL')!;
  const INFLUXDB_TOKEN = Deno.env.get('INFLUXDB_TOKEN')!;
  const INFLUXDB_ORG = Deno.env.get('INFLUXDB_ORG')!;

  console.log('🔧 Creating InfluxDB client with:');
  console.log('📍 URL:', INFLUXDB_URL ? 'Set' : 'Missing');
  console.log('🔑 Token:', INFLUXDB_TOKEN ? 'Set' : 'Missing');
  console.log('🏢 Org:', INFLUXDB_ORG ? 'Set' : 'Missing');

  // Import InfluxDB client
  const { InfluxDB } = await import('https://esm.sh/@influxdata/influxdb-client@1.33.2');
  
  const client = new InfluxDB({
    url: INFLUXDB_URL,
    token: INFLUXDB_TOKEN,
  });

  console.log('✅ InfluxDB client created successfully');
  return client;
}

export function createInfluxQuery(bucket: string): string {
  return `
from(bucket: "${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "awg_data_full")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 1)`;
}

export async function fetchInfluxData(
  influxUrl: string,
  influxToken: string,
  influxOrg: string,
  query: string
): Promise<string> {
  const baseUrl = influxUrl.replace(/\/+$/, '');
  const queryUrl = `${baseUrl}/api/v2/query?org=${encodeURIComponent(influxOrg)}`;
  
  console.log('Query URL:', queryUrl);
  console.log('Executing Flux query for latest data point:', query);

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${influxToken}`,
      'Content-Type': 'application/vnd.flux',
      'Accept': 'application/csv',
    },
    body: query,
  });

  console.log('InfluxDB response status:', response.status);
  console.log('InfluxDB response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('InfluxDB query failed:', response.status, response.statusText, errorText);
    throw new Error(`InfluxDB returned ${response.status} ${response.statusText}: ${errorText}`);
  }

  const responseText = await response.text();
  console.log('InfluxDB raw response (first 500 chars):', responseText.substring(0, 500));
  
  return responseText;
}
