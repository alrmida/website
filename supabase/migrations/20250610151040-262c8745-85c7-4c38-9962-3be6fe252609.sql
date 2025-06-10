
-- Create table to store raw machine data for hourly processing
CREATE TABLE public.raw_machine_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  water_level_L DECIMAL,
  compressor_on INTEGER,
  ambient_temp_C DECIMAL,
  ambient_rh_pct DECIMAL,
  refrigerant_temp_C DECIMAL,
  exhaust_temp_C DECIMAL,
  current_A DECIMAL,
  treating_water BOOLEAN,
  serving_water BOOLEAN,
  producing_water BOOLEAN,
  full_tank BOOLEAN,
  disinfecting BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying by machine and timestamp
CREATE INDEX idx_raw_machine_data_machine_timestamp 
ON public.raw_machine_data (machine_id, timestamp_utc);

-- Add index for cleanup operations (keeping only recent data)
CREATE INDEX idx_raw_machine_data_created_at 
ON public.raw_machine_data (created_at);

-- Enable RLS (though this will be mainly used by edge functions)
ALTER TABLE public.raw_machine_data ENABLE ROW LEVEL SECURITY;

-- Policy to allow edge functions to insert data
CREATE POLICY "Allow service role to manage raw machine data" 
ON public.raw_machine_data 
FOR ALL 
TO service_role 
USING (true);
