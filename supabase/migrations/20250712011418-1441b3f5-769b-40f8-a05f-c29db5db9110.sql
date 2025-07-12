
-- Update machine_id from KU001619000079 to KU001619000097 in all data tables

-- Update machines table
UPDATE public.machines 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';

-- Update raw_machine_data table
UPDATE public.raw_machine_data 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';

-- Update water_production_events table
UPDATE public.water_production_events 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';

-- Update simple_water_snapshots table
UPDATE public.simple_water_snapshots 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';

-- Update water_level_snapshots table (if any records exist)
UPDATE public.water_level_snapshots 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';

-- Update water_production_periods table (if any records exist)
UPDATE public.water_production_periods 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';

-- Update water_production_metrics table (if any records exist)
UPDATE public.water_production_metrics 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';

-- Update data_ingestion_logs table (if any records exist)
UPDATE public.data_ingestion_logs 
SET machine_id = 'KU001619000097' 
WHERE machine_id = 'KU001619000079';
