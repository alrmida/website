
-- Update cron jobs to work with the new dynamic machine processing
-- The edge functions now process all machines automatically, so no changes needed to cron job calls

-- First, let's clean up any old cron jobs that might have machine-specific parameters
SELECT cron.unschedule('track-water-production-every-15min');
SELECT cron.unschedule('water-production-calculation-15min');

-- Schedule the water production tracking function to run every 15 minutes
-- This will now process ALL machines dynamically
SELECT cron.schedule(
  'track-water-production-dynamic',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://dolkcmipdzqrtpaflvaf.supabase.co/functions/v1/track-water-production',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbGtjbWlwZHpxcnRwYWZsdmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4OTY2MDUsImV4cCI6MjA2NDQ3MjYwNX0.ezGW3OsanYsDSHireReMkeV_sEs3HzyfATzGLKHfQCc"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;  
  $$
);

-- Schedule the water production calculation function to run every 15 minutes
-- This will now process ALL machines dynamically
SELECT cron.schedule(
  'water-production-calculation-dynamic',
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

-- Add a comment to track this change
COMMENT ON SCHEMA public IS 'Updated cron jobs to use dynamic machine processing - no more hardcoded machine IDs';
