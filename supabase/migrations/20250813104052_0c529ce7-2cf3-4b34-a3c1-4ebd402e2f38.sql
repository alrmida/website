-- Fix RLS policies for machine data tables to allow clients to access their own machine data

-- Update water_production_events policies
DROP POLICY IF EXISTS "Allow commercial users to view production events" ON public.water_production_events;

CREATE POLICY "Clients can view their own machine production events" 
ON public.water_production_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.machine_id = water_production_events.machine_id 
    AND m.client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
    )
  )
);

-- Update simple_water_snapshots policies  
DROP POLICY IF EXISTS "Allow commercial users to view snapshots" ON public.simple_water_snapshots;

CREATE POLICY "Clients can view their own machine water snapshots" 
ON public.simple_water_snapshots 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.machine_id = simple_water_snapshots.machine_id 
    AND m.client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
    )
  )
);

-- Add client access policies for water_level_snapshots
CREATE POLICY "Clients can view their own machine water level snapshots" 
ON public.water_level_snapshots 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.machine_id = water_level_snapshots.machine_id 
    AND m.client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
    )
  )
);

-- Add client access policies for water_production_metrics
CREATE POLICY "Clients can view their own machine production metrics" 
ON public.water_production_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.machine_id = water_production_metrics.machine_id 
    AND m.client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
    )
  )
);

-- Add client access policies for water_production_periods
CREATE POLICY "Clients can view their own machine production periods" 
ON public.water_production_periods 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.machine_id = water_production_periods.machine_id 
    AND m.client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
    )
  )
);

-- Add client access policies for raw_machine_data
CREATE POLICY "Clients can view their own machine raw data" 
ON public.raw_machine_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.machine_id = raw_machine_data.machine_id 
    AND m.client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'client'
    )
  )
);