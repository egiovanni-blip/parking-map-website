'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isTenant, setIsTenant] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Use the server-side session API — more reliable than parsing document.cookie
  const checkTenantSession = async () => {
    try {
      const res = await fetch('/api/tenant/session')
      const data = await res.json()
      return data.isTenant === true
    } catch {
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
          if (window.location.pathname === '/login') {
            router.push('/admin')
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
          // Only redirect to admin when coming from the login page
          if (window.location.pathname === '/login') {
            router.push('/admin')
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsTenant(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('supabase-user')
    localStorage.removeItem('supabase-auth-token')
    document.cookie = 'tenant_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    setUser(null)
    setIsTenant(false)
    router.push('/')
  }

  const tenantLogout = () => {
    document.cookie = 'tenant_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    setIsTenant(false)
    router.push('/tenant/login')
  }

  // Call this right after a successful tenant login so the header updates immediately
  const refreshTenantStatus = async () => {
    const tenantActive = await checkTenantSession()
    setIsTenant(tenantActive)
  }

  const value = { user, isTenant, loading, logout, tenantLogout, refreshTenantStatus }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}