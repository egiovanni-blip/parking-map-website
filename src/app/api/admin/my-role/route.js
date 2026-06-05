import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ isSuperAdmin: false })
  }

  const isSuperAdmin =
    session.user.email?.toLowerCase() === process.env.SUPER_ADMIN_EMAIL?.toLowerCase()

  return NextResponse.json({ isSuperAdmin })
}
