'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/list-users')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setAdmins(data.admins || [])
      })
      .catch(() => setError('Failed to load admin users.'))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-gray-500 text-sm mt-1">All users with admin access to this portal</p>
        </div>
        <Link
          href="/admin/users"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Set Password
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>
      ) : admins.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-gray-500 text-sm">No admin users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Last Sign In</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Added</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-900 font-medium">{admin.email}</td>
                  <td className="px-4 py-3">
                    {admin.is_super ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
                        Super Admin
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      admin.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(admin.last_sign_in)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(admin.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
