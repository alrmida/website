
-- Add missing columns to raw_machine_data table to match Node-RED payload
ALTER TABLE public.raw_machine_data 
ADD COLUMN IF NOT EXISTS exhaust_rh_pct numeric,
ADD COLUMN IF NOT EXISTS frost_identified boolean,
ADD COLUMN IF NOT EXISTS defrosting boolean,
ADD COLUMN IF NOT EXISTS eev_position integer,
ADD COLUMN IF NOT EXISTS time_seconds numeric;

-- Add comments to document the new columns
COMMENT ON COLUMN public.raw_machine_data.exhaust_rh_pct IS 'Exhaust relative humidity percentage from Node-RED raw[5]';
COMMENT ON COLUMN public.raw_machine_data.frost_identified IS 'Frost identification status from Node-RED raw[15]';
COMMENT ON COLUMN public.raw_machine_data.defrosting IS 'Defrosting status from Node-RED raw[16]';
COMMENT ON COLUMN public.raw_machine_data.eev_position IS 'Electronic Expansion Valve position from Node-RED raw[17]';
COMMENT ON COLUMN public.raw_machine_data.time_seconds IS 'Time in seconds from Node-RED raw[0]';
