import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Toast } from './UI'

export default function RouteGuard({ children, redirectTo = '/login' }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <Toast />
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Validando sesión…</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}