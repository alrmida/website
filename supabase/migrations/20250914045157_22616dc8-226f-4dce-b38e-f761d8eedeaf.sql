-- Enable cron extension for scheduled aggregation
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule automatic production data aggregation every hour
SELECT cron.schedule(
  'auto-aggregate-production-data',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://dolkcmipdzqrtpaflvaf.supabase.co/functions/v1/aggregate-production-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbGtjbWlwZHpxcnRwYWZsdmFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg5NjYwNSwiZXhwIjoyMDY0NDcyNjA1fQ.PSZEJWHyF5hx5BRBbtyaeBT2k_lwzh8Y79TgXMKBJEk"}'::jsonb,
        body:='{"mode": "incremental"}'::jsonb
    ) as request_id;
  $$
);