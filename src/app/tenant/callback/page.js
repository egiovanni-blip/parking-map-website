'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TenantCallbackPage() {
  const [status, setStatus] = useState('Verifying your access...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session?.user) {
          setStatus('Verification failed. Redirecting...')
          setTimeout(() => window.location.href = '/tenant/login?error=invalid', 2000)
          return
        }

        const email = session.user.email
        setStatus(`Verified! Loading your parking map...`)

        // Look up company from tenant_contacts via API
        const res = await fetch('/api/tenant/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })

        const data = await res.json()

        if (!res.ok || !data.company_name) {
          setStatus('Access not found. Redirecting...')
          setTimeout(() => window.location.href = '/tenant/login?error=invalid', 2000)
          return
        }

        // Set tenant cookie
        const cookieValue = encodeURIComponent(JSON.stringify({
          email,
          company_name: data.company_name
        }))
        document.cookie = `tenant_session=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 30}`

        // Redirect to map
        window.location.href = '/floor/2'

      } catch (err) {
        console.error('Callback error:', err)
        setStatus('Something went wrong. Redirecting...')
        setTimeout(() => window.location.href = '/tenant/login?error=invalid', 2000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  )
}