
-- Insert the missing water production event from this morning
INSERT INTO public.water_production_events (
  machine_id,
  production_liters,
  previous_level,
  current_level,
  timestamp_utc,
  event_type
) VALUES (
  'KU001619000079',
  1.9,
  1.5,
  3.4,
  '2025-01-03 09:30:00+00:00',
  'production'
);
