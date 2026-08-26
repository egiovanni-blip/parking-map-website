'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useIsPhone } from '@/hooks/useIsPhone'

const PUBLIC_ADMIN_PATHS = ['/admin/set-password', '/admin/auth/recovery', '/admin/auth/callback']

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isPhone = useIsPhone()
  const isPublicPage = PUBLIC_ADMIN_PATHS.some(path => pathname?.startsWith(path))
  const isSummaryPage = pathname === '/admin/summary'

  useEffect(() => {
    if (isPublicPage || loading) return
    if (!user) {
      router.push('/login')
    }
  }, [user, loading, router, isPublicPage])

  useEffect(() => {
    if (isPublicPage || loading || !user || isPhone !== true) return
    if (!isSummaryPage) router.replace('/admin/summary')
  }, [user, loading, isPhone, isPublicPage, isSummaryPage, router])

  if (isPublicPage) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (isPhone === true && !isSummaryPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
