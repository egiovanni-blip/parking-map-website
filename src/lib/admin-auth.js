import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function isSuperAdminEmail(email) {
  const superEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase()
  return Boolean(superEmail && email?.toLowerCase() === superEmail)
}

/** Any signed-in admin may use the phone Allocation Summary + space search. */
export function canAccessMobileSummary(email) {
  return Boolean(email)
}

/** Returns true if this email may request an admin OTP (invite pending or active admin). */
export async function isEligibleAdminEmail(email) {
  if (isSuperAdminEmail(email)) return true

  const supabaseAdmin = getSupabaseAdmin()

  const { data: invite } = await supabaseAdmin
    .from('admin_invites')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (invite) return true

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  const authUser = users.find(u => u.email?.toLowerCase() === email)
  if (!authUser) return false

  const { data: adminRow } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', authUser.id)
    .eq('is_active', true)
    .maybeSingle()

  return Boolean(adminRow)
}

export async function findAuthUserByEmail(email) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  return users.find(u => u.email?.toLowerCase() === email) ?? null
}
