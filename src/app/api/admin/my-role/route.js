import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { canAccessMobileSummary, isSuperAdminEmail } from '@/lib/admin-auth'

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
    return NextResponse.json({ isSuperAdmin: false, canAccessMobileSummary: false })
  }

  const email = session.user.email
  return NextResponse.json({
    isSuperAdmin: isSuperAdminEmail(email),
    canAccessMobileSummary: canAccessMobileSummary(email),
  })
}
