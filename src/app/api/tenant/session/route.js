import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { verifyTenantCookie } from '@/lib/tenant-session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function GET() {
  try {
    const cookieStore = await cookies()
    const tenantCookie = cookieStore.get('tenant_session')

    if (!tenantCookie) return Response.json({ isTenant: false })

    const tenant = await verifyTenantCookie(tenantCookie.value)
    if (!tenant?.company_name) return Response.json({ isTenant: false })

    let fullName = tenant.full_name || null
    if (!fullName && tenant.email) {
      const { data } = await supabase
        .from('tenant_contacts')
        .select('full_name')
        .eq('email', tenant.email)
        .maybeSingle()
      fullName = data?.full_name || null
    }

    return Response.json({
      isTenant: true,
      email: tenant.email || null,
      full_name: fullName,
      company_name: tenant.company_name,
    })
  } catch {
    return Response.json({ isTenant: false })
  }
}
