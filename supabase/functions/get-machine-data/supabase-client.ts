
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
    const { data: existingData } = await supabase
      .from('raw_machine_data')
      .select('timestamp_utc')
      .eq('machine_id', MACHINE_ID)
      .eq('timestamp_utc', dataPoint.timestamp_utc)
      .single();

    if (!existingData) {
      const { data: insertedData, error: insertError } = await supabase
        .from('raw_machine_data')
        .insert([dataPoint]);

      if (insertError) {
        console.error('Error storing data in Supabase:', insertError);
        // Continue processing even if storage fails
      } else {
        console.log('Successfully stored new data point with water level:', waterLevel);
      }
    } else {
      console.log('Data point already exists, skipping insert');
    }
  } catch (storageError) {
    console.error('Exception storing data:', storageError);
    // Continue processing even if storage fails
  }
}
