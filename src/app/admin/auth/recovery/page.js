'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminRecoveryPage() {
  const [message, setMessage] = useState('Verifying reset link...')
  const router = useRouter()

  useEffect(() => {
    // The Supabase browser client automatically reads the #access_token hash
    // from the URL and fires PASSWORD_RECOVERY when it detects a recovery token.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage('Redirecting to password reset...')
        router.push('/admin/set-password')
      }
      // Intentionally ignore SIGNED_IN — Supabase fires it immediately for any
      // existing session when the listener registers. Acting on it would redirect
      // the user to /admin before PASSWORD_RECOVERY fires for the reset token.
    })

    // Fallback: if no event fires within 6 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      setMessage('This link has expired or is invalid. Redirecting to login...')
      setTimeout(() => router.push('/login'), 2000)
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  )
}
