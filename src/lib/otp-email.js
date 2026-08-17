import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000))
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10)
}

export async function verifyOtp(otp, otpHash) {
  if (!otp || !otpHash) return false
  return bcrypt.compare(otp, otpHash)
}

export function otpExpiresAt(minutes = 15) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

export function getResendFromAddress() {
  const raw = (process.env.RESEND_FROM_EMAIL || '').trim().replace(/^["']|["']$/g, '')
  return raw || 'onboarding@resend.dev'
}

async function sendResendEmail(payload) {
  const from = getResendFromAddress()
  const { data, error } = await resend.emails.send({ ...payload, from })

  if (error) {
    const message = error.message || 'Failed to send email.'
    console.error('Resend send error:', message, { from, to: payload.to })
    throw new Error(message)
  }

  return data
}

export async function sendVerificationCodeEmail({ to, portalLabel, purpose, otp: existingOtp }) {
  const otp = existingOtp || generateOtp()
  const otp_hash = await hashOtp(otp)

  await sendResendEmail({
    to,
    subject: `Your ${portalLabel} verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="margin-bottom:8px">${portalLabel} — Verification Code</h2>
        <p style="color:#555;margin-bottom:24px">
          Use the code below to ${purpose}. It expires in 15 minutes.
        </p>
        <div style="font-size:36px;font-weight:700;letter-spacing:0.15em;text-align:center;
                    background:#f4f4f5;border-radius:8px;padding:24px 0;margin-bottom:24px">
          ${otp}
        </div>
        <p style="color:#888;font-size:13px">
          If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  })

  return { otp, otp_hash, otp_expires_at: otpExpiresAt() }
}

export async function sendPasswordSetConfirmationEmail({ to, portalLabel }) {
  await sendResendEmail({
    to,
    subject: `Your ${portalLabel} password is set`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="margin-bottom:8px">${portalLabel} — Password Updated</h2>
        <p style="color:#555;margin-bottom:16px">
          Your password has been set successfully. You can now sign in with your email and password.
        </p>
        <p style="color:#888;font-size:13px">
          If you didn't make this change, contact your administrator immediately.
        </p>
      </div>
    `,
  })
}
