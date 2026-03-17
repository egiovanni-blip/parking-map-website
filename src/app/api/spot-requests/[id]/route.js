import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function PATCH(request, { params }) {
  try {
    const { status } = await request.json()
    const { id } = await params

    // 1. Get the request details first
    const { data: requestData, error: fetchError } = await supabase
      .from('spot_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 })

    // 2. Update the request status
    const { error: updateError } = await supabase
      .from('spot_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

    // 3. If approved → update the actual parking spot
    if (status === 'approved') {
      const { error: spotError } = await supabase
        .from('parking_spots')
        .update({
          spot_type: 'reserved',
          display_label: requestData.requester_company,
          custom_label: requestData.requester_name,
          is_custom_labeled: true,
          updated_at: new Date().toISOString()
        })
        .eq('floor_id', requestData.floor_id)
        .eq('original_label', requestData.spot_number)

      if (spotError) return Response.json({ error: spotError.message }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err) {
    console.error('Approve/deny error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}