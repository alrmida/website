
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Setting up demo accounts');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create admin account
    const adminEmail = 'mksibi@kumuluswater.com';
    const adminPassword = 'KumulusAdmin2024!';

    console.log('Creating admin account:', adminEmail);

    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        username: 'Kumulus Admin',
        role: 'kumulus_admin'
      }
    });

    if (adminError && !adminError.message.includes('already registered')) {
      console.error('Error creating admin user:', adminError);
      throw adminError;
    }

    // Create sales account
    const salesEmail = 'kumulus@kumuluswater.com';
    const salesPassword = 'KumulusSales2024!';

    console.log('Creating sales account:', salesEmail);

    const { data: salesUser, error: salesError } = await supabase.auth.admin.createUser({
      email: salesEmail,
      password: salesPassword,
      email_confirm: true,
      user_metadata: {
        username: 'Kumulus Sales',
        role: 'kumulus_personnel'
      }
    });

    if (salesError && !salesError.message.includes('already registered')) {
      console.error('Error creating sales user:', salesError);
      throw salesError;
    }

    // Create a sample machine for testing
    const sampleMachine = {
      machine_id: 'KU001619000001',
      name: 'Demo Amphore',
      location: 'Demo Location',
      machine_model: 'Amphore',
      microcontroller_uid: '353636343034510C003F0046',
      purchase_date: '2024-01-01',
      client_id: null,
      manager_id: adminUser?.user?.id || null
    };

    console.log('Creating sample machine:', sampleMachine.machine_id);

    const { error: machineError } = await supabase
      .from('machines')
      .upsert([sampleMachine], { onConflict: 'machine_id' });

    if (machineError) {
      console.error('Error creating sample machine:', machineError);
    }

    console.log('✅ Demo accounts setup completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo accounts created successfully',
        accounts: {
          admin: {
            email: adminEmail,
            password: adminPassword,
            role: 'kumulus_admin'
          },
          sales: {
            email: salesEmail,
            password: salesPassword,
            role: 'kumulus_personnel'
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error setting up demo accounts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to setup demo accounts', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
