import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body.email?.toLowerCase().trim()
    const password = body.password

    if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 })
    if (!password) return Response.json({ error: 'Password is required.' }, { status: 400 })
    if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })

    // Verify email exists in tenant_contacts
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_contacts')
      .select('id, email')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return Response.json({ error: 'Email not found. Please contact your property manager.' }, { status: 404 })
    }

    // Hash and save password
    const password_hash = await bcrypt.hash(password, 12)

    const { error: updateError } = await supabase
      .from('tenant_contacts')
      .update({ password_hash })
      .eq('id', tenant.id)

    if (updateError) {
      console.error('Password update error:', updateError.message)
      return Response.json({ error: 'Failed to save password. Please try again.' }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err) {
    console.error('Set password error:', err.message)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
