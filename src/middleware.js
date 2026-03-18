import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Always public - no auth needed
  const alwaysPublic = [
    '/admin/auth/callback',
    '/auth/callback',
    '/tenant/login',
    '/tenant/callback',
    '/tenant/verify',
    '/api/tenant/login',
    '/api/tenant/session',
    '/api/tenant/verify',
    '/login',
  ]

  if (pathname === '/' || alwaysPublic.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check for Supabase auth (sb- cookies) - admins have these
  const hasSupabaseAuth = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  const tenantCookie = request.cookies.get('tenant_session')
  const hasTenantSession = !!tenantCookie

  // Admin routes - ONLY Supabase-authenticated users (admins)
  // Tenants with just tenant_session must be redirected away
  if (pathname.startsWith('/admin')) {
    if (hasSupabaseAuth) {
      return NextResponse.next()
    }
    if (hasTenantSession) {
      return NextResponse.redirect(new URL('/floor/2', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // All other protected routes (/floor, /, etc) require tenant_session OR Supabase auth
  if (hasSupabaseAuth) {
    return NextResponse.next()
  }

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