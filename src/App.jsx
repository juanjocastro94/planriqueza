import React, { useState, useCallback } from 'react'
import { useLocalStorage, DEFAULT_STATE } from './hooks/useStore'
import { Toast, showToast } from './components/UI'
import Resumen from './components/Resumen'
import Configuracion from './components/Configuracion'
import Ingresos from './components/Ingresos'
import Deudas from './components/Deudas'
import InversionUSD from './components/InversionUSD'
import Escenarios from './components/Escenarios'
import Tracker from './components/Tracker'
import Activos from './components/Activos'
import Simulador from './components/Simulador'
import Metas from './components/Metas'
import {
  LayoutDashboard, Settings, DollarSign, GitCompare,
  TrendingUp, RotateCcw, Wallet, Landmark, Package, Calculator, Target,
  Download, Upload,
} from 'lucide-react'

const TABS = [
  { id: 'resumen',    label: 'Resumen',        icon: LayoutDashboard },
  { id: 'ingresos',  label: 'Ingresos',        icon: Wallet },
  { id: 'deudas',    label: 'Deudas',          icon: Landmark },
  { id: 'config',    label: 'Gastos',          icon: Settings },
  { id: 'usd',       label: 'Inversión USD',   icon: DollarSign },
  { id: 'activos',   label: 'Activos',         icon: Package },
  { id: 'escenarios',label: 'Escenarios',      icon: GitCompare },
  { id: 'simulador', label: '¿Puedo comprarlo?', icon: Calculator },
  { id: 'metas',     label: 'Metas',           icon: Target },
  { id: 'tracker',   label: 'Seguimiento',     icon: TrendingUp },
]

// Wrap setState to show save toast on any mutation
function useStateWithToast(key, defaultValue) {
  const [state, setStateRaw] = useLocalStorage(key, defaultValue)
  const setState = useCallback((updater) => {
    setStateRaw(updater)
    showToast('Guardado', 'success')
  }, [setStateRaw])
  return [state, setState]
}

export default function App() {
  const [state, setState] = useStateWithToast('plan-riqueza-v3', DEFAULT_STATE)
  const [tab, setTab] = useState('resumen')
  const [resetConfirm, setResetConfirm] = useState(false)

  const handleReset = () => {
    if (resetConfirm) {
      setState(DEFAULT_STATE)
      setResetConfirm(false)
    } else {
      setResetConfirm(true)
      setTimeout(() => setResetConfirm(false), 3000)
    }
  }

  const handleExport = () => {
    try {
      const json = JSON.stringify(JSON.parse(localStorage.getItem('plan-riqueza-v3') || '{}'), null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plan-riqueza-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Backup exportado', 'success')
    } catch { showToast('Error al exportar', 'error') }
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        setState(data)
        showToast('Datos importados', 'success')
      } catch { showToast('Archivo inválido', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const activeTab = TABS.find(t => t.id === tab)

  // Compute nav badges (has data indicator)
  const navBadges = {
    deudas: state.deudas?.length > 0,
    ingresos: state.ingresos?.registros?.length > 1,
    usd: (state.inversion?.transacciones?.length || 0) > 0,
    tracker: (state.inversion?.aportesRealizados?.length || 0) > 0,
    activos: (state.activos?.length || 0) > 0,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toast />

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, flexShrink: 0,
        background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)' }}>Plan de Riqueza</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>JJC · 2026</span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Export */}
          <button onClick={handleExport} title="Exportar backup JSON" style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-3)', borderRadius: 6, padding: '5px 11px',
            fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-body)', transition: 'border-color var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Download size={11} /> Exportar
          </button>

          {/* Import */}
          <label title="Importar backup JSON" style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-3)', borderRadius: 6, padding: '5px 11px',
            fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-body)', transition: 'border-color var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Upload size={11} /> Importar
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

          {/* Reset */}
          <button onClick={handleReset} title="Resetear todos los datos" style={{
            background: 'transparent',
            border: `1px solid ${resetConfirm ? 'rgba(255,92,92,0.4)' : 'var(--border)'}`,
            color: resetConfirm ? 'var(--red)' : 'var(--text-3)',
            borderRadius: 6, padding: '5px 11px', fontSize: 11,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-body)', transition: 'all var(--transition)',
          }}>
            <RotateCcw size={11} />
            {resetConfirm ? 'Confirmar' : 'Reset'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Sidebar ── */}
        <nav style={{
          width: 210, flexShrink: 0, borderRight: '1px solid var(--border)',
          padding: '1rem 0', position: 'sticky', top: 52,
          height: 'calc(100vh - 52px)', overflowY: 'auto',
          background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ flex: 1 }}>
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              const hasBadge = navBadges[t.id]
              return (
                <button
                  key={t.id}
                  className={`nav-item${active ? ' active' : ''}`}
                  onClick={() => setTab(t.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 1.25rem',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    color: active ? 'var(--accent)' : 'var(--text-3)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.1s',
                    position: 'relative',
                  }}
                >
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {hasBadge && !active && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6, flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Datos en localStorage · usa Exportar para backup
            </div>
          </div>
        </nav>

        {/* ── Main content ── */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400,
                color: 'var(--text)',
              }}>{activeTab?.label}</h1>
            </div>

            <div className="tab-content" key={tab}>
              {tab === 'resumen'    && <Resumen     state={state} setState={setState} />}
              {tab === 'ingresos'  && <Ingresos    state={state} setState={setState} />}
              {tab === 'deudas'    && <Deudas      state={state} setState={setState} />}
              {tab === 'config'    && <Configuracion state={state} setState={setState} />}
              {tab === 'usd'       && <InversionUSD state={state} setState={setState} />}
              {tab === 'activos'   && <Activos     state={state} setState={setState} />}
              {tab === 'escenarios'&& <Escenarios  state={state} />}
              {tab === 'simulador' && <Simulador   state={state} />}
              {tab === 'metas'     && <Metas       state={state} setState={setState} />}
              {tab === 'tracker'   && <Tracker     state={state} setState={setState} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
