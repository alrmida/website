
-- Create function to reset water production metrics for a specific machine (admin only)
CREATE OR REPLACE FUNCTION public.reset_machine_metrics(p_machine_id text, p_admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user has admin permissions
  IF public.get_user_role(p_admin_user_id) != 'kumulus_personnel' THEN
    RAISE EXCEPTION 'Only kumulus personnel can reset machine metrics';
  END IF;
  
  -- Delete all water production metrics for the specified machine
  DELETE FROM public.water_production_metrics
  WHERE machine_id = p_machine_id;
  
  -- Log the reset action
  RAISE NOTICE 'Water production metrics reset for machine: % by admin: %', p_machine_id, p_admin_user_id;
END;
$function$
