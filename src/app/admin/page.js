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
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.email}
        </p>
      </div>
      {/* Requests Navigation */}
<div className="mt-6 mb-8 flex flex-wrap gap-3">
  <Link
    href="/admin/requests"
    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl shadow hover:bg-gray-700 transition-colors font-medium"
  >
    📋 View Parking Requests
  </Link>
  <Link
    href="/admin/tenants"
    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl shadow hover:bg-gray-700 transition-colors font-medium"
  >
    🏢 Manage Tenant Contacts
  </Link>
  <Link
    href="/admin/summary"
    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl shadow hover:bg-gray-700 transition-colors font-medium"
  >
    📊 Allocation Summary
  </Link>
  {isSuperAdmin && (
    <Link
      href="/admin/team"
      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl shadow hover:bg-gray-700 transition-colors font-medium"
    >
      👥 Admin Users
    </Link>
  )}
</div>

      {/* Floor Navigation */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Manage Floors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {FLOORS.map(({ route, label }) => (
            <Link
              key={route}
              href={`/admin/floor/${route}`}
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all duration-200 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{label}</h3>
                  <p className="text-sm text-gray-500 mt-1">Edit parking layout</p>
                </div>
                <span className="text-blue-600 text-xl">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}