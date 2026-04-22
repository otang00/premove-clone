import { createContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseClientReady, supabase } from '../lib/supabaseClient'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    if (!isSupabaseClientReady || !supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session || null)
      setUser(data.session?.user || null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession || null)
      setUser(nextSession?.user || null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    loading,
    session,
    user,
    isAuthenticated: Boolean(user),
    isSupabaseClientReady,
    signOut: async () => {
      if (!supabase) return
      await supabase.auth.signOut()
    },
  }), [loading, session, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
