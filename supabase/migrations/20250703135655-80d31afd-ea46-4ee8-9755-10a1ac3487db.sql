
-- Delete the incorrectly dated manual entry from January 3rd, 2025
DELETE FROM public.water_production_events 
WHERE machine_id = 'KU001619000079' 
  AND production_liters = 1.9 
  AND previous_level = 1.5 
  AND current_level = 3.4 
  AND timestamp_utc = '2025-01-03 09:30:00+00:00';

-- Insert the corrected water production event for today (July 3rd, 2025)
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
  '2025-07-03 09:30:00+00:00',
  'production'
);
