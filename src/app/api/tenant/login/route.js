import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 })

    // 1. Check if email exists in tenant_contacts
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_contacts')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return Response.json({ error: 'Email not found. Please contact your property manager.' }, { status: 404 })
    }

    // 2. Send magic link via Supabase (user must already exist and be confirmed)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/tenant/verify`,
        shouldCreateUser: false
      }
    })

    if (otpError) {
      console.error('OTP error:', otpError)
      return Response.json({ error: 'Failed to send magic link. Make sure your email is registered.' }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err) {
    console.error('Tenant login error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}