'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TenantLoginPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const handleSubmit = async () => {
    if (!email) return setError('Please enter your email.')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/tenant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Something went wrong.')
      setSubmitted(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 px-6 py-5">
          <h1 className="text-white font-bold text-xl">🅿️ Parking Map Access</h1>
          <p className="text-gray-400 text-sm mt-1">Enter your email to view your parking spaces</p>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-600 text-sm">
                We sent a access link to <b>{email}</b>. Click the link to access your parking map.
              </p>
              <p className="text-gray-400 text-xs mt-3">Link expires in 30 minutes.</p>
            </div>
          ) : (
            <div>
              {errorParam === 'invalid' && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
                  This link is invalid or has already been used. Please request a new one.
                </div>
              )}
              {errorParam === 'expired' && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-4 py-3 text-sm mb-4">
                  This link has expired. Please request a new one.
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Access Link →'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-4">
                Only registered tenant emails can access this page.
                Contact your property manager if you need access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}