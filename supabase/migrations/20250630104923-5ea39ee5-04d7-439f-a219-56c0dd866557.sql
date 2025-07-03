
-- Create table for storing 15-minute water level snapshots
CREATE TABLE public.water_level_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  water_level_l NUMERIC,
  full_tank BOOLEAN,
  machine_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing calculated production periods
CREATE TABLE public.water_production_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  water_level_start NUMERIC,
  water_level_end NUMERIC,
  production_liters NUMERIC DEFAULT 0,
  period_status TEXT NOT NULL DEFAULT 'producing', -- 'producing', 'tank_full', 'transitioning', 'no_data'
  full_tank_start BOOLEAN DEFAULT FALSE,
  full_tank_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_water_level_snapshots_machine_timestamp ON public.water_level_snapshots(machine_id, timestamp_utc DESC);
CREATE INDEX idx_water_production_periods_machine_period ON public.water_production_periods(machine_id, period_start DESC);

-- Enable pg_cron extension for scheduling (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the water production calculation function to run every 15 minutes
SELECT cron.schedule(
  'water-production-calculation',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://dolkcmipdzqrtpaflvaf.supabase.co/functions/v1/calculate-water-production',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbGtjbWlwZHpxcnRwYWZsdmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4OTY2MDUsImV4cCI6MjA2NDQ3MjYwNX0.ezGW3OsanYsDSHireReMkeV_sEs3HzyfATzGLKHfQCc"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
