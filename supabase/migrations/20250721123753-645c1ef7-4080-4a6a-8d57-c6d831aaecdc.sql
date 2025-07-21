
-- Create the machine_microcontrollers table to track UID assignments over time
CREATE TABLE public.machine_microcontrollers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id INTEGER NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  microcontroller_uid TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMP WITH TIME ZONE NULL,
  assigned_by UUID REFERENCES auth.users(id),
  unassigned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_machine_microcontrollers_machine_id ON public.machine_microcontrollers(machine_id);
CREATE INDEX idx_machine_microcontrollers_uid ON public.machine_microcontrollers(microcontroller_uid);
CREATE INDEX idx_machine_microcontrollers_active ON public.machine_microcontrollers(machine_id, assigned_at, unassigned_at);

-- Add RLS policies for the new table
ALTER TABLE public.machine_microcontrollers ENABLE ROW LEVEL SECURITY;

-- Allow kumulus personnel and admin to manage microcontroller assignments
CREATE POLICY "Allow kumulus personnel and admin to manage microcontroller assignments" 
  ON public.machine_microcontrollers 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
  ));

-- Users can view microcontroller assignments based on machine access
CREATE POLICY "Users can view microcontroller assignments based on machine access" 
  ON public.machine_microcontrollers 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM machines m
      WHERE m.id = machine_microcontrollers.machine_id
      AND (
        (m.client_id = auth.uid() AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'client'
        ))
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('kumulus_personnel', 'kumulus_admin')
        )
      )
    )
  );

-- Migrate existing microcontroller_uid data to the new table
INSERT INTO public.machine_microcontrollers (machine_id, microcontroller_uid, assigned_at, assigned_by)
SELECT 
  id as machine_id,
  microcontroller_uid,
  COALESCE(created_at, now()) as assigned_at,
  NULL as assigned_by
FROM public.machines 
WHERE microcontroller_uid IS NOT NULL AND microcontroller_uid != '';

-- Create helper functions for UID management
CREATE OR REPLACE FUNCTION public.get_current_microcontroller_uid(p_machine_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_uid TEXT;
BEGIN
  SELECT microcontroller_uid INTO current_uid
  FROM public.machine_microcontrollers
  WHERE machine_id = p_machine_id
    AND unassigned_at IS NULL
  ORDER BY assigned_at DESC
  LIMIT 1;
  
  RETURN current_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_machine_id_from_uid(p_uid TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  machine_id INTEGER;
BEGIN
  SELECT mc.machine_id INTO machine_id
  FROM public.machine_microcontrollers mc
  WHERE mc.microcontroller_uid = p_uid
    AND mc.unassigned_at IS NULL
  ORDER BY mc.assigned_at DESC
  LIMIT 1;
  
  RETURN machine_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_microcontroller_uid(
  p_machine_id INTEGER,
  p_microcontroller_uid TEXT,
  p_assigned_by UUID DEFAULT auth.uid(),
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_val user_role;
  assignment_id UUID;
BEGIN
  -- Check permissions
  SELECT role INTO user_role_val FROM public.profiles WHERE id = p_assigned_by;
  IF user_role_val NOT IN ('kumulus_personnel', 'kumulus_admin') THEN
    RAISE EXCEPTION 'Only kumulus personnel and admins can assign microcontroller UIDs';
  END IF;
  
  -- Unassign any existing UID for this machine
  UPDATE public.machine_microcontrollers 
  SET unassigned_at = now(), unassigned_by = p_assigned_by
  WHERE machine_id = p_machine_id AND unassigned_at IS NULL;
  
  -- Unassign this UID from any other machine
  UPDATE public.machine_microcontrollers 
  SET unassigned_at = now(), unassigned_by = p_assigned_by
  WHERE microcontroller_uid = p_microcontroller_uid AND unassigned_at IS NULL;
  
  -- Create new assignment
  INSERT INTO public.machine_microcontrollers (
    machine_id, microcontroller_uid, assigned_by, notes
  ) VALUES (
    p_machine_id, p_microcontroller_uid, p_assigned_by, p_notes
  ) RETURNING id INTO assignment_id;
  
  RETURN assignment_id;
END;
$$;

-- Remove the microcontroller_uid column from machines table (after migration)
ALTER TABLE public.machines DROP COLUMN microcontroller_uid;

-- Add a comment to document the new architecture
COMMENT ON TABLE public.machine_microcontrollers IS 'Tracks the assignment of microcontroller UIDs to machines over time, supporting UID lifecycle management';
