
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

    console.log('Starting comprehensive cleanup...')
    
    // Step 1: Delete all machines first (this removes foreign key dependencies)
    const { error: deleteMachinesError } = await supabaseAdmin
      .from('machines')
      .delete()
      .neq('id', 0) // Delete all

    if (deleteMachinesError) {
      console.log('Error deleting machines:', deleteMachinesError)
    } else {
      console.log('All machines deleted successfully')
    }

    // Step 2: Delete all profiles (except the real admin account)
    const { error: deleteProfilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .neq('username', 'mksibi@kumuluswater.com') // Keep only the real admin

    if (deleteProfilesError) {
      console.log('Error deleting profiles:', deleteProfilesError)
    } else {
      console.log('Demo profiles deleted successfully')
    }

    // Step 3: Get all existing demo users and delete them (except real admin)
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

    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('Creating new demo accounts...')

    // Step 4: Create the Kumulus client account
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
      throw new Error(`Failed to create Kumulus account: ${kumulusSignUpError.message}`)
    } else {
      console.log(`Created Kumulus client account`)
    }

    // Step 5: Create Kumulus personnel account
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
      throw new Error(`Failed to create Kumulus personnel account: ${personnelSignUpError.message}`)
    } else {
      console.log(`Created Kumulus personnel account`)
    }

    // Step 6: Create the specific sales demo account
    const { data: salesUser, error: salesSignUpError } = await supabaseAdmin.auth.admin.createUser({
      email: 'kumulus@kumuluswater.com',
      password: '000000',
      user_metadata: {
        username: 'KumulusSales',
        role: 'kumulus_personnel'
      },
      email_confirm: true
    })

    if (salesSignUpError) {
      console.log(`Error creating sales demo account:`, salesSignUpError.message)
      throw new Error(`Failed to create sales demo account: ${salesSignUpError.message}`)
    } else {
      console.log(`Created sales demo account`)
    }

    // Step 7: Wait for profiles to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Step 8: Verify the Kumulus client profile exists and get it
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', 'Kumulus')

    if (profilesError) {
      console.log('Error fetching profiles:', profilesError)
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      console.log('No Kumulus profile found, waiting longer...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Try again
      const { data: retryProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .eq('username', 'Kumulus')
      
      if (!retryProfiles || retryProfiles.length === 0) {
        throw new Error('Kumulus profile was not created by the trigger')
      }
      
      console.log('Found Kumulus profile on retry')
    }

    const kumulusClient = profiles[0]
    console.log('Using Kumulus client profile:', kumulusClient)

    // Step 9: Create the real machine
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
      throw new Error(`Failed to create machine: ${machineError.message}`)
    } else {
      console.log('Created machine successfully:', machineData)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Demo accounts and real machine setup completed successfully',
        created: {
          client: 'Kumulus',
          personnel: 'Kumulus1',
          sales: 'KumulusSales (kumulus@kumuluswater.com)',
          machine: 'KU001619000079'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.log('Setup error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
