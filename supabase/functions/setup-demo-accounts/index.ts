
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

    // Demo accounts data
    const demoAccounts = [
      { email: 'client1@demo.com', username: 'client1', role: 'client' },
      { email: 'client2@demo.com', username: 'client2', role: 'client' },
      { email: 'client3@demo.com', username: 'client3', role: 'client' },
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

    // Get client user IDs to assign machines
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .in('username', ['client1', 'client2', 'client3'])

    if (profiles && profiles.length > 0) {
      const client1 = profiles.find(p => p.username === 'client1')
      const client2 = profiles.find(p => p.username === 'client2')
      const client3 = profiles.find(p => p.username === 'client3')

      // Update machines with correct client assignments using official KUMULUS IDs
      const machineAssignments = [
        { machine_id: 'KU001619000001', client_id: client1?.id },
        { machine_id: 'KU001619000002', client_id: client2?.id },
        { machine_id: 'KU001619000003', client_id: client2?.id },
        { machine_id: 'KU001619000004', client_id: client3?.id },
        { machine_id: 'KU001619000005', client_id: client3?.id },
        { machine_id: 'KU001619000006', client_id: client3?.id }
      ]

      for (const assignment of machineAssignments) {
        if (assignment.client_id) {
          await supabaseAdmin
            .from('machines')
            .update({ client_id: assignment.client_id })
            .eq('machine_id', assignment.machine_id)
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Demo accounts setup completed' }),
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
