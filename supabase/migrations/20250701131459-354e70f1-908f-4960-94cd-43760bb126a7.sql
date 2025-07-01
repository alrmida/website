
-- Create table for storing water level snapshots every 30 minutes
CREATE TABLE IF NOT EXISTS public.simple_water_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  water_level_l NUMERIC NOT NULL,
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_simple_water_snapshots_machine_time 
ON public.simple_water_snapshots(machine_id, timestamp_utc DESC);

-- Create table for storing water production events (positive differences)
CREATE TABLE IF NOT EXISTS public.water_production_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  production_liters NUMERIC NOT NULL,
  previous_level NUMERIC NOT NULL,
  current_level NUMERIC NOT NULL,
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_water_production_events_machine_time 
ON public.water_production_events(machine_id, timestamp_utc DESC);

-- Enable Row Level Security
ALTER TABLE public.simple_water_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_production_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for snapshots
CREATE POLICY "Allow service role full access to snapshots" 
ON public.simple_water_snapshots 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow commercial users to view snapshots" 
ON public.simple_water_snapshots 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'kumulus_personnel'::user_role
));

-- Create RLS policies for production events
CREATE POLICY "Allow service role full access to production events" 
ON public.water_production_events 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow commercial users to view production events" 
ON public.water_production_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'kumulus_personnel'::user_role
));
