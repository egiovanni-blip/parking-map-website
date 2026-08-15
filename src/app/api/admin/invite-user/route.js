import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdmin, findAuthUserByEmail } from '@/lib/admin-auth'
import { sendVerificationCodeEmail } from '@/lib/otp-email'

async function requireSuperAdmin(request) {
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
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const isSuperAdmin =
    session.user.email?.toLowerCase() === process.env.SUPER_ADMIN_EMAIL?.toLowerCase()

  if (!isSuperAdmin) {
    return { error: NextResponse.json({ error: 'Only the super admin can invite users.' }, { status: 403 }) }
  }

  return { session }
}

export async function POST(request) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error

    const { email: rawEmail } = await request.json()
    const email = rawEmail?.toLowerCase().trim()

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const existingUser = await findAuthUserByEmail(email)

    if (existingUser) {
      const { data: adminRow } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('id', existingUser.id)
        .maybeSingle()

      if (adminRow) {
        return NextResponse.json({ error: 'This email already has admin access.' }, { status: 400 })
      }
    }

    const { otp_hash, otp_expires_at } = await sendVerificationCodeEmail({
      to: email,
      portalLabel: 'Admin Portal',
      purpose: 'set your admin password',
    })

    const { error: upsertError } = await supabaseAdmin
      .from('admin_invites')
      .upsert({
        email,
        otp_hash,
        otp_expires_at,
        invited_at: new Date().toISOString(),
        invited_by: auth.session.user.id,
      })

    if (upsertError) {
      console.error('Admin invite upsert error:', upsertError.message)
      return NextResponse.json({ error: 'Failed to save invite.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${email}. They can set their password at the admin login page.`,
    })
  } catch (err) {
    console.error('Admin invite error:', err.message)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
