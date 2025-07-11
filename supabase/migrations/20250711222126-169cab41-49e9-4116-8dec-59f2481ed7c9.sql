
-- Drop the existing restrictive policy for machine management
DROP POLICY IF EXISTS "Only kumulus personnel can manage machines" ON public.machines;

-- Create a new policy that allows both kumulus_personnel and kumulus_admin to manage machines
CREATE POLICY "Allow kumulus personnel and admin to manage machines" 
ON public.machines 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);

-- Also update the SELECT policy to be more explicit about admin access
DROP POLICY IF EXISTS "Clients can view their own machines" ON public.machines;

CREATE POLICY "Users can view machines based on role" 
ON public.machines 
FOR SELECT 
TO authenticated
USING (
  -- Clients can only see their own machines
  (client_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'client'
  ))
  OR
  -- Kumulus personnel and admins can see all machines
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  )
);
