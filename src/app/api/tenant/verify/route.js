import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Log all params to see what Supabase is sending
    const token_hash = searchParams.get('token_hash')
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const code = searchParams.get('code')
    
    console.log('Verify params:', { token_hash, token, type, code })

    // Try token_hash first (newer Supabase format)
    if (token_hash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type || 'magiclink'
      })
      
      console.log('token_hash verify result:', data?.user?.email, error?.message)
      
      if (!error && data?.user) {
        return await setSessionAndRedirect(request, data.user.email)
      }
    }

    // Try token (older format)
    if (token) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type || 'magiclink'
      })
      
      console.log('token verify result:', data?.user?.email, error?.message)
      
      if (!error && data?.user) {
        return await setSessionAndRedirect(request, data.user.email)
      }
    }

    // Try code (PKCE flow)
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('code verify result:', data?.user?.email, error?.message)
      
      if (!error && data?.user) {
        return await setSessionAndRedirect(request, data.user.email)
      }
    }

    console.log('All verification methods failed')
    return Response.redirect(new URL('/tenant/login?error=invalid', request.url))

  } catch (err) {
    console.error('Tenant verify error:', err.message)
    return Response.redirect(new URL('/tenant/login?error=invalid', request.url))
  }
}

async function setSessionAndRedirect(request, email) {
  const { data: tenant, error: tenantError } = await supabase
    .from('tenant_contacts')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  console.log('Tenant lookup:', tenant?.company_name, tenantError?.message)

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
}