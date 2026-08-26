import { NextResponse } from 'next/server'
import { verifyTenantCookie } from '@/lib/tenant-session'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  const alwaysPublic = [
    '/admin/auth/callback',
    '/admin/auth/recovery',
    '/admin/set-password',
    '/auth/callback',
    '/tenant/login',
    '/tenant/set-password',
    '/api/tenant/login',
    '/api/tenant/session',
    '/api/tenant/resolve',
    '/api/tenant/set-password',
    '/api/tenant/request-otp',
    '/api/tenant/logout',
    '/api/admin/request-otp',
    '/api/admin/set-password',
    '/api/spot-requests',
    '/login',
    '/attendant',
  ]

  // Home page is public
  if (pathname === '/') return NextResponse.next()

  // Always public routes
  if (alwaysPublic.some(path => pathname.startsWith(path))) return NextResponse.next()

  // Admin API routes enforce their own auth and must return JSON (not HTML redirects)
  if (pathname.startsWith('/api/admin')) return NextResponse.next()

  const allCookies = request.cookies.getAll()
  const hasSupabaseAuth = allCookies.some(c => {
    const name = c.name.toLowerCase()
    return name.startsWith('sb-') || name.includes('supabase')
  })

  // Verify the tenant cookie signature — rejects forged cookies
  const rawTenantCookie = request.cookies.get('tenant_session')?.value ?? null
  const tenant = await verifyTenantCookie(rawTenantCookie)
  const hasTenantSession = !!tenant

  // Admin routes — require Supabase auth
  if (pathname.startsWith('/admin')) {
    if (hasSupabaseAuth) return NextResponse.next()
    if (hasTenantSession) return NextResponse.redirect(new URL('/floor/2', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Floor/map routes — require either admin or tenant session
  if (pathname.startsWith('/floor')) {
    if (hasSupabaseAuth) return NextResponse.next()
    if (hasTenantSession) {
      const response = NextResponse.next()
      response.headers.set('x-tenant-company', tenant.company_name)
      return response
    }
    return NextResponse.redirect(new URL('/tenant/login?reason=expired', request.url))
  }

  // All other protected routes
  if (hasSupabaseAuth) return NextResponse.next()
  if (hasTenantSession) return NextResponse.next()
  return NextResponse.redirect(new URL('/tenant/login?reason=expired', request.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|overlays|maps|.*\\..*).*)'
  ]
}
