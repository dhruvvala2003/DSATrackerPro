import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const ADMIN_EMAIL = 'dkvala2003@gmail.com'

export async function checkUserApproval(userId, email) {
  if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { allowed: true, status: 'approved' }
  }

  try {
    const { data, error } = await supabase
      .from('user_approvals')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.warn('Error checking user approval:', error)
      // If table doesn't exist yet or query fails, give informative message
      return {
        allowed: false,
        status: 'error',
        message: 'Could not verify account approval status. Please check back shortly.',
      }
    }

    if (!data) {
      return {
        allowed: false,
        status: 'pending',
        message: 'Your account is pending admin approval. Please wait for the master account (dkvala2003@gmail.com) to approve your access.',
      }
    }

    if (data.status === 'approved') {
      return { allowed: true, status: 'approved' }
    }

    if (data.status === 'pending') {
      return {
        allowed: false,
        status: 'pending',
        message: 'Your account is pending admin approval. Please wait for the admin to approve your request.',
      }
    }

    if (data.status === 'blocked' || data.status === 'inactive') {
      return {
        allowed: false,
        status: 'blocked',
        message: 'Your account has been blocked by the admin. Please contact dkvala2003@gmail.com to restore access.',
      }
    }

    if (data.status === 'rejected') {
      return {
        allowed: false,
        status: 'rejected',
        message: 'Your registration request was rejected by the admin.',
      }
    }

    return {
      allowed: false,
      status: 'inactive',
      message: 'Your account is not active. Please contact the administrator.',
    }
  } catch (err) {
    console.error('checkUserApproval unexpected error:', err)
    return {
      allowed: false,
      status: 'error',
      message: 'Failed to verify account permissions.',
    }
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [authError, setAuthError] = useState(null)

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setUser(null)
      setSession(null)
    }
  }, [])

  useEffect(() => {
    // Initial session load & auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        try {
          // Password recovery link
          if (_event === 'PASSWORD_RECOVERY') {
            setRecoveryMode(true)
            setSession(newSession)
            setUser(newSession?.user ?? null)
            setLoading(false)
            return
          }

          // Silent token refresh or profile updates
          if (_event === 'USER_UPDATED' || _event === 'TOKEN_REFRESHED') {
            setRecoveryMode(false)
            setSession(newSession)
            setUser(newSession?.user ?? null)
            setLoading(false)
            return
          }

          setRecoveryMode(false)
          const currentUser = newSession?.user ?? null

          if (currentUser) {
            // Approval check for regular users
            const { allowed, message } = await checkUserApproval(currentUser.id, currentUser.email)
            if (!allowed) {
              setAuthError(message || 'Access denied.')
              setUser(null)
              setSession(null)
              setLoading(false)
              await supabase.auth.signOut()
              return
            }
          }

          setSession(newSession)
          setUser(currentUser)
          setLoading(false)
        } catch (err) {
          console.error('Auth state change handler failed:', err)
          setUser(null)
          setSession(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const isAdmin = Boolean(user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        recoveryMode,
        authError,
        isAdmin,
        clearAuthError,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
