import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { ensureUserDocument, ensureUserSettings } from '../services/firestore/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      try {
        if (nextUser) {
          await ensureUserDocument(nextUser.uid)
          await ensureUserSettings(nextUser.uid)
          setUser(nextUser)
        } else {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider)
    await ensureUserDocument(result.user.uid)
    await ensureUserSettings(result.user.uid)
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      loginWithGoogle,
      logout,
    }),
    [user, loading, loginWithGoogle, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }

  return ctx
}