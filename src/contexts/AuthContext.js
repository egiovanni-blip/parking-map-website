'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isPhoneViewport } from '@/lib/phone-viewport'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isTenant, setIsTenant] = useState(false)
  const [tenantProfile, setTenantProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const checkTenantSession = async () => {
    try {
      const res = await fetch('/api/tenant/session')
      const data = await res.json()
      if (data.isTenant === true) {
        setTenantProfile({
          email: data.email || null,
          full_name: data.full_name || null,
          company_name: data.company_name || null,
        })
        return true
      }
      setTenantProfile(null)
      return false
    } catch {
      setTenantProfile(null)
      return false
    }
  }

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          setIsTenant(false)
          setTenantProfile(null)
          if (window.location.pathname === '/login') {
            router.push(isPhoneViewport() ? '/admin/summary' : '/admin')
          }
        } else {
          setUser(null)
          const tenantActive = await checkTenantSession()
          setIsTenant(tenantActive)
        }
      } catch (err) {
        console.error('Auth check error:', err)
        setUser(null)
        const tenantActive = await checkTenantSession()
        setIsTenant(tenantActive)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setIsTenant(false)
          setTenantProfile(null)
          // Only redirect to admin when coming from the login page
          if (window.location.pathname === '/login') {
            router.push(isPhoneViewport() ? '/admin/summary' : '/admin')
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsTenant(false)
          setTenantProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const logout = async () => {
    await supabase.auth.signOut()
    // Also clear tenant session if somehow both are active
    await fetch('/api/tenant/logout', { method: 'POST' })
    setUser(null)
    setIsTenant(false)
    setTenantProfile(null)
    router.push('/')
  }

  const tenantLogout = async () => {
    await fetch('/api/tenant/logout', { method: 'POST' })
    setIsTenant(false)
    setTenantProfile(null)
    router.push('/tenant/login')
  }

  // Call this right after a successful tenant login so the header updates immediately
  const refreshTenantStatus = async () => {
    const tenantActive = await checkTenantSession()
    setIsTenant(tenantActive)
    if (!tenantActive) setTenantProfile(null)
  }

  const value = { user, isTenant, tenantProfile, loading, logout, tenantLogout, refreshTenantStatus }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}