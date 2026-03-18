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

  // Check for Supabase auth - admins have sb- or supabase cookies
  const allCookies = request.cookies.getAll()
  const hasSupabaseAuth = allCookies.some(c => {
    const name = c.name.toLowerCase()
    return name.startsWith('sb-') || name.includes('supabase')
  })
  const tenantCookie = request.cookies.get('tenant_session')
  const hasTenantSession = !!tenantCookie

  // Admin routes - ONLY Supabase-authenticated users (admins)
  // Tenants with just tenant_session must be redirected away
  if (pathname.startsWith('/admin')) {
    // Debug: log cookie names when hitting admin routes
    console.log('[Middleware] /admin request - cookie names:', allCookies.map(c => c.name).join(', ') || '(none)')

    // If user just came from auth callback, let them through (session may still be propagating)
    const referer = request.headers.get('referer') || ''
    const fromAuthCallback = referer.includes('/admin/auth/callback')
    const hasAuthPendingCookie = request.cookies.get('admin_auth_pending')
    if (fromAuthCallback || hasAuthPendingCookie) {
      const response = NextResponse.next()
      if (hasAuthPendingCookie) {
        response.cookies.set('admin_auth_pending', '', { maxAge: 0, path: '/' })
      }
      return response
    }

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