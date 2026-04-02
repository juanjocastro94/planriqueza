import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { ensureUserDocument, ensureUserSettings } from '../services/firestore/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
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

  const registerWithEmail = useCallback(async (email, password, nombre) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (nombre?.trim()) {
      await updateProfile(result.user, { displayName: nombre.trim() })
    }
    await ensureUserDocument(result.user.uid)
    await ensureUserSettings(result.user.uid)
    setUser({ ...result.user, displayName: nombre?.trim() || result.user.displayName })
    return result.user
  }, [])

  const loginWithEmail = useCallback(async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    await ensureUserDocument(result.user.uid)
    await ensureUserSettings(result.user.uid)
    setUser(result.user)
    return result.user
  }, [])

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email)
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user, loading,
    isAuthenticated: !!user,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout,
  }), [user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}