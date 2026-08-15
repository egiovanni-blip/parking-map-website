'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const PUBLIC_ADMIN_PATHS = ['/admin/set-password', '/admin/auth/recovery', '/admin/auth/callback']

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isPublicPage = PUBLIC_ADMIN_PATHS.some(path => pathname?.startsWith(path))

  useEffect(() => {
    if (isPublicPage || loading) return
    if (!user) {
      router.push('/login')
    }
  }, [user, loading, router, isPublicPage])

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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}