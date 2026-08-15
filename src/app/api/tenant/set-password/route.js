import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { verifyOtp, sendPasswordSetConfirmationEmail } from '@/lib/otp-email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body.email?.toLowerCase().trim()
    const otp = body.otp?.trim()
    const password = body.password

    if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 })
    if (!otp) return Response.json({ error: 'Verification code is required.' }, { status: 400 })
    if (!password) return Response.json({ error: 'Password is required.' }, { status: 400 })
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_contacts')
      .select('id, otp_hash, otp_expires_at')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (tenantError || !tenant) {
      return Response.json({ error: 'Invalid or expired verification code.' }, { status: 400 })
    }

    if (!tenant.otp_hash || !tenant.otp_expires_at) {
      return Response.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
    }

    if (new Date(tenant.otp_expires_at) < new Date()) {
      return Response.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
    }

    const otpValid = await verifyOtp(otp, tenant.otp_hash)
    if (!otpValid) {
      return Response.json({ error: 'Incorrect verification code.' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { error: updateError } = await supabase
      .from('tenant_contacts')
      .update({ password_hash, otp_hash: null, otp_expires_at: null })
      .eq('id', tenant.id)

    if (updateError) {
      console.error('Password update error:', updateError.message)
      return Response.json({ error: 'Failed to save password. Please try again.' }, { status: 500 })
    }

    try {
      await sendPasswordSetConfirmationEmail({ to: email, portalLabel: 'Parking Portal' })
    } catch (emailErr) {
      console.error('Tenant confirmation email error:', emailErr.message)
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Set password error:', err.message)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
