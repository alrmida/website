
import type { InfluxDataPoint } from './types.ts';

export function parseCSVResponse(responseText: string): InfluxDataPoint {
  const lines = responseText.trim().split('\n');
  if (lines.length < 2) {
    console.log('No data found in CSV response');
    throw new Error('No data returned from InfluxDB');
  }

  // Parse CSV headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
  console.log('CSV headers:', headers);

  // Process the latest data point (should be only one)
  const dataRow = lines[1].split(',').map(d => d.trim().replace(/\r$/, ''));
  
  if (dataRow.length !== headers.length) {
    console.error('CSV parsing error: header/data length mismatch');
    throw new Error('Invalid CSV format from InfluxDB');
  }

  // Build data object from CSV row
  const data: any = {};
  for (let j = 0; j < headers.length; j++) {
    const header = headers[j].trim();
    const value = dataRow[j].trim();
    
    if (header !== '_time' && !isNaN(Number(value)) && value !== '') {
      data[header] = Number(value);
    } else {
      data[header] = value;
    }
  }

  console.log('Parsed data from InfluxDB:', data);
  return data as InfluxDataPoint;
}
