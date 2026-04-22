import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const tenantCookie = cookieStore.get('tenant_session')

    if (!tenantCookie) {
      return Response.json({ isTenant: false })
    }

    const tenant = JSON.parse(decodeURIComponent(tenantCookie.value))
    if (!tenant?.company_name) {
      return Response.json({ isTenant: false })
    }

    return Response.json({ isTenant: true, company_name: tenant.company_name })

  } catch (err) {
    return Response.json({ isTenant: false })
  }
}
