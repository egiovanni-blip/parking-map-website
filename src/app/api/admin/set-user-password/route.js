import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  // Build the admin client (service role — server only, never exposed to browser)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Verify the requesting user is an active admin.
  //    @supabase/ssr 0.9 stores the session in chunked cookies, so we read
  //    the access token directly and verify it with the admin client.
  const allCookies = request.cookies.getAll()

  let accessToken = null
  for (const cookie of allCookies) {
    // Cookie name: sb-<project-ref>-auth-token (or chunked: ...auth-token.0)
    if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
      try {
        const parsed = JSON.parse(cookie.value)
        if (parsed?.access_token) {
          accessToken = parsed.access_token
          break
        }
      } catch {
        // chunked or encoded — skip
      }
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized — no session found.' }, { status: 401 })
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized — invalid session.' }, { status: 401 })
  }

  // Check admin_users via service role (bypasses RLS)
  const { data: adminCheck } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
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
