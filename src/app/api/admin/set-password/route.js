import { getSupabaseAdmin, findAuthUserByEmail, isSuperAdminEmail } from '@/lib/admin-auth'
import { verifyOtp, sendPasswordSetConfirmationEmail } from '@/lib/otp-email'

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

    const supabaseAdmin = getSupabaseAdmin()

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('admin_invites')
      .select('email, otp_hash, otp_expires_at')
      .eq('email', email)
      .maybeSingle()

    if (inviteError || !invite) {
      return Response.json({ error: 'Invalid or expired verification code.' }, { status: 400 })
    }

    if (!invite.otp_hash || !invite.otp_expires_at) {
      return Response.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
    }

    if (new Date(invite.otp_expires_at) < new Date()) {
      return Response.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
    }

    const otpValid = await verifyOtp(otp, invite.otp_hash)
    if (!otpValid) {
      return Response.json({ error: 'Incorrect verification code.' }, { status: 400 })
    }

    let authUser = await findAuthUserByEmail(email)
    let created = false

    if (!authUser) {
      const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        console.error('Admin create user error:', createError.message)
        return Response.json({ error: createError.message }, { status: 500 })
      }

      authUser = createdData.user
      created = true
    } else {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password,
      })

      if (updateError) {
        console.error('Admin password update error:', updateError.message)
        return Response.json({ error: updateError.message }, { status: 500 })
      }
    }

    // Ensure admin_users row exists (skip for super admin if not in table)
    if (!isSuperAdminEmail(email)) {
      const { data: existingRow } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle()

      if (!existingRow) {
        const { error: insertError } = await supabaseAdmin
          .from('admin_users')
          .insert([{ id: authUser.id, is_active: true }])

        if (insertError) {
          console.error('Admin users insert error:', insertError.message)
          return Response.json({ error: 'Password saved but failed to grant admin access.' }, { status: 500 })
        }
      }
    }

    await supabaseAdmin.from('admin_invites').delete().eq('email', email)

    try {
      await sendPasswordSetConfirmationEmail({ to: email, portalLabel: 'Admin Portal' })
    } catch (emailErr) {
      console.error('Admin confirmation email error:', emailErr.message)
    }

    return Response.json({ success: true, created })
  } catch (err) {
    console.error('Admin set password error:', err.message)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
