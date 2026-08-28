'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useIsPhone } from '@/hooks/useIsPhone'

function getInitials(label) {
  if (!label) return '?'
  if (label.includes('@')) {
    const local = label.split('@')[0]
    const parts = local.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return local.slice(0, 2).toUpperCase()
  }
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

function UserProfileChip({ initialsFrom, fullName, email, role }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const displayName = fullName || email || role

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full border border-vend-concrete bg-vend-warm-100/80 py-1 pl-1 pr-3 transition-colors hover:bg-vend-warm-100"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vend-mint text-xs font-semibold text-vend-black">
          {getInitials(initialsFrom || email || fullName)}
        </div>
        <span className="text-xs font-semibold text-vend-slate">{role}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] max-w-[280px] rounded-xl border border-vend-concrete bg-vend-white p-3 shadow-lg">
          <p className="truncate text-sm font-semibold text-vend-black">{displayName}</p>
          {fullName && email && (
            <p className="mt-0.5 truncate text-xs text-vend-slate">{email}</p>
          )}
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-vend-slate">{role}</p>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isTenant, tenantProfile, loading, logout, tenantLogout } = useAuth()
  const isPhone = useIsPhone()

  const isHomePage = pathname === '/'
  const isFloorPage = pathname.startsWith('/floor/')
  const isAdminPage = pathname.startsWith('/admin')
  const isSummaryPage = pathname === '/admin/summary'
  const adminHomeHref = user && isPhone ? '/admin/summary' : '/admin'

  const handleHomeClick = (e) => {
    e.preventDefault()
    if (user && isPhone) {
      router.push('/admin/summary')
      return
    }
    if (user || isTenant) {
      router.push('/floor/2')
    } else {
      router.push('/')
    }
  }

  return (
    <header className="bg-vend-white border-b border-vend-concrete">
      <nav className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="font-headline text-xl text-vend-black hover:text-vend-slate tracking-tight">
                The Republic
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a
                href="/"
                onClick={handleHomeClick}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold cursor-pointer ${
                  isHomePage || isFloorPage || (isPhone && isSummaryPage)
                    ? 'border-vend-mint text-vend-black'
                    : 'border-transparent text-vend-slate hover:text-vend-black hover:border-vend-concrete'
                }`}
              >
                Home
              </a>

              {user && !isTenant && (
                <Link
                  href={adminHomeHref}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold ${
                    isAdminPage
                      ? 'border-vend-mint text-vend-black'
                      : 'border-transparent text-vend-slate hover:text-vend-black hover:border-vend-concrete'
                  }`}
                >
                  {isPhone ? 'Summary' : 'Admin'}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="text-sm text-vend-slate">Loading...</div>
            ) : user ? (
              <>
                <UserProfileChip
                  initialsFrom={user.email}
                  fullName={user.user_metadata?.full_name || null}
                  email={user.email}
                  role="Admin"
                />
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-md text-vend-white bg-vend-black hover:bg-vend-slate transition-colors sm:px-4"
                >
                  Logout
                </button>
              </>
            ) : isTenant ? (
              <>
                <UserProfileChip
                  initialsFrom={tenantProfile?.full_name || tenantProfile?.email}
                  fullName={tenantProfile?.full_name || null}
                  email={tenantProfile?.email}
                  role={tenantProfile?.company_name || 'Tenant'}
                />
                <button
                  onClick={tenantLogout}
                  className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-md text-vend-white bg-vend-black hover:bg-vend-slate transition-colors sm:px-4"
                >
                  Logout
                </button>
              </>
            ) : null}
          </div>

        </div>

        <div className="sm:hidden border-t border-vend-concrete mt-2 pt-2">
          <div className="flex space-x-4">
            <a
              href="/"
              onClick={handleHomeClick}
              className={`flex-1 text-center pb-2 cursor-pointer ${isHomePage || isFloorPage || isSummaryPage ? 'border-b-2 border-vend-mint' : ''}`}
            >
              <span className={`text-sm font-semibold ${isHomePage || isFloorPage || isSummaryPage ? 'text-vend-black' : 'text-vend-slate'}`}>
                {user ? 'Summary' : 'Home'}
              </span>
            </a>

            {user && !isTenant && !isPhone && (
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
