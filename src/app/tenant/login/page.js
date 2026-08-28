'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthPageBackdrop from '@/components/AuthPageBackdrop'
import PasswordVisibilityToggle from '@/components/PasswordVisibilityToggle'
import { useAuth } from '@/contexts/AuthContext'

function TenantLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshTenantStatus } = useAuth()
  const errorParam = searchParams.get('error')
  const reasonParam = searchParams.get('reason')

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
      if (!res.ok) {
        if (data.code === 'PASSWORD_NOT_SET') {
          return setError('No password set yet. Use "Set your password" below to get a verification code.')
        }
        return setError(data.error || 'Something went wrong.')
      }
      // Update the AuthContext so the header shows Logout immediately (no refresh needed)
      await refreshTenantStatus()
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
      {reasonParam === 'expired' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-4">
          Your session has expired. Please sign in again.
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-semibold text-vend-black mb-1">Email Address</label>
        <input
          type="email"
          className="w-full border border-vend-concrete rounded-lg px-3 py-2 text-sm text-vend-black placeholder:text-vend-slate/50 focus:outline-none focus:ring-2 focus:ring-vend-black"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-vend-black mb-1">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full border border-vend-concrete rounded-lg pl-3 pr-10 py-2 text-sm text-vend-black placeholder:text-vend-slate/50 focus:outline-none focus:ring-2 focus:ring-vend-black"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-3 flex items-center text-vend-slate hover:text-vend-black"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
          >
            <PasswordVisibilityToggle visible={showPassword} />
          </button>
        </div>
        <div className="mt-1 text-right">
          <Link href="/tenant/set-password" className="text-xs text-vend-slate hover:text-vend-black hover:underline underline-offset-2">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-vend-red text-sm mt-2">{error}</p>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-2.5 vend-btn-primary rounded-lg text-sm disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>

      <div className="mt-4 text-center space-y-2">
        <p className="text-xs text-vend-slate">
          First time?{' '}
          <Link href="/tenant/set-password" className="text-vend-black font-semibold hover:underline underline-offset-2">
            Set your password
          </Link>
        </p>
        <p className="text-xs text-vend-slate/80">
          Contact your property manager if you need access.
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-vend-concrete flex flex-wrap items-center justify-center gap-2">
        <p className="text-xs text-vend-slate">Are you an admin?</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-1.5 bg-vend-mint text-vend-black text-xs font-semibold rounded-full hover:bg-vend-mint-600 transition-colors"
        >
          Admin login
        </Link>
      </div>
    </div>
  )
}

export default function TenantLoginPage() {
  return (
    <AuthPageBackdrop>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-vend-concrete/40">
          <div className="bg-vend-black px-6 py-5">
            <p className="text-vend-mint text-xs font-semibold tracking-wide uppercase mb-1">The Republic</p>
            <h1 className="text-vend-white font-headline text-xl tracking-tight">Tenant access</h1>
            <p className="text-vend-concrete text-sm mt-1 font-subhead">Sign in. See your spaces.</p>
          </div>
          <Suspense fallback={<div className="p-6 text-center text-vend-slate">Loading...</div>}>
            <TenantLoginForm />
          </Suspense>
        </div>
      </div>
    </AuthPageBackdrop>
  )
}
