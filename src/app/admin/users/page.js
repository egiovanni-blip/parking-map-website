'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminUsersPage() {
  const [email, setEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/my-role')
      .then(res => res.json())
      .then(data => { if (!data.isSuperAdmin) router.replace('/admin') })
      .catch(() => router.replace('/admin'))
  }, [router])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) return setError('Please enter the admin email.')

    setLoading(true)

    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
      } else {
        setSuccess(data.message || `Invite sent to ${email.trim()}. They can set their password from the admin login page.`)
        setEmail('')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invite Admin User</h1>
        <p className="text-gray-500 text-sm mt-1">
          Send an email verification code so the new admin can choose their own password.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="admin@example.com"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-50 text-green-800 border border-green-200 text-sm">
              ✅ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-900 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending invite...' : 'Send Invite & Verification Code'}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        The invited user sets their password at{' '}
        <a href="/admin/set-password" className="text-blue-600 hover:underline">/admin/set-password</a>
        {' '}after receiving the code.
      </p>
    </div>
  )
}
