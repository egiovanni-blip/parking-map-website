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
      // Check tenant session cookie
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, ...val] = cookie.trim().split('=')
        acc[key.trim()] = val.join('=')
        return acc
      }, {})
      if (cookies['tenant_session']) {
        router.replace('/floor/2')
      }
    }
    checkSession()
  }, [router])

  return (
    <AuthPageBackdrop>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-2 [text-shadow:0_2px_8px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.6)]">
          The Republic
        </h1>
        <p className="text-gray-200 text-center mb-10">
          Parking Map Access
        </p>

        <div className="space-y-4">
          <Link
            href="/tenant/login"
            className="block w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-100 transition-colors">
                🅿️
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tenant Access</h2>
                <p className="text-sm text-gray-600">View your parking spaces</p>
              </div>
              <span className="ml-auto text-gray-400 group-hover:text-blue-600 transition-colors">→</span>
            </div>
          </Link>
        </div>
      </div>
      </div>
    </AuthPageBackdrop>
  )
}