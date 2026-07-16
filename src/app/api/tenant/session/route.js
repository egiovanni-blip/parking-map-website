import { cookies } from 'next/headers'
import { verifyTenantCookie } from '@/lib/tenant-session'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const tenantCookie = cookieStore.get('tenant_session')

    if (!tenantCookie) return Response.json({ isTenant: false })

    const tenant = await verifyTenantCookie(tenantCookie.value)
    if (!tenant?.company_name) return Response.json({ isTenant: false })

    return Response.json({ isTenant: true, company_name: tenant.company_name })

  } catch {
    return Response.json({ isTenant: false })
  }
}
