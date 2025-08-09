
-- Fix RLS policies to include kumulus_admin role for raw_machine_data
DROP POLICY IF EXISTS "Allow admin and commercial users to view raw machine data" ON public.raw_machine_data;
CREATE POLICY "Allow admin and commercial users to view raw machine data" 
ON public.raw_machine_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- Fix RLS policies for simple_water_snapshots
DROP POLICY IF EXISTS "Allow commercial users to view snapshots" ON public.simple_water_snapshots;
CREATE POLICY "Allow commercial users to view snapshots" 
ON public.simple_water_snapshots 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- Fix RLS policies for water_production_events
DROP POLICY IF EXISTS "Allow commercial users to view production events" ON public.water_production_events;
CREATE POLICY "Allow commercial users to view production events" 
ON public.water_production_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- Fix RLS policies for water_production_metrics
DROP POLICY IF EXISTS "Allow admin and commercial users to view water production metri" ON public.water_production_metrics;
CREATE POLICY "Allow admin and commercial users to view water production metri" 
ON public.water_production_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);
