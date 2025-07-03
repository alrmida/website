
-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension for HTTP requests if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the water production tracking function to run every 15 minutes
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
