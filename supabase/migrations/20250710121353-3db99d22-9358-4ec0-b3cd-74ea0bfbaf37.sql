
-- Add microcontroller_uid column to machines table
ALTER TABLE public.machines 
ADD COLUMN microcontroller_uid TEXT;

-- Create index on microcontroller_uid for fast lookups
CREATE INDEX idx_machines_microcontroller_uid ON public.machines(microcontroller_uid);

-- Update the existing machine with its UID
UPDATE public.machines 
SET microcontroller_uid = '353636343034510C003F0046'
WHERE machine_id = 'KU001619000079';

-- Add a comment to document the column
COMMENT ON COLUMN public.machines.microcontroller_uid IS 'Unique identifier from the machine microcontroller, used to filter InfluxDB data by uid tag';
