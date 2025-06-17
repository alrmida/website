
-- First, let's create the demo account by calling the existing setup function
-- This will create the kumulus@demo.com account and personnel account
-- We'll then manually create the specific account you requested

-- Create the specific demo account for sales people
-- Note: We'll need to create this through the auth system, but first let's ensure we have the right setup

-- Let's create a function to help us set up the demo account
CREATE OR REPLACE FUNCTION create_demo_sales_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function will be used to help create the demo account
    -- The actual user creation will need to be done through Supabase Auth
    -- But we can prepare the profiles table structure if needed
    
    -- Ensure we have the right role mappings
    -- The account will be created with role 'kumulus_personnel' which maps to 'commercial' in frontend
    
    RAISE NOTICE 'Demo account setup function created. Use Supabase Auth to create user kumulus@kumuluswater.com with role kumulus_personnel';
END;
$$;

-- Execute the function
SELECT create_demo_sales_account();
