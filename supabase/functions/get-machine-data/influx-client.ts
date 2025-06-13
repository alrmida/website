
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
