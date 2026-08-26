'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
    // On success, AuthContext's onAuthStateChange redirects to /admin
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <div className="max-w-md w-full bg-vend-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-vend-black px-6 py-5">
          <p className="text-vend-mint text-xs font-semibold tracking-wide uppercase mb-1">The Republic</p>
          <h2 className="text-vend-white font-headline text-xl tracking-tight">
            Admin login
          </h2>
          <p className="text-vend-concrete text-sm mt-1 font-subhead">
            Sign in. Manage the garage.
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-vend-black mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-vend-concrete text-vend-black rounded-lg focus:outline-none focus:ring-2 focus:ring-vend-black focus:border-vend-black placeholder:text-vend-slate/50"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-vend-black">
                Password
              </label>
              <Link
                href="/admin/set-password"
                className="text-xs text-vend-slate hover:text-vend-black underline-offset-2 hover:underline"
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
                className="w-full px-4 py-3 border border-vend-concrete text-vend-black rounded-lg focus:outline-none focus:ring-2 focus:ring-vend-black focus:border-vend-black placeholder:text-vend-slate/50 pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-vend-slate hover:text-vend-black"
                tabIndex={-1}
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
            <div className="p-3 rounded-lg bg-[#FFD6D7] text-[#B12829] border border-[#FF9798] text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 vend-btn-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-center text-sm text-vend-slate space-y-2">
            <p>
              First time or invited?{' '}
              <Link href="/admin/set-password" className="text-vend-black font-semibold hover:underline underline-offset-2">
                Set your password
              </Link>
            </p>
            <p className="text-xs text-vend-slate/80">Contact the super admin if you need access.</p>
          </div>
        </form>
      </div>
    </div>
  )
}
