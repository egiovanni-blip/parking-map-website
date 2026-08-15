import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getResendFromAddress } from '@/lib/otp-email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      floor_id, floor_label, spot_identifier, spot_number,
      spot_type, requester_name, requester_role, requester_phone,
      requester_email, requester_company, notes
    } = body

    // Rate limit: max 5 requests per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('spot_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_email', requester_email)
      .gte('submitted_at', oneHourAgo)

    if (count >= 5) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    // Save to database first — this is the source of truth
    const { data, error } = await supabase
      .from('spot_requests')
      .insert([{
        floor_id, floor_label, spot_identifier, spot_number,
        spot_type, requester_name, requester_role, requester_phone,
        requester_email, requester_company, notes
      }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Send notifications separately — a failure here must NOT mask the successful save
    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://parking-map-website.vercel.app'}/admin/requests`

    try {
      await resend.emails.send({
        from: getResendFromAddress(),
        to: process.env.NOTIFY_EMAIL,
        subject: `New Parking Request — Spot ${spot_number} (${floor_label})`,
        html: `
          <h2>New Parking Spot Request</h2>
          <p><b>Spot:</b> ${spot_number} on ${floor_label}</p>
          <p><b>Type:</b> ${spot_type || 'Not specified'}</p>
          <p><b>Requester:</b> ${requester_name}${requester_role ? ` — ${requester_role}` : ''}</p>
          <p><b>Company:</b> ${requester_company}</p>
          <p><b>Email:</b> ${requester_email}</p>
          ${requester_phone ? `<p><b>Phone:</b> ${requester_phone}</p>` : ''}
          ${notes ? `<p><b>Notes:</b> ${notes}</p>` : ''}
          <br/>
          <p><a href="${adminUrl}">Review request in Admin →</a></p>
        `
      })
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr.message)
    }

    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🅿️ *New Parking Request*\n*Spot:* ${spot_number} on ${floor_label}\n*Type:* ${spot_type || 'Not specified'}\n*From:* ${requester_name}${requester_role ? ` (${requester_role})` : ''} — ${requester_company}\n*Email:* ${requester_email}${requester_phone ? `\n*Phone:* ${requester_phone}` : ''}${notes ? `\n*Notes:* ${notes}` : ''}\n<${adminUrl}|Review in Admin →>`
        })
      })
    } catch (slackErr) {
      console.error('Slack notification failed:', slackErr.message)
    }

    return Response.json({ success: true, data })

  } catch (err) {
    console.error('Spot request error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
