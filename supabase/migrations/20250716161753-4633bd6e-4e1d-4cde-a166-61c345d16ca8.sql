
-- Create a function to get user profiles with auth emails for admin users
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
  
  -- Return the combined data
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.role,
    p.contact_email,
    p.contact_phone,
    p.created_at,
    au.email as auth_email
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Create a function to create new users (admin only)
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email text,
  p_password text,
  p_username text,
  p_role user_role,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  caller_role user_role;
BEGIN
  -- Get the caller's role
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  
  -- Only allow kumulus_admin to call this function
  IF caller_role != 'kumulus_admin' THEN
    RAISE EXCEPTION 'Only administrators can create users';
  END IF;
  
  -- Note: This function creates the profile, but user creation in auth.users
  -- must be handled on the frontend using Supabase Admin API
  
  RAISE EXCEPTION 'User creation must be handled through Supabase Admin API on frontend';
END;
$$;

-- Create a function to update user profiles (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_profile(
  p_user_id uuid,
  p_username text,
  p_role user_role,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role user_role;
BEGIN
  -- Get the caller's role
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  
  -- Only allow kumulus_admin to call this function
  IF caller_role != 'kumulus_admin' THEN
    RAISE EXCEPTION 'Only administrators can update user profiles';
  END IF;
  
  -- Prevent admin from changing their own role away from admin
  IF p_user_id = auth.uid() AND p_role != 'kumulus_admin' THEN
    RAISE EXCEPTION 'Administrators cannot change their own role';
  END IF;
  
  -- Update the profile
  UPDATE profiles 
  SET 
    username = p_username,
    role = p_role,
    contact_email = p_contact_email,
    contact_phone = p_contact_phone,
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Create a function to delete users (admin only)
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role user_role;
  target_role user_role;
  admin_count integer;
BEGIN
  -- Get the caller's role
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  
  -- Only allow kumulus_admin to call this function
  IF caller_role != 'kumulus_admin' THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;
  
  -- Prevent admin from deleting themselves
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot delete their own account';
  END IF;
  
  -- Get the target user's role
  SELECT role INTO target_role FROM profiles WHERE id = p_user_id;
  
  -- If deleting an admin, ensure at least one admin remains
  IF target_role = 'kumulus_admin' THEN
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'kumulus_admin' AND id != p_user_id;
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last administrator';
    END IF;
  END IF;
  
  -- Note: This function deletes the profile, but user deletion in auth.users
  -- must be handled on the frontend using Supabase Admin API
  DELETE FROM profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;
