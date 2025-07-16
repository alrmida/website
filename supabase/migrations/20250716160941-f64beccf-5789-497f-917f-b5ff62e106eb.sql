
-- Update the RLS policy to allow both kumulus_personnel AND kumulus_admin to view all profiles
DROP POLICY IF EXISTS "Kumulus personnel can view all profiles" ON public.profiles;

CREATE POLICY "Kumulus personnel and admin can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'kumulus_personnel' OR 
  get_user_role(auth.uid()) = 'kumulus_admin'
);
