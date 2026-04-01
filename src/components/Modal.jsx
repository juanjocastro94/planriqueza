import React from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 720,
  variant = 'center', // center | drawer
}) {
  if (!open) return null

  const isDrawer = variant === 'drawer'

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
        alignItems: isDrawer ? 'stretch' : 'center',
        justifyContent: isDrawer ? 'flex-end' : 'center',
        padding: isDrawer ? 0 : 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isDrawer ? 'min(860px, 92vw)' : `min(${width}px, calc(100vw - 32px))`,
          height: isDrawer ? '100vh' : 'auto',
          maxHeight: isDrawer ? '100vh' : 'calc(100vh - 40px)',
          background: 'var(--bg-2)',
          borderLeft: isDrawer ? '1px solid var(--border)' : 'none',
          border: isDrawer ? undefined : '1px solid var(--border)',
          borderRadius: isDrawer ? 0 : 16,
          boxShadow: '0 18px 60px rgba(20, 24, 16, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 60,
            padding: '0 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'var(--bg-2)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>

          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#fff',
              color: 'var(--text-2)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: '1rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}