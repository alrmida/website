
-- Update the machine ID from KU001619000097 to KU001619000079 to match InfluxDB data
-- This will fix the mismatch between database and InfluxDB machine identifiers

-- First, update the machines table
UPDATE public.machines 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Update any existing data in other tables to use the correct machine ID
-- Update simple_water_snapshots (though this should already have the correct ID from InfluxDB)
UPDATE public.simple_water_snapshots 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Update raw_machine_data
UPDATE public.raw_machine_data 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Update water_production_events
UPDATE public.water_production_events 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Update water_level_snapshots
UPDATE public.water_level_snapshots 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Update water_production_periods
UPDATE public.water_production_periods 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Update water_production_metrics
UPDATE public.water_production_metrics 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Update data_ingestion_logs
UPDATE public.data_ingestion_logs 
SET machine_id = 'KU001619000079' 
WHERE machine_id = 'KU001619000097';

-- Create a cron job to run get-machine-data every 5 minutes with the correct UID
SELECT cron.schedule(
  'get-machine-data-every-5min',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://dolkcmipdzqrtpaflvaf.supabase.co/functions/v1/get-machine-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbGtjbWlwZHpxcnRwYWZsdmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4OTY2MDUsImV4cCI6MjA2NDQ3MjYwNX0.ezGW3OsanYsDSHireReMkeV_sEs3HzyfATzGLKHfQCc"}'::jsonb,
        body:='{"uid": "353636343034510C003F0046", "scheduled": true}'::jsonb
    ) as request_id;  
  $$
);
