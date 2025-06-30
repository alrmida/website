
-- Add the new enum value first (this needs to be in its own transaction)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'kumulus_admin';
