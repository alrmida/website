-- Fix security vulnerability in data_ingestion_logs table
-- The current policy allows public access when it should only allow service role access

-- Drop the insecure policy
DROP POLICY IF EXISTS "Allow service role full access to ingestion logs" ON public.data_ingestion_logs;

-- Create a new policy that properly restricts access to service role only
CREATE POLICY "Allow service role full access to ingestion logs" 
ON public.data_ingestion_logs 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Also ensure the kumulus personnel policy is correctly restrictive
-- (This one was already correct but let's verify it exists)
DROP POLICY IF EXISTS "Allow kumulus personnel to view ingestion logs" ON public.data_ingestion_logs;

CREATE POLICY "Allow kumulus personnel to view ingestion logs" 
ON public.data_ingestion_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'kumulus_personnel'::user_role
  )
);

-- Add policy for kumulus_admin as well since they should also have access
CREATE POLICY "Allow kumulus admin to view ingestion logs" 
ON public.data_ingestion_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'kumulus_admin'::user_role
  )
);