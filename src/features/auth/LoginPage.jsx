import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Toast, showToast, Field } from '../../components/UI'
import Brand from '../../components/Brand'
import { Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Ícono Google SVG (no usa lucide)
// ─────────────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Botón de proveedor
// ─────────────────────────────────────────────────────────────────────────────
function ProviderBtn({ icon, label, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '11px 16px', borderRadius: 10,
      border: '1px solid var(--border-2)', background: 'var(--bg-3)',
      color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
      opacity: loading ? 0.6 : 1,
      transition: 'background .15s, border-color .15s',
    }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--bg-4)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-3)' }}
    >
      {icon}
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Separador
// ─────────────────────────────────────────────────────────────────────────────
function Divider({ label = 'o continúa con' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Input email/contraseña
// ─────────────────────────────────────────────────────────────────────────────
function AuthInput({ label, type = 'text', value, onChange, placeholder, autoFocus, right }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '.02em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: right ? '9px 40px 9px 12px' : '9px 12px',
            borderRadius: 8, border: '1px solid var(--border-2)',
            background: 'var(--bg-3)', color: 'var(--text)',
            fontFamily: 'var(--font-body)', fontSize: 14,
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
        />
        {right && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            {right}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, user, loading } = useAuth()

  // 'login' | 'register' | 'reset'
  const [mode, setMode]               = useState('login')
  const [nombre, setNombre]           = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [resetSent, setResetSent]     = useState(false)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <Toast />
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Validando sesión…</div>
      </div>
    )
  }

  if (user) return <Navigate to="/app/resumen" replace />

  const handleGoogle = async () => {
    setSubmitting(true)
    try {
      await loginWithGoogle()
    } catch {
      showToast('No se pudo conectar con Google', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEmailSubmit = async (e) => {
    e?.preventDefault()
    if (!email.trim() || !password.trim()) return
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password)
      } else {
        if (!nombre.trim()) { showToast('Ingresa tu nombre', 'error'); return }
        await registerWithEmail(email.trim(), password, nombre.trim())
        showToast('¡Cuenta creada! Bienvenido a Compás', 'success')
      }
    } catch (err) {
      const msg = {
        'auth/user-not-found':      'No encontramos una cuenta con ese correo',
        'auth/wrong-password':      'Contraseña incorrecta',
        'auth/email-already-in-use':'Ya existe una cuenta con ese correo',
        'auth/weak-password':       'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email':       'El correo no es válido',
        'auth/invalid-credential':  'Correo o contraseña incorrectos',
      }[err.code] || 'Ocurrió un error, intenta de nuevo'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e) => {
    e?.preventDefault()
    if (!email.trim()) { showToast('Ingresa tu correo', 'error'); return }
    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      setResetSent(true)
    } catch {
      showToast('No pudimos enviar el correo', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Estilos del card ──
  const card = {
    width: '100%', maxWidth: 420, padding: '2rem',
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 18, boxShadow: '0 16px 60px rgba(0,0,0,0.18)',
  }

  // ── Vista: Reset password ──
  if (mode === 'reset') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: '1rem' }}>
        <Toast />
        <div style={card}>
          <button onClick={() => { setMode('login'); setResetSent(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)', marginBottom: '1.5rem', padding: 0, fontFamily: 'var(--font-body)' }}>
            <ArrowLeft size={14} /> Volver
          </button>

          <div style={{ marginBottom: '1.5rem' }}>
            <Brand variant="black" height={32} />
            <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Recuperar contraseña</div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Te enviaremos un enlace para restablecer tu contraseña.
            </div>
          </div>

          {resetSent ? (
            <div style={{ background: 'rgba(183,222,74,.1)', border: '1px solid rgba(183,222,74,.25)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#4a6b10', lineHeight: 1.6 }}>
              ✅ Revisa tu correo — te enviamos el enlace de recuperación a <strong>{email}</strong>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <AuthInput label="Correo electrónico" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" autoFocus />
              <button type="submit" disabled={submitting} style={{
                width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                background: 'var(--accent)', color: '#1a2a0a', fontWeight: 700,
                fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ── Vista: Login / Registro ──
  const isLogin = mode === 'login'

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: '1rem' }}>
      <Toast />
      <div style={card}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Brand variant="black" height={32} />
          <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {isLogin ? 'Entra a tu sistema financiero' : 'Crea tu cuenta en Compás'}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
            {isLogin
              ? 'Accede para ver tu resumen financiero personalizado.'
              : 'Empieza gratis. Tu información financiera, organizada.'}
          </div>
        </div>

        {/* Google */}
        <ProviderBtn
          icon={<GoogleIcon />}
          label={isLogin ? 'Continuar con Google' : 'Registrarse con Google'}
          onClick={handleGoogle}
          loading={submitting}
        />

        <Divider />

        {/* Form email/contraseña */}
        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isLogin && (
            <AuthInput label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="¿Cómo te llamas?" autoFocus={!isLogin} />
          )}
          <AuthInput label="Correo electrónico" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
            autoFocus={isLogin} />
          <AuthInput label="Contraseña" type={showPass ? 'text' : 'password'}
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
            right={
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-3)', padding: 0 }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />

          {/* Olvidé mi contraseña */}
          {isLogin && (
            <button type="button" onClick={() => setMode('reset')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', fontSize: 12, color: 'var(--text-3)', padding: 0, fontFamily: 'var(--font-body)' }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {/* Botón submit */}
          <button type="submit" disabled={submitting || !email || !password}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: submitting || !email || !password ? 'var(--bg-4)' : 'var(--accent)',
              color: submitting || !email || !password ? 'var(--text-3)' : '#1a2a0a',
              fontWeight: 700, fontSize: 14,
              cursor: submitting || !email || !password ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', transition: 'background .15s',
            }}>
            {submitting
              ? (isLogin ? 'Ingresando…' : 'Creando cuenta…')
              : (isLogin ? 'Entrar' : 'Crear cuenta gratis')}
          </button>
        </form>

        {/* Toggle login/registro */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button onClick={() => { setMode(isLogin ? 'register' : 'login'); setPassword('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--accent)', padding: 0, fontFamily: 'var(--font-body)' }}>
            {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
          </button>
        </div>

        {/* Legal */}
        <div style={{ marginTop: '1rem', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7, textAlign: 'center' }}>
          Al continuar aceptas usar Compás como herramienta financiera personal en fase temprana.
        </div>
      </div>
    </div>
  )
}