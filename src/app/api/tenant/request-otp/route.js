import { createClient } from '@supabase/supabase-js'
import { generateOtp, hashOtp, otpExpiresAt, sendVerificationCodeEmail } from '@/lib/otp-email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body.email?.toLowerCase().trim()

    if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 })

    const { data: tenant } = await supabase
      .from('tenant_contacts')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (tenant) {
      const otp = generateOtp()
      const otp_hash = await hashOtp(otp)
      const otp_expires_at = otpExpiresAt()

      const { error: saveError } = await supabase
        .from('tenant_contacts')
        .update({ otp_hash, otp_expires_at })
        .eq('id', tenant.id)

      if (saveError) {
        console.error('OTP save error:', saveError.message)
        return Response.json({ error: 'Could not save verification code. Please try again.' }, { status: 500 })
      }

      await sendVerificationCodeEmail({
        to: email,
        otp,
        portalLabel: 'Parking Portal',
        purpose: 'set or reset your parking account password',
      })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('OTP request error:', err.message)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
