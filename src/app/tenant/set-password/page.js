'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthPageBackdrop from '@/components/AuthPageBackdrop'

export default function SetPasswordPage() {
  const [step, setStep] = useState(1) // 1 = enter email, 2 = enter code + password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSendCode = async () => {
    if (!email) return setError('Please enter your email address.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tenant/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      // Always advance to step 2 — don't reveal whether the email is registered
      setStep(2)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setResending(true)
    setError('')
    try {
      await fetch('/api/tenant/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
    } finally {
      setResending(false)
    }
  }

  const handleSetPassword = async () => {
    if (!otp) return setError('Please enter the verification code.')
    if (!password) return setError('Please enter a password.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tenant/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Something went wrong.')
      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageBackdrop>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-vend-black px-6 py-5">
            <p className="text-vend-mint text-xs font-semibold tracking-wide uppercase mb-1">The Republic</p>
            <h1 className="text-vend-white font-headline text-xl tracking-tight">Set your password</h1>
            <p className="text-vend-concrete text-sm mt-1 font-subhead">
              {step === 1
                ? 'Enter your email to receive a verification code'
                : 'Enter the code we sent you, then choose a password'}
            </p>
          </div>

          <div className="p-6">
            {success ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Password set!</h2>
                <p className="text-gray-600 text-sm mb-6">
                  We sent a confirmation to your email. You can now sign in with your email and password.
                </p>
                <Link
                  href="/tenant/login"
                  className="block w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium text-center"
                >
                  Go to Sign In →
                </Link>
              </div>
            ) : step === 1 ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  You must be registered by your property manager before setting a password.
                  If you don&apos;t receive a code, contact them to confirm your email is on file.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                  />
                </div>
                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                <button
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <p className="text-xs text-vend-slate">Already have a password?</p>
                  <Link
                    href="/tenant/login"
                    className="inline-flex items-center justify-center px-4 py-1.5 bg-vend-mint text-vend-black text-xs font-semibold rounded-full hover:bg-vend-mint-600 transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm text-blue-800">
                  We sent a 6-digit code to <strong>{email}</strong>. It expires in 15 minutes.
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 tracking-widest font-mono text-center text-lg"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700"
                      onClick={() => setShowPassword(v => !v)}
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

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Re-enter your password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700"
                      onClick={() => setShowPassword(v => !v)}
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

                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

                <button
                  onClick={handleSetPassword}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Set Password →'}
                </button>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <button onClick={() => { setStep(1); setError('') }} className="hover:text-gray-600">
                    ← Use a different email
                  </button>
                  <button
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend code'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthPageBackdrop>
  )
}
