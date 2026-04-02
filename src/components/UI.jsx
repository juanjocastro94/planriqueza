import React, { useEffect, useState } from 'react'

// ── Toast global ──────────────────────────────────────────────────────────────
let toastTimeout = null
const toastListeners = new Set()

export function showToast(msg, type = 'default') {
  toastListeners.forEach((fn) => fn({ msg, type }))
}

export function Toast() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const handler = ({ msg, type }) => {
      setToast({ msg, type })
      clearTimeout(toastTimeout)
      toastTimeout = setTimeout(() => setToast(null), 2200)
    }

    toastListeners.add(handler)
    return () => toastListeners.delete(handler)
  }, [])

  if (!toast) return null

  const colors = {
    default: { bg: '#ffffff', border: 'var(--border-2)', dot: 'var(--text-3)' },
    success: { bg: 'rgba(183,222,74,0.12)', border: 'rgba(183,222,74,0.25)', dot: '#6f8f1c' },
    error: { bg: 'rgba(217,92,92,0.10)', border: 'rgba(217,92,92,0.22)', dot: 'var(--red)' },
    info: { bg: 'rgba(95,143,232,0.10)', border: 'rgba(95,143,232,0.22)', dot: 'var(--blue)' },
  }

  const c = colors[toast.type] || colors.default

  return (
    <div className="toast" style={{ background: c.bg, borderColor: c.border }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: c.dot,
          flexShrink: 0,
        }}
      />
      {toast.msg}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <div
    style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}
  >
    {children}
  </div>
)

// ── MetricCard ────────────────────────────────────────────────────────────────
export const MetricCard = ({ label, value, sub, color, small }) => (
  <div
    style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '1rem',
      boxShadow: 'var(--shadow-sm)',
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: 'var(--text-3)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 700,
      }}
    >
      {label}
    </div>

    <div
      style={{
        fontSize: small ? 15 : 21,
        fontWeight: 700,
        color: color || 'var(--text)',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>

    {sub && (
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          marginTop: 4,
          lineHeight: 1.45,
        }}
      >
        {sub}
      </div>
    )}
  </div>
)

// ── Row ───────────────────────────────────────────────────────────────────────
export const Row = ({ label, value, valueColor, bold, muted, sub }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: sub ? 'flex-start' : 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
      opacity: muted ? 0.5 : 1,
    }}
  >
    <span
      style={{
        fontSize: 13,
        color: bold ? 'var(--text)' : 'var(--text-2)',
        fontWeight: bold ? 600 : 500,
      }}
    >
      {label}
    </span>

    <div style={{ textAlign: 'right' }}>
      <span
        style={{
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          color: valueColor || 'var(--text)',
          fontWeight: bold ? 700 : 500,
        }}
      >
        {value}
      </span>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  </div>
)

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, color = 'default' }) => {
  const colors = {
    green: { bg: 'rgba(183,222,74,0.18)', color: '#5f7d15' },
    red: { bg: 'rgba(217,92,92,0.14)', color: '#b54545' },
    blue: { bg: 'rgba(95,143,232,0.14)', color: '#416fc8' },
    amber: { bg: 'rgba(216,162,72,0.16)', color: '#9b6c1f' },
    default: { bg: 'var(--bg-4)', color: 'var(--text-2)' },
  }

  const c = colors[color] || colors.default

  return (
    <span
      style={{
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
export const SectionTitle = ({ children, action }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
      gap: 12,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </div>
    {action}
  </div>
)

// ── Btn ───────────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = 'ghost', style, disabled, type = 'button' }) => {
  const variants = {
    ghost: {
      background: 'var(--bg-3)',
      color: 'var(--text-2)',
      border: '1px solid var(--border-2)',
    },
    accent: {
      background: 'var(--accent)',
      color: '#0f130c',
      border: '1px solid transparent',
    },
    danger: {
      background: 'var(--red-dim)',
      color: 'var(--red)',
      border: '1px solid rgba(217,92,92,0.18)',
    },
    subtle: {
      background: '#ffffff',
      color: 'var(--text-2)',
      border: '1px solid var(--border-2)',
    },
  }

  const current = variants[variant] || variants.ghost

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...current,
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity var(--transition), background var(--transition), border-color var(--transition), transform var(--transition)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: variant === 'subtle' || variant === 'ghost' ? '0 1px 2px rgba(28,35,24,0.04)' : 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.opacity = '0.9'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
    >
      {children}
    </button>
  )
}

// ── SliderRow ─────────────────────────────────────────────────────────────────
export const SliderRow = ({ label, min, max, step, value, onChange, display }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: '#6f8f1c',
          fontWeight: 700,
        }}
      >
        {display || value}
      </span>
    </div>

    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
)

// ── Field ─────────────────────────────────────────────────────────────────────
export const Field = ({ label, children, error }) => (
  <div>
    <div
      style={{
        fontSize: 11,
        color: error ? 'var(--red)' : 'var(--text-3)',
        marginBottom: 5,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
    {children}
    {error && (
      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
        {error}
      </div>
    )}
  </div>
)

// ── EmptyState ────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
    {Icon && (
      <Icon
        size={28}
        style={{
          opacity: 0.3,
          display: 'block',
          margin: '0 auto 10px',
          color: 'var(--text-3)',
        }}
      />
    )}
    <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 5, fontWeight: 600 }}>
      {title}
    </div>
    {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{subtitle}</div>}
  </div>
)

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider = ({ style }) => (
  <div
    style={{
      height: '1px',
      background: 'var(--border)',
      margin: '0.75rem 0',
      ...style,
    }}
  />
)

// ── StatBar — horizontal progress bar ─────────────────────────────────────────
export const StatBar = ({ value, max, color = 'var(--accent)', height = 4 }) => {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100))

  return (
    <div
      style={{
        width: '100%',
        height,
        background: 'var(--bg-4)',
        borderRadius: height,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <div
        style={{
          height: '100%',
          width: pct + '%',
          background: color,
          borderRadius: height,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

// ── CurrencyInput — formato de miles en tiempo real ───────────────────────────
export function CurrencyInput({ value, onChange, placeholder = '0', style = {} }) {
  const [focused, setFocused] = useState(false)

  const formatted = (v) => {
    const num = Number(String(v || '').replace(/[^0-9]/g, ''))
    if (!num && num !== 0) return ''
    return new Intl.NumberFormat('es-CO').format(num)
  }

  const handleChange = (e) => {
    const digits = e.target.value.replace(/[^0-9]/g, '')
    onChange(digits ? Number(digits) : '')
  }

  return (
    <div style={{ position: 'relative' }}>
      {!focused && Number(value) > 0 && (
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)',
          pointerEvents: 'none', zIndex: 1, userSelect: 'none',
        }}>
          $ {formatted(value)}
        </span>
      )}
      <input
        type="number"
        value={focused ? (value || '') : ''}
        placeholder={!focused && Number(value) > 0 ? '' : `$ ${placeholder}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={handleChange}
        style={{
          ...style,
          fontFamily: 'var(--font-mono)',
          color: (!focused && Number(value) > 0) ? 'transparent' : 'inherit',
          caretColor: 'var(--text)',
        }}
      />
    </div>
  )
}