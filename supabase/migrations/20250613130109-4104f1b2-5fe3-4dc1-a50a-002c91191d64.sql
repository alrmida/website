
-- Check if RLS is enabled and add policies for raw_machine_data table
-- First, let's make sure the service role can access the data
CREATE POLICY "Allow service role full access to raw machine data" 
ON public.raw_machine_data 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow authenticated admin/commercial users to view raw data
CREATE POLICY "Allow admin and commercial users to view raw machine data" 
ON public.raw_machine_data 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel')
  )
);
