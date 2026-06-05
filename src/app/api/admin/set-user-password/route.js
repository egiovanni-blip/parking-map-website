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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Super admin (set via SUPER_ADMIN_EMAIL env var) bypasses the admin_users table.
  // All other users must be in admin_users with is_active = true.
  const isSuperAdmin = session.user.email?.toLowerCase() === process.env.SUPER_ADMIN_EMAIL?.toLowerCase()

  if (!isSuperAdmin) {
    const { data: adminCheck } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Unauthorized — not an admin.' }, { status: 401 })
    }
  }

  // 2. Parse and validate the request body
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  // 3. Find or create the target user
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  let targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())

  if (!targetUser) {
    // Super admin can create new users on the fly.
    // Regular admins cannot create users — they can only update existing ones.
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'No user found with that email.' }, { status: 404 })
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Add the new user to admin_users so they appear in the admin list
    await supabaseAdmin
      .from('admin_users')
      .insert([{ id: created.user.id, is_active: true }])

    return NextResponse.json({ success: true, created: true })
  }

  // 4. Regular admins can only update passwords for existing admin_users.
  //    Super admin can update any user.
  if (!isSuperAdmin) {
    const { data: targetAdminCheck } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', targetUser.id)
      .single()

    if (!targetAdminCheck) {
      return NextResponse.json({ error: 'That email does not belong to an admin user.' }, { status: 403 })
    }
  }

  // 5. Update the password for an existing user
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    { password }
  )

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 6. If super admin set a password for someone not yet in admin_users, add them
  if (isSuperAdmin) {
    const { data: existingRow } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', targetUser.id)
      .maybeSingle()

    if (!existingRow) {
      const { error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert([{ id: targetUser.id, is_active: true }])

      if (insertError) {
        // Password was updated but we couldn't add to admin_users table — surface the error
        return NextResponse.json({
          success: true,
          created: false,
          warning: `Password updated but failed to add to admin list: ${insertError.message}`,
        })
      }
    }
  }

  return NextResponse.json({ success: true, created: false })
}
