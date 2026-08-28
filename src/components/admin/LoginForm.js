'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AdminAuthShell } from '@/components/AdminAuthBackdrop'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email) return setError('Please enter your email.')
    if (!password) return setError('Please enter your password.')

    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (loginError) {
      setError(loginError.message || 'Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <AdminAuthShell
      title="Admin sign-in"
      subtitle="Manage parking, tenants, and allocations."
    >
      <form onSubmit={handleLogin} className="space-y-5 bg-vend-warm-100/50 p-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-vend-black">
            Admin email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-vend-concrete bg-vend-white px-4 py-3 text-vend-black placeholder:text-vend-slate/50 focus:border-vend-black focus:outline-none focus:ring-2 focus:ring-vend-black"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-semibold text-vend-black">
              Password
            </label>
            <Link
              href="/admin/set-password"
              className="text-xs text-vend-slate underline-offset-2 hover:text-vend-black hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-vend-concrete bg-vend-white px-4 py-3 pr-12 text-vend-black placeholder:text-vend-slate/50 focus:border-vend-black focus:outline-none focus:ring-2 focus:ring-vend-black"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-vend-slate hover:text-vend-black"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-[#FF9798] bg-[#FFD6D7] p-3 text-sm text-[#B12829]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="vend-btn-primary w-full rounded-lg px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-vend-slate/80">
          Contact the super admin if you need access.
        </p>

        <div className="border-t border-vend-concrete pt-4 flex flex-wrap items-center justify-center gap-2">
          <p className="text-xs text-vend-slate">Looking for tenant parking access?</p>
          <Link
            href="/tenant/login"
            className="inline-flex items-center justify-center px-4 py-1.5 bg-vend-mint text-vend-black text-xs font-semibold rounded-full hover:bg-vend-mint-600 transition-colors"
          >
            Tenant login
          </Link>
        </div>
      </form>
    </AdminAuthShell>
  )
}
