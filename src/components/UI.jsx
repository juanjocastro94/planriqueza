import React, { useEffect, useState, useCallback } from 'react'

// ── Toast global ──────────────────────────────────────────────────────────────
let toastTimeout = null
const toastListeners = new Set()

export function showToast(msg, type = 'default') {
  toastListeners.forEach(fn => fn({ msg, type }))
}

export function Toast() {
  const [toast, setToast] = useState(null)
  useEffect(() => {
    const handler = ({ msg, type }) => {
      setToast({ msg, type })
      clearTimeout(toastTimeout)
      toastTimeout = setTimeout(() => setToast(null), 2000)
    }
    toastListeners.add(handler)
    return () => toastListeners.delete(handler)
  }, [])
  if (!toast) return null
  const colors = {
    default: { bg: 'var(--bg-4)', border: 'var(--border-2)', dot: 'var(--text-3)' },
    success: { bg: 'rgba(200,240,96,0.1)', border: 'rgba(200,240,96,0.25)', dot: 'var(--accent)' },
    error:   { bg: 'rgba(255,92,92,0.1)',  border: 'rgba(255,92,92,0.25)',  dot: 'var(--red)' },
    info:    { bg: 'rgba(92,168,255,0.1)', border: 'rgba(92,168,255,0.25)', dot: 'var(--blue)' },
  }
  const c = colors[toast.type] || colors.default
  return (
    <div className="toast" style={{ background: c.bg, borderColor: c.border }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {toast.msg}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <div style={{
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    ...style,
  }}>
    {children}
  </div>
)

// ── MetricCard ────────────────────────────────────────────────────────────────
export const MetricCard = ({ label, value, sub, color, small }) => (
  <div style={{
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
  }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: small ? 15 : 21, fontWeight: 600, color: color || 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
  </div>
)

// ── Row ───────────────────────────────────────────────────────────────────────
export const Row = ({ label, value, valueColor, bold, muted, sub }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: sub ? 'flex-start' : 'center',
    padding: '8px 0', borderBottom: '1px solid var(--border)',
    opacity: muted ? 0.45 : 1,
  }}>
    <span style={{ fontSize: 13, color: bold ? 'var(--text)' : 'var(--text-2)', fontWeight: bold ? 500 : 400 }}>{label}</span>
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: valueColor || 'var(--text)', fontWeight: bold ? 600 : 400 }}>{value}</span>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
)

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, color = 'default' }) => {
  const colors = {
    green:   { bg: 'rgba(200,240,96,0.12)',  color: '#c8f060' },
    red:     { bg: 'rgba(255,92,92,0.12)',   color: '#ff5c5c' },
    blue:    { bg: 'rgba(92,168,255,0.12)',  color: '#5ca8ff' },
    amber:   { bg: 'rgba(255,194,102,0.12)', color: '#ffc266' },
    default: { bg: 'var(--bg-4)',            color: 'var(--text-2)' },
  }
  const c = colors[color] || colors.default
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 4,
      background: c.bg, color: c.color, fontWeight: 500,
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
export const SectionTitle = ({ children, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</div>
    {action}
  </div>
)

// ── Btn ───────────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = 'ghost', style, disabled }) => {
  const variants = {
    ghost:  { background: 'var(--bg-4)',   color: 'var(--text-2)', border: '1px solid var(--border-2)' },
    accent: { background: 'var(--accent)', color: '#0a0a0a',       border: 'none' },
    danger: { background: 'var(--red-dim)', color: 'var(--red)',   border: '1px solid rgba(255,92,92,0.2)' },
    subtle: { background: 'transparent',   color: 'var(--text-3)', border: '1px solid var(--border)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
        fontFamily: 'var(--font-body)', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity var(--transition), background var(--transition)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.75' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >{children}</button>
  )
}

// ── SliderRow ─────────────────────────────────────────────────────────────────
export const SliderRow = ({ label, min, max, step, value, onChange, display }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 500 }}>{display || value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))} />
  </div>
)

// ── Field ─────────────────────────────────────────────────────────────────────
export const Field = ({ label, children, error }) => (
  <div>
    <div style={{ fontSize: 11, color: error ? 'var(--red)' : 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
    {children}
    {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{error}</div>}
  </div>
)

// ── EmptyState ────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
    {Icon && <Icon size={28} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />}
    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{subtitle}</div>}
  </div>
)

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider = ({ style }) => (
  <div style={{ height: '0.5px', background: 'var(--border)', margin: '0.75rem 0', ...style }} />
)

// ── StatBar — horizontal progress bar ─────────────────────────────────────────
export const StatBar = ({ value, max, color = 'var(--accent)', height = 4 }) => {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100))
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-4)', borderRadius: height, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: height, transition: 'width 0.4s ease' }} />
    </div>
  )
}
