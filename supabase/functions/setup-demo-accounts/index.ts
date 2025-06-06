
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

    console.log('Cleaning up existing demo accounts and machines...')
    
    // Delete all existing machines first
    const { error: deleteMachinesError } = await supabaseAdmin
      .from('machines')
      .delete()
      .neq('id', 0) // Delete all

    if (deleteMachinesError) {
      console.log('Error deleting machines:', deleteMachinesError)
    }

    // Get all existing demo users to delete
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    
    if (existingUsers?.users) {
      for (const user of existingUsers.users) {
        // Delete users that are demo accounts (exclude the real mehdi account)
        if (user.email && !user.email.includes('mksibi@kumuluswater.com')) {
          const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
          if (deleteUserError) {
            console.log(`Could not delete user ${user.email}:`, deleteUserError.message)
          } else {
            console.log(`Deleted user: ${user.email}`)
          }
        }
      }
    }

    // Create only the Kumulus client account
    const { data: kumulusUser, error: kumulusSignUpError } = await supabaseAdmin.auth.admin.createUser({
      email: 'kumulus@demo.com',
      password: '0000',
      user_metadata: {
        username: 'Kumulus',
        role: 'client'
      },
      email_confirm: true
    })

    if (kumulusSignUpError) {
      console.log(`Error creating Kumulus account:`, kumulusSignUpError.message)
    } else {
      console.log(`Created Kumulus client account`)
    }

    // Create Kumulus personnel account
    const { data: kumulusPersonnelUser, error: personnelSignUpError } = await supabaseAdmin.auth.admin.createUser({
      email: 'kumulus1@demo.com',
      password: '0000',
      user_metadata: {
        username: 'Kumulus1',
        role: 'kumulus_personnel'
      },
      email_confirm: true
    })

    if (personnelSignUpError) {
      console.log(`Error creating Kumulus personnel account:`, personnelSignUpError.message)
    } else {
      console.log(`Created Kumulus personnel account`)
    }

    // Wait a moment for the profiles to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Get the Kumulus client profile to assign the machine
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', 'Kumulus')

    if (profiles && profiles.length > 0) {
      const kumulusClient = profiles[0]

      // Insert only the real machine
      const { data: machineData, error: machineError } = await supabaseAdmin
        .from('machines')
        .insert({
          machine_id: 'KU001619000079',
          name: 'Amphore Live Unit',
          location: 'KUMULUS Office - Paris',
          client_id: kumulusClient.id
        })
        .select()

      if (machineError) {
        console.log('Error creating machine:', machineError)
      } else {
        console.log('Created machine:', machineData)
      }
    }

    return new Response(
      JSON.stringify({ message: 'Demo accounts and real machine setup completed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.log('Setup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
