import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body.email?.toLowerCase().trim()
    
    console.log('Step 1: Email received:', email)

    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 })

    // Check tenant_contacts
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_contacts')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    console.log('Step 2: Tenant lookup:', tenant?.company_name, tenantError?.message)

    if (tenantError || !tenant) {
      return Response.json({ error: 'Email not found. Please contact your property manager.' }, { status: 404 })
    }

    // Send magic link
    console.log('Step 3: Sending OTP...')
    
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `https://therepublicmap.netlify.app/tenant/callback`,
        shouldCreateUser: false
      }
    })

    console.log('Step 4: OTP result:', otpError?.message || 'success')

    if (otpError) {
      return Response.json({ error: otpError.message }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err) {
    console.error('Tenant login error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}