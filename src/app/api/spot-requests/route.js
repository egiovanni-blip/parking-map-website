import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
      spot_type, requester_name, requester_email,
      requester_company, notes
    } = body

    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('spot_requests')
      .insert([{
        floor_id, floor_label, spot_identifier, spot_number,
        spot_type, requester_name, requester_email,
        requester_company, notes
      }])
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // 2. Send Email via Resend
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: process.env.NOTIFY_EMAIL,
      subject: `New Parking Request — Spot ${spot_number} (${floor_label})`,
      html: `
        <h2>New Parking Spot Request</h2>
        <p><b>Spot:</b> ${spot_number} on ${floor_label}</p>
        <p><b>Type:</b> ${spot_type || 'Not specified'}</p>
        <p><b>Requester:</b> ${requester_name}</p>
        <p><b>Company:</b> ${requester_company}</p>
        <p><b>Email:</b> ${requester_email}</p>
        ${notes ? `<p><b>Notes:</b> ${notes}</p>` : ''}
        <br/>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/requests">Review request in Admin →</a></p>
      `
    })

    // 3. Post to Slack
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🅿️ *New Parking Request*\n*Spot:* ${spot_number} on ${floor_label}\n*Type:* ${spot_type || 'Not specified'}\n*From:* ${requester_name} — ${requester_company}\n*Email:* ${requester_email}${notes ? `\n*Notes:* ${notes}` : ''}\n<${process.env.NEXT_PUBLIC_SITE_URL}/admin/requests|Review in Admin →>`
      })
    })

    return Response.json({ success: true, data })

  } catch (err) {
    console.error('Spot request error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}