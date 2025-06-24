
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ProcessedDataPoint } from './types.ts';
import { MACHINE_ID } from './config.ts';

export async function storeDataPoint(
  supabaseUrl: string,
  supabaseServiceKey: string,
  dataPoint: ProcessedDataPoint,
  waterLevel: number | null
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check for existing data point using both machine_id AND timestamp_utc for better duplicate detection
    const { data: existingData } = await supabase
      .from('raw_machine_data')
      .select('id')
      .eq('machine_id', MACHINE_ID)
      .eq('timestamp_utc', dataPoint.timestamp_utc)
      .maybeSingle();

    if (!existingData) {
      const { data: insertedData, error: insertError } = await supabase
        .from('raw_machine_data')
        .insert([dataPoint]);

      if (insertError) {
        console.error('Error storing data in Supabase:', insertError);
        // Continue processing even if storage fails
      } else {
        console.log('Successfully stored new data point with water level:', waterLevel, 'at timestamp:', dataPoint.timestamp_utc);
      }
    } else {
      console.log('Data point already exists for timestamp:', dataPoint.timestamp_utc, 'skipping insert');
    }
  } catch (storageError) {
    console.error('Exception storing data:', storageError);
    // Continue processing even if storage fails
  }
}
