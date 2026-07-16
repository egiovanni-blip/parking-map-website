'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isTenant, loading, logout, tenantLogout } = useAuth()

  const isHomePage = pathname === '/'
  const isFloorPage = pathname.startsWith('/floor/')
  const isAdminPage = pathname.startsWith('/admin')

  const handleHomeClick = (e) => {
    e.preventDefault()
    if (user || isTenant) {
      router.push('/floor/2')
    } else {
      router.push('/')
    }
  }

  return (
    <header className="bg-vend-white border-b border-vend-concrete">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="font-headline text-lg text-vend-black hover:text-vend-slate tracking-tight">
                The Republic
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a
                href="/"
                onClick={handleHomeClick}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold cursor-pointer ${
                  isHomePage || isFloorPage
                    ? 'border-vend-mint text-vend-black'
                    : 'border-transparent text-vend-slate hover:text-vend-black hover:border-vend-concrete'
                }`}
              >
                Home
              </a>

              {user && !isTenant && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold ${
                    isAdminPage
                      ? 'border-vend-mint text-vend-black'
                      : 'border-transparent text-vend-slate hover:text-vend-black hover:border-vend-concrete'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center">
            {loading ? (
              <div className="text-sm text-vend-slate">Loading...</div>
            ) : user ? (
              <button
                onClick={logout}
                className="ml-3 inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md text-vend-white bg-vend-black hover:bg-vend-slate transition-colors"
              >
                Logout
              </button>
            ) : isTenant ? (
              <button
                onClick={tenantLogout}
                className="ml-3 inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md text-vend-white bg-vend-black hover:bg-vend-slate transition-colors"
              >
                Logout
              </button>
            ) : null}
          </div>

        </div>

        <div className="sm:hidden border-t border-vend-concrete mt-2 pt-2">
          <div className="flex space-x-4">
            <a
              href="/"
              onClick={handleHomeClick}
              className={`flex-1 text-center pb-2 cursor-pointer ${isHomePage || isFloorPage ? 'border-b-2 border-vend-mint' : ''}`}
            >
              <span className={`text-sm font-semibold ${isHomePage || isFloorPage ? 'text-vend-black' : 'text-vend-slate'}`}>
                Home
              </span>
            </a>

            {user && !isTenant && (
              <Link
                href="/admin"
                className={`flex-1 text-center pb-2 ${isAdminPage ? 'border-b-2 border-vend-mint' : ''}`}
              >
                <span className={`text-sm font-semibold ${isAdminPage ? 'text-vend-black' : 'text-vend-slate'}`}>
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
