import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Always public - no auth needed
  const alwaysPublic = [
    '/tenant/login',
    '/tenant/callback',
    '/api/tenant/login',
    '/api/tenant/session',
    '/api/tenant/verify',
    '/login',
  ]

  if (alwaysPublic.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Admin routes - protected by Supabase auth (existing system)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // All other routes require tenant cookie
  const tenantCookie = request.cookies.get('tenant_session')

  if (!tenantCookie) {
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