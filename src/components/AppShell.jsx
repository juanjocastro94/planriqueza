import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Toast, showToast } from './UI'
import Brand from './Brand'
import SidebarNavItem from './SidebarNavItem'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Settings, DollarSign, GitCompare,
  TrendingUp, Wallet, Landmark, Package, Calculator,
  Target, LogOut, PanelLeftClose, PanelLeftOpen, User, Menu, X,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/app/resumen',    label: 'Resumen',        icon: LayoutDashboard },
  { to: '/app/ingresos',   label: 'Ingresos',       icon: Wallet },
  { to: '/app/deudas',     label: 'Deudas',         icon: Landmark },
  { to: '/app/gastos',     label: 'Gastos',         icon: Settings },
  { to: '/app/inversiones',label: 'Inversiones',    icon: DollarSign },
  { to: '/app/activos',    label: 'Activos',        icon: Package },
  { to: '/app/escenarios', label: 'Escenarios',     icon: GitCompare },
  { to: '/app/simulador',  label: '¿Puedo comprarlo?', icon: Calculator },
  { to: '/app/metas',      label: 'Metas',          icon: Target },
  { to: '/app/seguimiento',label: 'Seguimiento',    icon: TrendingUp },
]

const SIDEBAR_STORAGE_KEY = 'compas-sidebar-collapsed'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function AppShell() {
  const { logout } = useAuth()
  const isMobile = useIsMobile()

  // Desktop: colapsado o expandido (persiste en localStorage)
  const [collapsed, setCollapsed] = useState(false)
  // Móvil: sidebar abierto como overlay
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    setCollapsed(stored === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  // Cerrar sidebar móvil al navegar
  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Sesión cerrada', 'success')
    } catch {
      showToast('No se pudo cerrar sesión', 'error')
    }
  }

  const sidebarWidth = isMobile ? 260 : (collapsed ? 76 : 228)

  const sidebarContent = (
    <nav style={{
      width: sidebarWidth,
      flexShrink: 0,
      height: '100vh',
      borderRight: '1px solid var(--border)',
      background: 'var(--bg-2)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'visible',
      transition: isMobile ? 'none' : 'width 0.18s ease',
    }}>
      <div style={{
        padding: collapsed && !isMobile ? '1rem 0.5rem 0.9rem' : '1rem 1rem 0.9rem',
        borderBottom: '1px solid var(--border)',
        transition: 'padding 0.18s ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          gap: 8, marginBottom: 12, minHeight: 24,
        }}>
          {(!collapsed || isMobile) && <Brand variant="black" height={24} />}
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: 4,
            }}>
              <X size={20} color="var(--text-2)" />
            </button>
          )}
        </div>

        {!isMobile && (
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            style={{
              width: '100%', height: 42, borderRadius: 10,
              border: '1px solid rgba(183,222,74,0.28)',
              background: 'var(--accent)', color: '#0a0a0a',
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 8, cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontSize: 12, fontWeight: 700,
              padding: collapsed ? '0' : '0 12px',
              boxShadow: '0 8px 22px rgba(183,222,74,0.18)',
              transition: 'all 0.18s ease',
            }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span>Contraer menú</span>}
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.to} onClick={handleNavClick}>
            <SidebarNavItem item={item} collapsed={collapsed && !isMobile} />
          </div>
        ))}
      </div>

      <div style={{
        padding: collapsed && !isMobile ? '1rem 0.5rem' : '1rem 1.25rem',
        borderTop: '1px solid var(--border)',
        marginTop: 'auto',
        transition: 'padding 0.18s ease',
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6, textAlign: collapsed && !isMobile ? 'center' : 'left' }}>
          {collapsed && !isMobile ? 'Sync' : 'Datos sincronizados en Firestore'}
        </div>
      </div>
    </nav>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <Toast />

      {/* ── Desktop sidebar ── */}
      {!isMobile && sidebarContent}

      {/* ── Móvil: overlay sidebar ── */}
      {isMobile && mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(20,24,16,0.45)',
              zIndex: 200,
            }}
          />
          {/* Sidebar panel */}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: sidebarWidth, zIndex: 201,
          }}>
            {sidebarContent}
          </div>
        </>
      )}

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56, flexShrink: 0,
          background: 'var(--bg)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Móvil: botón hamburguesa */}
            {isMobile ? (
              <button onClick={() => setMobileOpen(true)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: 4,
              }}>
                <Menu size={22} color="var(--text)" />
              </button>
            ) : (
              collapsed && <Brand variant="black" height={22} />
            )}
            {/* Móvil: logo en el centro del header */}
            {isMobile && <Brand variant="black" height={22} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => showToast('Perfil próximamente', 'info')} style={{
              background: '#ffffff', border: '1px solid var(--border-2)',
              color: 'var(--text-2)', borderRadius: 8,
              padding: isMobile ? '6px 8px' : '6px 11px',
              fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-body)', fontWeight: 600,
            }}>
              <User size={11} />
              {!isMobile && 'Perfil'}
            </button>

            <button onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-2)', borderRadius: 8,
              padding: isMobile ? '6px 8px' : '6px 11px',
              fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-body)', fontWeight: 600,
            }}>
              <LogOut size={11} />
              {!isMobile && 'Salir'}
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: isMobile ? '1.25rem 1rem' : '1.75rem 2rem', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}