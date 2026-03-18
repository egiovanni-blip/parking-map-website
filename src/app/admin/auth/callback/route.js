import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  console.log('=== ADMIN AUTH CALLBACK ===')
  console.log('Full URL:', request.url)
  console.log('Has code:', !!code)
  console.log('Has error:', !!error)
  console.log('Incoming cookies:', request.cookies.getAll().map(c => c.name))

  if (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    console.log('No code - redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.redirect(new URL('/admin', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          console.log('Setting cookie:', name)
          response.cookies.set(name, value, options)
        },
        remove(name, options) {
          console.log('Removing cookie:', name)
          response.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  console.log('Exchanging code for session...')
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('Exchange error:', exchangeError.message)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
    )
  }

  console.log('Exchange success - user:', data?.session?.user?.email)
  console.log('Cookies being set on response:', response.cookies.getAll().map(c => c.name))
  console.log('=== END CALLBACK ===')

  return response
}