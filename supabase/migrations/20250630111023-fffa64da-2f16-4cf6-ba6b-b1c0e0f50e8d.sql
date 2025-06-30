
-- Update the profiles for the three specific users
-- Admin user (mksibi@kumuluswater.com)
UPDATE public.profiles 
SET role = 'kumulus_admin'
WHERE contact_email = 'mksibi@kumuluswater.com' 
   OR username LIKE '%mksibi%';

-- Client user (kumulus@kumuluswater.com) 
UPDATE public.profiles 
SET role = 'client'
WHERE contact_email = 'kumulus@kumuluswater.com' 
   OR username LIKE '%kumulus@kumuluswater.com%';

-- Sales user (sales@kumuluswater.com)
UPDATE public.profiles 
SET role = 'kumulus_personnel'
WHERE contact_email = 'sales@kumuluswater.com' 
   OR username LIKE '%sales%';

-- Clean up any duplicate or test profiles that might exist
-- Remove any profiles that don't match our three main users
DELETE FROM public.profiles 
WHERE contact_email NOT IN ('mksibi@kumuluswater.com', 'kumulus@kumuluswater.com', 'sales@kumuluswater.com')
  AND username NOT LIKE '%mksibi%'
  AND username NOT LIKE '%kumulus@kumuluswater.com%' 
  AND username NOT LIKE '%sales%'
  AND username NOT IN ('mksibi@kumuluswater.com', 'kumulus@kumuluswater.com', 'sales@kumuluswater.com');

-- Update the role mapping function to handle the new kumulus_admin role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Update invitation creation function to support kumulus_admin role
CREATE OR REPLACE FUNCTION public.create_invitation(p_email text, p_role user_role, p_created_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_id UUID;
  invitation_token TEXT;
  creator_role user_role;
BEGIN
  -- Get the creator's role
  SELECT role INTO creator_role FROM public.profiles WHERE id = p_created_by;
  
  -- Check if user has permission to create invitations
  IF creator_role NOT IN ('kumulus_personnel', 'kumulus_admin') THEN
    RAISE EXCEPTION 'Only kumulus personnel and admins can create invitations';
  END IF;
  
  -- Generate token
  invitation_token := public.generate_invitation_token();
  
  -- Insert invitation
  INSERT INTO public.invitations (email, role, token, expires_at, created_by)
  VALUES (p_email, p_role, invitation_token, NOW() + INTERVAL '7 days', p_created_by)
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$;

-- Update reset machine metrics function to allow kumulus_admin
CREATE OR REPLACE FUNCTION public.reset_machine_metrics(p_machine_id text, p_admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val FROM public.profiles WHERE id = p_admin_user_id;
  
  -- Check if user has admin permissions
  IF user_role_val NOT IN ('kumulus_personnel', 'kumulus_admin') THEN
    RAISE EXCEPTION 'Only kumulus personnel and admins can reset machine metrics';
  END IF;
  
  -- Delete all water production metrics for the specified machine
  DELETE FROM public.water_production_metrics
  WHERE machine_id = p_machine_id;
  
  -- Log the reset action
  RAISE NOTICE 'Water production metrics reset for machine: % by admin: %', p_machine_id, p_admin_user_id;
END;
$$;
