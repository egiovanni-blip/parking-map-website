import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (!token_hash) {
      return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
    }

    // 1. Verify the token with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type || 'magiclink'
    })

    if (error || !data?.user) {
      return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
    }

    // 2. Look up company from tenant_contacts
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_contacts')
      .select('*')
      .eq('email', data.user.email)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
    }

    // 3. Set cookie and redirect to map
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
    console.error('Tenant verify error:', err)
    return Response.redirect(new URL('/tenant/login?error=server', request.url))
  }
}
