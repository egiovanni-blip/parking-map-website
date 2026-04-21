'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function Header() {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [isTenant, setIsTenant] = useState(false)

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, ...val] = cookie.trim().split('=')
      acc[key.trim()] = val.join('=')
      return acc
    }, {})
    if (cookies['tenant_session']) setIsTenant(true)
  }, [])

  const isHomePage = pathname === '/'
  const isFloorPage = pathname.startsWith('/floor/')
  const isLoginPage = pathname === '/login'
  const isAdminPage = pathname.startsWith('/admin')

  return (
    <header className="bg-white shadow">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo and Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-lg font-bold text-blue-600 hover:text-blue-700">
                The Republic
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isHomePage
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Home
              </Link>

              <Link
                href="/floor/2"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isFloorPage
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                View Parking
              </Link>

              {user && !isTenant && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isAdminPage
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right side: Login/Logout */}
          <div className="flex items-center">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <button
                  onClick={async () => {
                    const { supabase } = await import('@/lib/supabase')
                    await supabase.auth.signOut()
                    localStorage.removeItem('supabase-user')
                    localStorage.removeItem('supabase-auth-token')
                    document.cookie = 'tenant_session=; path=/; max-age=0'
                    window.location.href = '/'
                  }}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            ) : isTenant ? (
              <button
                onClick={() => {
                  document.cookie = 'tenant_session=; path=/; max-age=0'
                  window.location.href = '/tenant/login'
                }}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden border-t border-gray-200 mt-2 pt-2">
          <div className="flex space-x-4">
            <Link
              href="/"
              className={`flex-1 text-center pb-2 ${isHomePage ? 'border-b-2 border-blue-500' : ''}`}
            >
              <span className={`text-sm font-medium ${isHomePage ? 'text-gray-900' : 'text-gray-500'}`}>
                Home
              </span>
            </Link>

            <Link
              href="/floor/2"
              className={`flex-1 text-center pb-2 ${isFloorPage ? 'border-b-2 border-blue-500' : ''}`}
            >
              <span className={`text-sm font-medium ${isFloorPage ? 'text-gray-900' : 'text-gray-500'}`}>
                View Parking
              </span>
            </Link>

            {user && !isTenant && (
              <Link
                href="/admin"
                className={`flex-1 text-center pb-2 ${isAdminPage ? 'border-b-2 border-blue-500' : ''}`}
              >
                <span className={`text-sm font-medium ${isAdminPage ? 'text-gray-900' : 'text-gray-500'}`}>
                  Admin
                </span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}