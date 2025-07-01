
-- Add RLS policy to allow kumulus personnel to delete raw machine data
CREATE POLICY "Allow kumulus personnel to delete raw machine data" 
ON public.raw_machine_data 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'kumulus_personnel'::user_role
  )
);
