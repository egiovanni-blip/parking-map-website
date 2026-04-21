'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthPageBackdrop from '@/components/AuthPageBackdrop'

function TenantLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const errorParam = searchParams.get('error')

  const handleSubmit = async () => {
    if (!email) return setError('Please enter your email.')
    if (!password) return setError('Please enter your password.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tenant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Something went wrong.')
      router.replace('/floor/2')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {errorParam === 'invalid' && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          Invalid session. Please log in again.
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
        <input
          type="email"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In →'}
      </button>

      <div className="mt-4 text-center space-y-2">
        <p className="text-xs text-gray-400">
          First time?{' '}
          <Link href="/tenant/set-password" className="text-blue-600 hover:underline">
            Set your password
          </Link>
        </p>
        <p className="text-xs text-gray-400">
          Contact your property manager if you need access.
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          Are you an admin?{' '}
          <Link href="/login" className="text-gray-500 hover:text-gray-700 hover:underline">
            Admin Login →
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function TenantLoginPage() {
  return (
    <AuthPageBackdrop>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-gray-900 px-6 py-5">
            <h1 className="text-white font-bold text-xl">🅿️ Parking Map Access</h1>
            <p className="text-gray-400 text-sm mt-1">Sign in to view your parking spaces</p>
          </div>
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
            <TenantLoginForm />
          </Suspense>
        </div>
      </div>
    </AuthPageBackdrop>
  )
}
