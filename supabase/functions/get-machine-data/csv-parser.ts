
import type { InfluxDataPoint } from './types.ts';

export function parseCSVResponse(responseText: string): InfluxDataPoint | null {
  console.log('🔍 Parsing CSV response:', responseText.substring(0, 500));
  
  const lines = responseText.trim().split('\n');
  if (lines.length < 2) {
    console.log('⚠️ No data found in CSV response - only', lines.length, 'lines');
    return null;
  }

  // Parse CSV headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
  console.log('📊 CSV headers:', headers);

  // Process the latest data point (should be only one)
  const dataRow = lines[1].split(',').map(d => d.trim().replace(/\r$/, ''));
  console.log('📋 Data row:', dataRow);
  
  if (dataRow.length !== headers.length) {
    console.error('❌ CSV parsing error: header/data length mismatch');
    console.error('Headers length:', headers.length, 'Data length:', dataRow.length);
    return null;
  }

  // Build data object from CSV row
  const data: any = {};
  for (let j = 0; j < headers.length; j++) {
    const header = headers[j].trim();
    const value = dataRow[j].trim();
    
    // Handle different field name formats
    if (header === '_time') {
      data[header] = value;
    } else if (header.includes('water_level') || header === 'water_level_L') {
      data.water_level_L = !isNaN(Number(value)) && value !== '' ? Number(value) : null;
    } else if (header.includes('compressor') || header === 'compressor_on') {
      data.compressor_on = !isNaN(Number(value)) && value !== '' ? Number(value) : 0;
    } else if (!isNaN(Number(value)) && value !== '') {
      data[header] = Number(value);
    } else {
      data[header] = value;
    }
  }

  console.log('✅ Parsed data from InfluxDB:', data);
  
  // Ensure we have the minimum required fields
  if (!data._time) {
    console.error('❌ Missing _time field in parsed data');
    return null;
  }

  return data as InfluxDataPoint;
}
