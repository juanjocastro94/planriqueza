import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Toast, showToast } from './UI'
import Brand from './Brand'
import SidebarNavItem from './SidebarNavItem'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard,
  Settings,
  DollarSign,
  GitCompare,
  TrendingUp,
  Wallet,
  Landmark,
  Package,
  Calculator,
  Target,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/app/resumen', label: 'Resumen', icon: LayoutDashboard },
  { to: '/app/ingresos', label: 'Ingresos', icon: Wallet },
  { to: '/app/deudas', label: 'Deudas', icon: Landmark },
  { to: '/app/gastos', label: 'Gastos', icon: Settings },
  { to: '/app/inversiones', label: 'Inversiones', icon: DollarSign },
  { to: '/app/activos', label: 'Activos', icon: Package },
  { to: '/app/escenarios', label: 'Escenarios', icon: GitCompare },
  { to: '/app/simulador', label: '¿Puedo comprarlo?', icon: Calculator },
  { to: '/app/metas', label: 'Metas', icon: Target },
  { to: '/app/seguimiento', label: 'Seguimiento', icon: TrendingUp },
]

const SIDEBAR_STORAGE_KEY = 'compas-sidebar-collapsed'

export default function AppShell() {
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    setCollapsed(stored === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Sesión cerrada', 'success')
    } catch {
      showToast('No se pudo cerrar sesión', 'error')
    }
  }

  const handleProfileClick = () => {
    showToast('Perfil próximamente', 'info')
  }

  const sidebarWidth = collapsed ? 76 : 228

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <Toast />

      <nav
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          height: '100vh',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'visible',
          position: 'sticky',
          top: 0,
          transition: 'width 0.18s ease',
        }}
      >
        <div
          style={{
            padding: collapsed ? '1rem 0.5rem 0.9rem' : '1rem 1rem 0.9rem',
            borderBottom: '1px solid var(--border)',
            transition: 'padding 0.18s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 8,
              marginBottom: 12,
              minHeight: 24,
            }}
          >
            {!collapsed && <Brand variant="black" height={24} />}
          </div>

          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1px solid rgba(183,222,74,0.28)',
              background: 'var(--accent)',
              color: '#0a0a0a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 700,
              padding: collapsed ? '0' : '0 12px',
              boxShadow: '0 8px 22px rgba(183,222,74,0.18)',
              transition: 'all 0.18s ease',
            }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span>Contraer menú</span>}
          </button>
        </div>

        <div
          style={{
            flex: 1,
            padding: '0.75rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>

        <div
          style={{
            padding: collapsed ? '1rem 0.5rem' : '1rem 1.25rem',
            borderTop: '1px solid var(--border)',
            marginTop: 'auto',
            transition: 'padding 0.18s ease',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-3)',
              lineHeight: 1.6,
              textAlign: collapsed ? 'center' : 'left',
            }}
          >
            {collapsed ? 'Sync' : 'Datos sincronizados en Firestore'}
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header
          style={{
            borderBottom: '1px solid var(--border)',
            padding: '0 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56,
            flexShrink: 0,
            background: 'var(--bg)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {collapsed && <Brand variant="black" height={22} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleProfileClick}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-2)',
                color: 'var(--text-2)',
                borderRadius: 8,
                padding: '6px 11px',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
              }}
            >
              <User size={11} />
              Perfil
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
                borderRadius: 8,
                padding: '6px 11px',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
              }}
            >
              <LogOut size={11} />
              Salir
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}