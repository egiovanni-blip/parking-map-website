'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthPageBackdrop from '@/components/AuthPageBackdrop'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      // Check admin Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/floor/2')
        return
      }
      // Check tenant session via server-side API (works with HttpOnly cookies)
      const res = await fetch('/api/tenant/session')
      const data = await res.json()
      if (data.isTenant) {
        router.replace('/floor/2')
      }
    }
    checkSession()
  }, [router])

  return (
    <AuthPageBackdrop>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-3xl font-headline text-white text-center mb-2 tracking-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.6)]">
          The Republic
        </h1>
        <p className="text-gray-200 text-center mb-10 font-subhead">
          Sign in. Find your space.
        </p>

        <div className="space-y-4">
          <Link
            href="/tenant/login"
            className="block w-full p-6 bg-vend-white rounded-xl shadow-sm border border-vend-concrete hover:border-vend-mint hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-vend-black flex items-center justify-center text-vend-mint text-xl font-headline group-hover:bg-vend-slate transition-colors">
                P
              </div>
              <div>
                <h2 className="text-lg font-subhead text-vend-black">Tenant Access</h2>
                <p className="text-sm text-vend-slate">View your spaces. Request in seconds.</p>
              </div>
              <span className="ml-auto text-vend-slate group-hover:text-vend-black transition-colors">→</span>
            </div>
          </Link>
        </div>
      </div>
      </div>
    </AuthPageBackdrop>
  )
}