// This is now the admin dashboard (protected)
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FLOORS } from '@/lib/constants'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/admin/my-role')
      .then(res => res.json())
      .then(data => setIsSuperAdmin(data.isSuperAdmin ?? false))
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-vend-mint-700 text-xs font-semibold tracking-wide uppercase mb-2">The Republic</p>
        <h1 className="text-3xl font-headline text-vend-black tracking-tight">Admin dashboard</h1>
        <p className="text-vend-slate mt-2 font-normal">
          Welcome back, {user?.email}
        </p>
      </div>
      {/* Requests Navigation */}
<div className="mt-6 mb-8 flex flex-wrap gap-3">
  <Link
    href="/admin/requests"
    className="inline-flex items-center gap-2 px-6 py-2.5 bg-vend-mint text-vend-black font-semibold rounded-full shadow hover:bg-vend-mint-600 transition-colors"
  >
    View parking space requests
  </Link>
  <Link
    href="/admin/tenants"
    className="inline-flex items-center gap-2 px-6 py-2.5 bg-vend-mint text-vend-black font-semibold rounded-full shadow hover:bg-vend-mint-600 transition-colors"
  >
    Manage tenant contacts
  </Link>
  <Link
    href="/admin/summary"
    className="inline-flex items-center gap-2 px-6 py-2.5 bg-vend-mint text-vend-black font-semibold rounded-full shadow hover:bg-vend-mint-600 transition-colors"
  >
    Allocation summary
  </Link>
  {isSuperAdmin && (
    <Link
      href="/admin/team"
      className="inline-flex items-center gap-2 px-6 py-2.5 bg-vend-mint text-vend-black font-semibold rounded-full shadow hover:bg-vend-mint-600 transition-colors"
    >
      Admin users
    </Link>
  )}
</div>

      {/* Floor Navigation */}
      <div className="mt-8">
        <h2 className="text-xl font-headline text-vend-black mb-6 tracking-tight">Manage floors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {FLOORS.map(({ route, label }) => (
            <Link
              key={route}
              href={`/admin/floor/${route}`}
              className="bg-vend-white p-6 rounded-xl border border-vend-concrete shadow-sm hover:shadow-md hover:border-vend-mint-600 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-subhead text-vend-black text-lg">{label}</h3>
                  <p className="text-sm text-vend-slate mt-1">Edit parking layout</p>
                </div>
                <span className="text-vend-slate text-xl">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}