'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthPageBackdrop from '@/components/AuthPageBackdrop'
import DesktopOnlyNotice from '@/components/DesktopOnlyNotice'
import { supabase } from '@/lib/supabase'
import { isPhoneViewport } from '@/lib/phone-viewport'

export default function Home() {
  const router = useRouter()
  const [phoneTenantBlocked, setPhoneTenantBlocked] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const phone = isPhoneViewport()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(phone ? '/admin/summary' : '/floor/2')
        return
      }
      const res = await fetch('/api/tenant/session')
      const data = await res.json()
      if (data.isTenant) {
        if (phone) {
          setPhoneTenantBlocked(true)
          return
        }
        router.replace('/floor/2')
      }
    }
    checkSession()
  }, [router])

  if (phoneTenantBlocked) {
    return (
      <DesktopOnlyNotice
        title="Use a computer"
        message="The parking map is available on a desktop or laptop."
      />
    )
  }

  return (
    <AuthPageBackdrop>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-headline text-vend-white tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.6)]">
            The Republic
          </h1>
          <p className="mt-3 text-lg font-subhead text-vend-white [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
            Sign in. Find your{' '}
            <span className="text-vend-mint">space</span>.
          </p>
          <p className="mt-2 text-sm text-vend-concrete [text-shadow:0_1px_4px_rgba(0,0,0,0.75)]">
            Friction-free parking for tenants.
          </p>

          <div className="mt-10 space-y-4 text-left">
            <Link
              href="/tenant/login"
              className="block w-full p-6 bg-vend-white rounded-xl border border-vend-concrete hover:border-vend-mint-600 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-vend-black flex items-center justify-center text-vend-mint text-xl font-headline group-hover:bg-vend-slate transition-colors">
                  P
                </div>
                <div>
                  <h2 className="text-lg font-subhead text-vend-black">Tenant access</h2>
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
