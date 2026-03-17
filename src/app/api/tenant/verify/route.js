import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    console.log('Verify params:', JSON.stringify({ token_hash, token: token?.substring(0,10), type, code, error }))

    if (error) {
      console.log('Error from Supabase:', error_description)
      return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
    }

    let userEmail = null

    // Try token_hash (PKCE)
    if (token_hash) {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type || 'magiclink'
      })
      console.log('token_hash result:', data?.user?.email, verifyError?.message)
      if (!verifyError && data?.user) userEmail = data.user.email
    }

    // Try raw token
    if (!userEmail && token) {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type || 'magiclink'
      })
      console.log('token result:', data?.user?.email, verifyError?.message)
      if (!verifyError && data?.user) userEmail = data.user.email
    }

    // Try code exchange
    if (!userEmail && code) {
      const { data, error: verifyError } = await supabase.auth.exchangeCodeForSession(code)
      console.log('code result:', data?.user?.email, verifyError?.message)
      if (!verifyError && data?.user) userEmail = data.user.email
    }

    if (!userEmail) {
      console.log('Could not verify user')
      return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
    }

    // Look up company
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_contacts')
      .select('*')
      .eq('email', userEmail)
      .eq('is_active', true)
      .single()

    console.log('Tenant:', tenant?.company_name, tenantError?.message)

    if (tenantError || !tenant) {
      return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
    }

    const response = Response.redirect(new URL('/floor/2', request.url))
    const cookieValue = JSON.stringify({
      email: tenant.email,
      company_name: tenant.company_name
    })

    response.headers.set(
      'Set-Cookie',
      `tenant_session=${encodeURIComponent(cookieValue)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax`
    )

    return response

  } catch (err) {
    console.error('Verify error:', err.message)
    return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
  }
}