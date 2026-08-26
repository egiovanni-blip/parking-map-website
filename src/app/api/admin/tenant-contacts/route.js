import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/admin-auth'

async function getAuthenticatedUser(request) {
  const supabaseAdmin = getSupabaseAdmin()

  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (user && !error) return user
  }

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

  const { data: { user }, error } = await supabase.auth.getUser()
  if (user && !error) return user

  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export async function POST(request) {
  const admin = await getAuthenticatedUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const email = body.email?.toLowerCase().trim()
    const fullName = body.full_name?.trim()
    const companyName = body.company_name?.trim()
    const password = body.password?.trim() || ''

    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    if (!fullName) return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    if (!companyName) return NextResponse.json({ error: 'Company name is required.' }, { status: 400 })
    if (password && password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const insertRow = {
      email,
      full_name: fullName,
      company_name: companyName,
    }

    if (password) {
      insertRow.password_hash = await bcrypt.hash(password, 12)
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('tenant_contacts')
      .insert([insertRow])
      .select('id, email, full_name, company_name, created_at')
      .single()

    if (error) {
      if (error.message.includes('unique') || error.code === '23505') {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      contact: data,
      passwordSet: Boolean(password),
    })
  } catch (err) {
    console.error('Create tenant contact error:', err.message)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
