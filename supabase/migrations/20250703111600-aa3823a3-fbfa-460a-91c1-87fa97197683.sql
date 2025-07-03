
-- Add event_type column to water_production_events table to distinguish between production and drainage events
ALTER TABLE public.water_production_events 
ADD COLUMN event_type TEXT DEFAULT 'production';

-- Add index for better query performance on event types
CREATE INDEX idx_water_production_events_event_type ON public.water_production_events(event_type);

-- Add index for better query performance on machine_id and timestamp
CREATE INDEX idx_water_production_events_machine_timestamp ON public.water_production_events(machine_id, timestamp_utc DESC);
