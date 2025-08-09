
-- 1) raw_machine_data: allow admins and personnel to SELECT
DROP POLICY IF EXISTS "Allow admin and commercial users to view raw machine data" ON public.raw_machine_data;

CREATE POLICY "Allow admin and commercial users to view raw machine data"
ON public.raw_machine_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- Also allow admins to DELETE raw machine data (optional improvement)
DROP POLICY IF EXISTS "Allow kumulus personnel to delete raw machine data" ON public.raw_machine_data;

CREATE POLICY "Allow personnel and admins to delete raw machine data"
ON public.raw_machine_data
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- 2) simple_water_snapshots: allow admins and personnel to SELECT
DROP POLICY IF EXISTS "Allow commercial users to view snapshots" ON public.simple_water_snapshots;

CREATE POLICY "Allow admin and commercial users to view snapshots"
ON public.simple_water_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- 3) water_production_events: allow admins and personnel to SELECT
DROP POLICY IF EXISTS "Allow commercial users to view production events" ON public.water_production_events;

CREATE POLICY "Allow admin and commercial users to view production events"
ON public.water_production_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- 4) water_production_metrics: fix existing policy to include admins in the IN list
DROP POLICY IF EXISTS "Allow admin and commercial users to view water production metrics" ON public.water_production_metrics;

CREATE POLICY "Allow admin and commercial users to view water production metrics"
ON public.water_production_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);
