'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminBackLink from '@/components/admin/AdminBackLink'

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

  // Set password directly (super admin): creates the login if needed and grants admin access
  const [pwEmail, setPwEmail] = useState('')
  const [pwPassword, setPwPassword] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwShow, setPwShow] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const handleSetPassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    const targetEmail = pwEmail.trim()
    if (!targetEmail) return setPwError('Please enter the admin email.')
    if (pwPassword.length < 8) return setPwError('Password must be at least 8 characters.')
    if (pwPassword !== pwConfirm) return setPwError('Passwords do not match.')

    setPwLoading(true)
    try {
      const res = await fetch('/api/admin/set-user-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: pwPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPwError(data.error || 'Something went wrong.')
      } else if (data.warning) {
        setPwError(data.warning)
      } else {
        setPwSuccess(data.created
          ? `Admin login created for ${targetEmail}. They can sign in at /admin now.`
          : `Password updated for ${targetEmail}.`)
        setPwEmail('')
        setPwPassword('')
        setPwConfirm('')
        setPwShow(false)
      }
    } catch {
      setPwError('Something went wrong. Please try again.')
    } finally {
      setPwLoading(false)
    }
  }

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
        <AdminBackLink className="mb-2" />
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

      <div className="mt-10 mb-4">
        <h2 className="text-lg font-bold text-gray-900">Set Admin Password</h2>
        <p className="text-gray-500 text-sm mt-1">
          Set a password for an admin directly. If they don&apos;t have a login yet, one is created and they get admin access right away.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSetPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
            <input
              type="email"
              required
              value={pwEmail}
              onChange={(e) => setPwEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="admin@example.com"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={pwShow ? 'text' : 'password'}
                  required
                  value={pwPassword}
                  onChange={(e) => setPwPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setPwShow(!pwShow)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  aria-label={pwShow ? 'Hide password' : 'Show password'}
                >
                  {pwShow ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type={pwShow ? 'text' : 'password'}
                required
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
              {pwError}
            </div>
          )}

          {pwSuccess && (
            <div className="p-3 rounded-lg bg-green-50 text-green-800 border border-green-200 text-sm">
              ✅ {pwSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full py-2 px-4 bg-gray-900 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwLoading ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
