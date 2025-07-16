
-- Phase 1: Enable Row Level Security on the two tables that are missing it

-- Enable RLS on water_level_snapshots table
ALTER TABLE public.water_level_snapshots ENABLE ROW LEVEL SECURITY;

-- Enable RLS on water_production_periods table  
ALTER TABLE public.water_production_periods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for water_level_snapshots (similar to other water tables)
CREATE POLICY "Allow service role full access to water level snapshots" 
ON public.water_level_snapshots 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow commercial users to view water level snapshots" 
ON public.water_level_snapshots 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
));

-- Create RLS policies for water_production_periods (similar to other production tables)
CREATE POLICY "Allow service role full access to water production periods" 
ON public.water_production_periods 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow commercial users to view water production periods" 
ON public.water_production_periods 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
));

-- Phase 2: Fix function search paths to prevent schema injection attacks

-- Update generate_invitation_token function
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$function$;

-- Update create_demo_sales_account function
CREATE OR REPLACE FUNCTION public.create_demo_sales_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    -- This function will be used to help create the demo account
    -- The actual user creation will need to be done through Supabase Auth
    -- But we can prepare the profiles table structure if needed
    
    -- Ensure we have the right role mappings
    -- The account will be created with role 'kumulus_personnel' which maps to 'commercial' in frontend
    
    RAISE NOTICE 'Demo account setup function created. Use Supabase Auth to create user kumulus@kumuluswater.com with role kumulus_personnel';
END;
$function$;

-- Update create_invitation function
CREATE OR REPLACE FUNCTION public.create_invitation(p_email text, p_role user_role, p_created_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Update reset_machine_metrics function
CREATE OR REPLACE FUNCTION public.reset_machine_metrics(p_machine_id text, p_admin_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Update get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = user_id;
$function$;
