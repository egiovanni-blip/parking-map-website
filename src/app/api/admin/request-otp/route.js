import { getSupabaseAdmin, isEligibleAdminEmail } from '@/lib/admin-auth'
import { sendVerificationCodeEmail } from '@/lib/otp-email'

export async function POST(request) {
  try {
    const { email: rawEmail } = await request.json()
    const email = rawEmail?.toLowerCase().trim()

    if (!email) {
      return Response.json({ error: 'Email is required.' }, { status: 400 })
    }

    const eligible = await isEligibleAdminEmail(email)

    if (!eligible) {
      console.warn('Admin OTP skipped — email not eligible:', email)
      // Always return success to prevent email enumeration
      return Response.json({ success: true })
    }

    const { otp_hash, otp_expires_at } = await sendVerificationCodeEmail({
      to: email,
      portalLabel: 'Admin Portal',
      purpose: 'set or reset your admin password',
    })

    const supabaseAdmin = getSupabaseAdmin()
    const { error: upsertError } = await supabaseAdmin
      .from('admin_invites')
      .upsert({ email, otp_hash, otp_expires_at })

    if (upsertError) {
      console.error('Admin OTP invite upsert error:', upsertError.message)
      return Response.json({ error: 'Could not save verification code. Please try again.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Admin OTP request error:', err.message)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
