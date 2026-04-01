import React from 'react'
import { Navigate, Outlet, NavLink, createBrowserRouter } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Toast, showToast } from './components/UI'
import { createEmptyState } from './domain/factories'

import ResumenPage from './features/resumen/ResumenPage'
import IngresosPage from './features/ingresos/IngresosPage'
import GastosPage from './features/gastos/GastosPage'
import DeudasPage from './features/deudas/DeudasPage'
import InversionesPage from './features/inversiones/InversionesPage'
import ActivosPage from './features/activos/ActivosPage'
import MetasPage from './features/metas/MetasPage'
import SeguimientoPage from './features/seguimiento/SeguimientoPage'
import SimuladorPage from './features/simulador/SimuladorPage'
import EscenariosPage from './features/escenarios/EscenariosPage'

import {
  LayoutDashboard,
  Settings,
  DollarSign,
  GitCompare,
  TrendingUp,
  RotateCcw,
  Wallet,
  Landmark,
  Package,
  Calculator,
  Target,
  Download,
  Upload,
  LogIn,
  LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/resumen', label: 'Resumen', icon: LayoutDashboard },
  { to: '/ingresos', label: 'Ingresos', icon: Wallet },
  { to: '/deudas', label: 'Deudas', icon: Landmark },
  { to: '/gastos', label: 'Gastos', icon: Settings },
  { to: '/inversiones', label: 'Inversiones', icon: DollarSign },
  { to: '/activos', label: 'Activos', icon: Package },
  { to: '/escenarios', label: 'Escenarios', icon: GitCompare },
  { to: '/simulador', label: '¿Puedo comprarlo?', icon: Calculator },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/seguimiento', label: 'Seguimiento', icon: TrendingUp },
]

function LoginScreen() {
  const { loginWithGoogle } = useAuth()

  const handleLogin = async () => {
    try {
      await loginWithGoogle()
      showToast('Sesión iniciada', 'success')
    } catch {
      showToast('No se pudo iniciar sesión', 'error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <Toast />
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '2rem',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', marginBottom: 6 }}>
            Compás
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>
            Tu sistema financiero personal. Inicia sesión para crear o cargar tu plan y sincronizarlo con Firestore.
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
            padding: '0.85rem 1rem',
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
      </div>
    </div>
  )
}

function AppLayout() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Sesión cerrada', 'success')
    } catch {
      showToast('No se pudo cerrar sesión', 'error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toast />

      <header
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 52,
          flexShrink: 0,
          background: 'var(--bg)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)' }}>Compás</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {user?.email || 'sesión activa'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
              borderRadius: 6,
              padding: '5px 11px',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'var(--font-body)',
            }}
          >
            <LogOut size={11} />
            Salir
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <nav
          style={{
            width: 210,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            padding: '1rem 0',
            position: 'sticky',
            top: 52,
            height: 'calc(100vh - 52px)',
            overflowY: 'auto',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1 }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '9px 1.25rem',
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                    color: isActive ? 'var(--accent)' : 'var(--text-3)',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative',
                    textDecoration: 'none',
                  })}
                >
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </NavLink>
              )
            })}
          </div>

          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Datos sincronizados en Firestore
            </div>
          </div>
        </nav>

        <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function ProtectedApp() {
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
    return <LoginScreen />
  }

  return <AppLayout />
}

function PageTitle({ title, children }) {
  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 400,
            color: 'var(--text)',
          }}
        >
          {title}
        </h1>
      </div>
      {children}
    </>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedApp />,
    children: [
      { index: true, element: <Navigate to="/resumen" replace /> },
      { path: 'resumen', element: <PageTitle title="Resumen"><ResumenPage /></PageTitle> },
      { path: 'ingresos', element: <PageTitle title="Ingresos"><IngresosPage /></PageTitle> },
      { path: 'gastos', element: <PageTitle title="Gastos"><GastosPage /></PageTitle> },
      { path: 'deudas', element: <PageTitle title="Deudas"><DeudasPage /></PageTitle> },
      { path: 'inversiones', element: <PageTitle title="Inversiones"><InversionesPage /></PageTitle> },
      { path: 'activos', element: <PageTitle title="Activos"><ActivosPage /></PageTitle> },
      { path: 'metas', element: <PageTitle title="Metas"><MetasPage /></PageTitle> },
      { path: 'seguimiento', element: <PageTitle title="Seguimiento"><SeguimientoPage /></PageTitle> },
      { path: 'simulador', element: <PageTitle title="¿Puedo comprarlo?"><SimuladorPage /></PageTitle> },
      { path: 'escenarios', element: <PageTitle title="Escenarios"><EscenariosPage /></PageTitle> },
    ],
  },
])