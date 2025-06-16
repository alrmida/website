
-- Add collector_ls1 field to raw_machine_data table to track pump events
ALTER TABLE public.raw_machine_data 
ADD COLUMN collector_ls1 INTEGER;

-- Create a new table to store calculated water production metrics persistently
CREATE TABLE public.water_production_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  calculation_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  calculation_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_water_produced DECIMAL NOT NULL DEFAULT 0,
  pump_cycles_count INTEGER NOT NULL DEFAULT 0,
  average_production_per_cycle DECIMAL NOT NULL DEFAULT 0,
  production_rate_lh DECIMAL NOT NULL DEFAULT 0,
  last_pump_event TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying by machine and time period
CREATE INDEX idx_water_production_metrics_machine_period 
ON public.water_production_metrics (machine_id, calculation_period_end DESC);

-- Add unique constraint to prevent duplicate calculations for the same period
CREATE UNIQUE INDEX idx_water_production_metrics_unique_period 
ON public.water_production_metrics (machine_id, calculation_period_start, calculation_period_end);

-- Enable RLS for the new table
ALTER TABLE public.water_production_metrics ENABLE ROW LEVEL SECURITY;

-- Policy to allow admin/commercial users to view metrics
CREATE POLICY "Allow admin and commercial users to view water production metrics" 
ON public.water_production_metrics 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel')
  )
);

-- Policy to allow service role to manage metrics (for batch processing)
CREATE POLICY "Allow service role to manage water production metrics" 
ON public.water_production_metrics 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
