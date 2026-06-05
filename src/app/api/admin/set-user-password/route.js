import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  // 1. Verify the requesting user is an active admin.
  //    Use createServerClient with getAll() — required for @supabase/ssr 0.9
  //    which stores the session as base64-encoded chunked cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // read-only in this route — no need to set cookies
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized — no session found.' }, { status: 401 })
  }

  // Use service role to check admin_users, bypassing any RLS restrictions
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .single()

  if (!adminCheck) {
    return NextResponse.json({ error: 'Unauthorized — not an admin.' }, { status: 401 })
  }

  // 2. Parse and validate the request body
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  // 3. Find the target user by email
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())
  if (!targetUser) {
    return NextResponse.json({ error: 'No user found with that email.' }, { status: 404 })
  }

  // 4. Confirm target is also an admin
  const { data: targetAdminCheck } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', targetUser.id)
    .single()

  if (!targetAdminCheck) {
    return NextResponse.json({ error: 'That email does not belong to an admin user.' }, { status: 403 })
  }

  // 5. Set the password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    { password }
  )

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
