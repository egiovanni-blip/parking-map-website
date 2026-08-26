import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdmin } from '@/lib/admin-auth'

const PLACEHOLDER_LABELS = new Set(['unassigned', 'unlabeled'])
const PAGE_SIZE = 1000

async function getAuthenticatedUser(request) {
  const supabaseAdmin = getSupabaseAdmin()

  // Prefer Bearer token from the browser session (most reliable)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (user && !error) return user
  }

  // Fallback: cookie-based session
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

export async function GET(request) {
  // Same gate as /admin layout: any signed-in admin session
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const spots = []
  let from = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('parking_spots')
      .select('display_label, original_label')
      .not('display_label', 'is', null)
      .not('original_label', 'is', null)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    spots.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  const byLower = new Map()

  for (const spot of spots) {
    const name = spot.display_label?.trim()
    if (!name) continue
    const lower = name.toLowerCase()
    if (PLACEHOLDER_LABELS.has(lower)) continue
    if (!byLower.has(lower)) byLower.set(lower, name)
  }

  const companies = [...byLower.values()].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )

  return NextResponse.json({ companies })
}
