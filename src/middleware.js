import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Public paths that don't need auth
  const publicPaths = [
    '/tenant/login',
    '/tenant/verify',
    '/api/tenant/login',
    '/api/tenant/verify',
    '/login',
    '/admin',
  ]

  // Allow public paths and anything starting with them
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check for tenant cookie on all other pages
  const tenantCookie = request.cookies.get('tenant_session')

  if (!tenantCookie) {
    return NextResponse.redirect(new URL('/tenant/login', request.url))
  }

  try {
    const tenant = JSON.parse(decodeURIComponent(tenantCookie.value))
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