import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Demo accounts data - keeping fewer accounts
    const demoAccounts = [
      { email: 'client1@demo.com', username: 'client1', role: 'client' },
      { email: 'kumulus1@demo.com', username: 'Kumulus1', role: 'kumulus_personnel' }
    ]

    // Create demo accounts
    for (const account of demoAccounts) {
      const { data: user, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: '0000',
        user_metadata: {
          username: account.username,
          role: account.role
        },
        email_confirm: true
      })

      if (signUpError) {
        console.log(`Account ${account.email} might already exist:`, signUpError.message)
      } else {
        console.log(`Created account: ${account.email}`)
      }
    }

    // Get client user ID to assign the real machine
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', 'client1')

    if (profiles && profiles.length > 0) {
      const client1 = profiles.find(p => p.username === 'client1')

      // Only keep the real machine with live data
      if (client1) {
        // First, delete all existing machines to clean up
        await supabaseAdmin
          .from('machines')
          .delete()
          .neq('id', 0) // Delete all

        // Insert only the real machine
        await supabaseAdmin
          .from('machines')
          .insert({
            machine_id: 'KU001619000079',
            name: 'Amphore Live Unit',
            location: 'KUMULUS Office - Paris',
            client_id: client1.id
          })
      }
    }

    return new Response(
      JSON.stringify({ message: 'Demo accounts and real machine setup completed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
