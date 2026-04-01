import React from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Toast, showToast } from '../../components/UI'
import Brand from '../../components/Brand'

export default function LoginPage() {
  const { loginWithGoogle, user, loading } = useAuth()

  const handleLogin = async () => {
    try {
      await loginWithGoogle()
      showToast('Sesión iniciada', 'success')
    } catch {
      showToast('No se pudo iniciar sesión', 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <Toast />
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Validando sesión…</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/app/resumen" replace />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <Toast />

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '2rem',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          boxShadow: '0 16px 60px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ marginBottom: 14 }}>
            <Brand variant="black" height={36} />
          </div>

          <div
            style={{
              fontSize: 14,
              color: 'var(--text)',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Entra a tu sistema financiero personal
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.75 }}>
            Accede para crear o cargar tu información financiera y sincronizarla con Compás.
          </div>
        </div>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '0.95rem 1rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <LogIn size={16} />
          Continuar con Google
        </button>

        <div style={{ marginTop: '1rem', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
          Al continuar aceptas usar Compás como herramienta financiera personal en fase temprana.
        </div>
      </div>
    </div>
  )
}