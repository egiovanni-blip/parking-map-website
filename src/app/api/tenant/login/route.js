import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body.email?.toLowerCase().trim()
    const password = body.password

    if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 })
    if (!password) return Response.json({ error: 'Password is required.' }, { status: 400 })

    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_contacts')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return Response.json({ error: 'Email not found. Please contact your property manager.' }, { status: 404 })
    }

    if (!tenant.password_hash) {
      return Response.json({ error: 'No password set for this account. Please set your password first.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, tenant.password_hash)
    if (!valid) {
      return Response.json({ error: 'Incorrect password. Please try again.' }, { status: 401 })
    }

    const cookieValue = JSON.stringify({
      email: tenant.email,
      company_name: tenant.company_name
    })

    const cookieStore = await cookies()
    cookieStore.set('tenant_session', encodeURIComponent(cookieValue), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    })

    return Response.json({ success: true })

  } catch (err) {
    console.error('Tenant login error:', err.message)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
