import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  // Verify the requesting user has a valid session
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const isSuperAdmin = session.user.email?.toLowerCase() === process.env.SUPER_ADMIN_EMAIL?.toLowerCase()

  // Must be super admin or in admin_users
  if (!isSuperAdmin) {
    const { data: adminCheck } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Fetch all rows from admin_users
  const { data: adminRows, error: rowsError } = await supabaseAdmin
    .from('admin_users')
    .select('id, is_active, created_at')
    .order('created_at', { ascending: true })

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 })
  }

  // Fetch all auth users to resolve emails
  const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const authMap = Object.fromEntries(authUsers.map(u => [u.id, u]))

  const admins = adminRows.map(row => ({
    id: row.id,
    email: authMap[row.id]?.email ?? '(unknown)',
    is_active: row.is_active,
    created_at: row.created_at,
    last_sign_in: authMap[row.id]?.last_sign_in_at ?? null,
  }))

  // Also include super admin if not already in admin_users
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  if (superAdminEmail) {
    const superUser = authUsers.find(u => u.email?.toLowerCase() === superAdminEmail.toLowerCase())
    if (superUser && !admins.find(a => a.id === superUser.id)) {
      admins.unshift({
        id: superUser.id,
        email: superUser.email,
        is_active: true,
        created_at: superUser.created_at,
        last_sign_in: superUser.last_sign_in_at ?? null,
        is_super: true,
      })
    } else if (superUser) {
      // Mark them as super in the list
      const entry = admins.find(a => a.id === superUser.id)
      if (entry) entry.is_super = true
    }
  }

  return NextResponse.json({ admins })
}
