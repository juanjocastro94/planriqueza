// Modal.jsx completo con soporte full-screen en móvil
import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 720,
  variant = 'center',
}) {
  if (!open) return null

  const isDrawer = variant === 'drawer'
  const isMobile = window.innerWidth < 768

  // En móvil: todos los modales son full-screen (como drawer pero desde abajo)
  // En desktop: center = centrado flotante, drawer = panel lateral derecho
  const isFullscreen = isMobile

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 24, 16, 0.42)',
        backdropFilter: 'blur(4px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: isFullscreen ? 'flex-end' : isDrawer ? 'stretch' : 'center',
        justifyContent: isFullscreen ? 'stretch' : isDrawer ? 'flex-end' : 'center',
        padding: isFullscreen ? 0 : isDrawer ? 0 : 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: isFullscreen
            ? '100%'
            : isDrawer
              ? 'min(860px, 92vw)'
              : `min(${width}px, calc(100vw - 32px))`,
          height: isFullscreen
            ? '92dvh'    // deja un poco del overlay visible arriba para indicar que hay algo detrás
            : isDrawer
              ? '100vh'
              : 'auto',
          maxHeight: isFullscreen
            ? '92dvh'
            : isDrawer
              ? '100vh'
              : 'calc(100vh - 40px)',
          background: 'var(--bg-2)',
          border: isFullscreen || isDrawer ? 'none' : '1px solid var(--border)',
          borderLeft: isDrawer && !isFullscreen ? '1px solid var(--border)' : 'none',
          // En móvil: esquinas redondeadas arriba como bottom sheet
          borderRadius: isFullscreen
            ? '20px 20px 0 0'
            : isDrawer
              ? 0
              : 16,
          boxShadow: '0 18px 60px rgba(20, 24, 16, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Handle visual en móvil (pill gris arriba) */}
        {isFullscreen && (
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--border-3)',
            margin: '12px auto 0',
            flexShrink: 0,
          }} />
        )}

        {/* Header */}
        <div style={{
          height: isFullscreen ? 52 : 60,
          padding: '0 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--bg-2)',
          marginTop: isFullscreen ? 8 : 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#fff', color: 'var(--text-2)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}