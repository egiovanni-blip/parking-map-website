import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body.email?.toLowerCase().trim()

    if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 })

    // Look up tenant — same response shape whether found or not to prevent enumeration
    const { data: tenant } = await supabase
      .from('tenant_contacts')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (!tenant) {
      // Return success anyway — don't reveal whether email is registered
      return Response.json({ success: true })
    }

    // Generate 6-digit code and store its hash with a 15-minute expiry
    const otp = String(crypto.randomInt(100000, 1000000))
    const otp_hash = await bcrypt.hash(otp, 10)
    const otp_expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await supabase
      .from('tenant_contacts')
      .update({ otp_hash, otp_expires_at })
      .eq('id', tenant.id)

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your parking portal verification code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="margin-bottom:8px">Parking Portal — Verification Code</h2>
          <p style="color:#555;margin-bottom:24px">
            Use the code below to set your parking account password.
            It expires in 15 minutes.
          </p>
          <div style="font-size:36px;font-weight:700;letter-spacing:0.15em;text-align:center;
                      background:#f4f4f5;border-radius:8px;padding:24px 0;margin-bottom:24px">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">
            If you didn't request this, you can ignore this email.
            Your password will not change unless you complete the form.
          </p>
        </div>
      `
    })

    return Response.json({ success: true })

  } catch (err) {
    console.error('OTP request error:', err.message)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
