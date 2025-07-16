
-- Fix the get_users_with_auth_emails function to handle type casting properly
CREATE OR REPLACE FUNCTION get_users_with_auth_emails()
RETURNS TABLE (
  id uuid,
  username text,
  role user_role,
  contact_email text,
  contact_phone text,
  created_at timestamptz,
  auth_email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role user_role;
BEGIN
  -- Get the caller's role
  SELECT p.role INTO caller_role FROM profiles p WHERE p.id = auth.uid();
  
  -- Only allow kumulus_admin to call this function
  IF caller_role != 'kumulus_admin' THEN
    RAISE EXCEPTION 'Only administrators can access user management data';
  END IF;
  
  -- Return the combined data with proper type casting
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.role,
    p.contact_email,
    p.contact_phone,
    p.created_at,
    au.email::text as auth_email
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;
