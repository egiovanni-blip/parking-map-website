import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  const alwaysPublic = [
    '/admin/auth/callback',
    '/auth/callback',
    '/tenant/login',
    '/tenant/set-password',
    '/tenant/callback',
    '/tenant/verify',
    '/api/tenant/login',
    '/api/tenant/session',
    '/api/tenant/resolve',
    '/api/tenant/verify',
    '/api/tenant/set-password',
    '/login',
    '/attendant',
  ]

  // Home page is public
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Always public routes
  if (alwaysPublic.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const allCookies = request.cookies.getAll()
  const hasSupabaseAuth = allCookies.some(c => {
    const name = c.name.toLowerCase()
    return name.startsWith('sb-') || name.includes('supabase')
  })
  const tenantCookie = request.cookies.get('tenant_session')
  const hasTenantSession = !!tenantCookie

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
      try {
        const tenant = JSON.parse(decodeURIComponent(tenantCookie.value))
        if (!tenant?.company_name) {
          return NextResponse.redirect(new URL('/tenant/login', request.url))
        }
        const response = NextResponse.next()
        response.headers.set('x-tenant-company', tenant.company_name)
        return response
      } catch {
        return NextResponse.redirect(new URL('/tenant/login', request.url))
      }
    }
    // Not logged in — redirect to tenant login
    return NextResponse.redirect(new URL('/tenant/login', request.url))
  }

  // All other protected routes
  if (hasSupabaseAuth) return NextResponse.next()

  if (!hasTenantSession) {
    return NextResponse.redirect(new URL('/tenant/login', request.url))
  }

  try {
    const tenant = JSON.parse(decodeURIComponent(tenantCookie.value))
    if (!tenant?.company_name) {
      return NextResponse.redirect(new URL('/tenant/login', request.url))
    }
    const response = NextResponse.next()
    response.headers.set('x-tenant-company', tenant.company_name)
    return response
  } catch {
    return NextResponse.redirect(new URL('/tenant/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|overlays|maps|.*\\..*).*)' 
  ]
}