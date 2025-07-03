
-- Update the cron job schedule from 30 minutes to 15 minutes
SELECT cron.unschedule('track-water-production-every-30min');

-- Schedule the water production tracking function to run every 15 minutes instead of 30
SELECT cron.schedule(
  'track-water-production-every-15min',
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

-- Also update the calculate-water-production cron job to run every 15 minutes
SELECT cron.unschedule('water-production-calculation');

-- Schedule the water production calculation function to run every 15 minutes
SELECT cron.schedule(
  'water-production-calculation-15min',
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
