import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

    const { data: tenant, error } = await supabase
      .from('tenant_contacts')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (error || !tenant) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json({ company_name: tenant.company_name })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
