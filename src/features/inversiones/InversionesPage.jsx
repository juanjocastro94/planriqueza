import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useInversiones } from '../../hooks/useInversiones'
import {
  createInvestment, createInvestmentMovement, createInvestmentPlannedEvent,
} from '../../domain/factories'
import { TIPOS_INVERSION, TIPOS_MOVIMIENTO_INVERSION } from '../../domain/types'
import {
  Card, Btn, Field, EmptyState, MetricCard, CurrencyInput,
} from '../../components/UI'
import { fmt, fmtM, fmtUSD } from '../../utils/calc'
import {
  Plus, Trash2, DollarSign, AlertTriangle,
} from 'lucide-react'
import Modal from '../../components/Modal'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTipoLabel(tipo) {
  const map = {
    usd: 'USD / Divisas', cdt: 'CDT', crypto: 'Crypto',
    fondo: 'Fondo de inversión', acciones: 'Acciones',
    'cuenta-remunerada': 'Cuenta remunerada', bonos: 'Bonos', otro: 'Otro',
  }
  return map[tipo] || tipo
}

function getMovimientoLabel(tipo) {
  const map = {
    aporte: 'Aporte', retiro: 'Retiro', compra: 'Compra', venta: 'Venta',
    interes: 'Interés', dividendo: 'Dividendo', ajuste: 'Ajuste',
  }
  return map[tipo] || tipo
}

function sortMovementsDesc(items = []) {
  return [...items].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
}

function sortEventsAsc(items = []) {
  return [...items].sort((a, b) => Number(a.mesOffset || 0) - Number(b.mesOffset || 0))
}

function getTipoColor(tipo) {
  const map = {
    usd: '#5ca8ff', cdt: '#b7de4a', crypto: '#f5a623',
    fondo: '#a78bfa', acciones: '#34d399',
    'cuenta-remunerada': '#60a5fa', bonos: '#fbbf24', otro: '#9ca3af',
  }
  return map[tipo] || 'var(--text-3)'
}

function getConfigFields(tipo) {
  return {
    trmReferencia:                tipo === 'usd',
    fechaApertura:                ['cdt', 'bonos', 'cuenta-remunerada'].includes(tipo),
    fechaVencimiento:             ['cdt', 'bonos'].includes(tipo),
    tasaPactadaAnualPct:          ['cdt', 'bonos', 'cuenta-remunerada'].includes(tipo),
    rentabilidadEsperadaAnualPct: ['fondo', 'acciones', 'otro'].includes(tipo),
    ticker:                       ['crypto', 'acciones', 'fondo'].includes(tipo),
    plataforma:                   ['crypto', 'acciones', 'fondo', 'usd', 'bonos'].includes(tipo),
  }
}

function usesUnidades(tipo) {
  return ['usd', 'crypto', 'acciones'].includes(tipo)
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onCancel} title={title} width={420} variant="center">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{message}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="subtle" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="danger" onClick={onConfirm}>Eliminar</Btn>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// InversionCard
// ─────────────────────────────────────────────────────────────────────────────

function InversionCard({ item, onClick }) {
  const active      = item.activo !== false
  const d           = item.derived || {}
  const color       = getTipoColor(item.tipo)
  const valorActual = Number(d.valorActualCOP || 0)
  const aportes     = Number(d.totalAportes || 0) + Number(d.totalCompras || 0)
  const ganancia    = valorActual - aportes

  return (
    <button onClick={onClick} style={{
      all: 'unset', display: 'block', cursor: 'pointer', width: '100%',
      background: 'var(--bg-2)', border: '1px solid var(--border-2)',
      borderRadius: 'var(--radius-xl)', padding: '1rem 1.1rem',
      boxShadow: 'var(--shadow-sm)', opacity: active ? 1 : 0.5,
      transition: 'border-color .15s, box-shadow .15s, transform .12s',
      boxSizing: 'border-box', textAlign: 'left', position: 'relative',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 4px 16px rgba(28,35,24,0.08), 0 0 0 3px ${color}22`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-2)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ position: 'absolute', top: 14, right: 14, width: 10, height: 10, borderRadius: '50%', background: color }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
        {getTipoLabel(item.tipo)} · {item.monedaBase || 'COP'}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 14, paddingRight: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.nombre}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Valor actual</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
          {valorActual > 0 ? fmtM(valorActual) : '—'}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>
            {item.tipo === 'usd' ? 'USD acumulados' : 'Aportes'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
            {item.tipo === 'usd' ? fmtUSD(Math.round(d.unidadesAcumuladas || 0)) : fmt(aportes)}
          </div>
        </div>
        {aportes > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>Ganancia</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: ganancia >= 0 ? '#4a6b10' : 'var(--red)' }}>
              {ganancia >= 0 ? '+' : ''}{fmtM(ganancia)}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// InversionDrawer
// ─────────────────────────────────────────────────────────────────────────────

function InversionDrawer({
  inversion, open, onClose,
  onPatchRoot, onPatchConfig, onPatchPlan,
  onToggle, onDelete,
  onAddMovimiento, onDeleteMovimiento,
  onAddEvento, onDeleteEvento,
}) {
  const [tab, setTab] = useState('config')
  const [newMov, setNewMov] = useState({
    fecha: currentDate(), periodo: currentPeriod(),
    tipo: 'aporte', montoCOP: '', montoUnidad: '',
    tasaReferencia: '', feeCOP: 0, nota: '',
  })
  const [newEvento, setNewEvento] = useState({ mesOffset: 1, monto: '', nota: '' })

  if (!inversion) return null

  const cfg       = inversion.configuracion || {}
  const plan      = inversion.plan          || {}
  const d         = inversion.derived       || {}
  const tipo      = inversion.tipo          || 'otro'
  const fields    = getConfigFields(tipo)
  const conUnidad = usesUnidades(tipo)

  const movimientos = sortMovementsDesc(inversion.ejecucion?.movimientos || [])
  const eventos     = sortEventsAsc(plan.eventosPlanificados || [])
  const unidadLabel = tipo === 'usd' ? 'USD' : tipo === 'crypto' ? 'Unidades' : 'Acciones'

  // Calculadora USD en vivo
  const montoCOP       = Number(newMov.montoCOP || 0)
  const tasaReferencia = Number(newMov.tasaReferencia || 0)
  const feeCOP         = Number(newMov.feeCOP || 0)
  const copNeto        = Math.max(0, montoCOP - feeCOP)
  const usdCalculado   = tasaReferencia > 0 ? copNeto / tasaReferencia : 0
  const mostrarCalc    = tipo === 'usd' && montoCOP > 0 && tasaReferencia > 0

  const tabs = [
    { id: 'config',      label: 'Configuración' },
    { id: 'movimientos', label: `Movimientos (${movimientos.length})` },
    { id: 'plan',        label: 'Plan' },
  ]

  const resetMov = () => setNewMov({
    fecha: currentDate(), periodo: currentPeriod(),
    tipo: 'aporte', montoCOP: '', montoUnidad: '',
    tasaReferencia: '', feeCOP: 0, nota: '',
  })

  return (
    <Modal open={open} onClose={onClose} title={inversion.nombre} width={780} variant="drawer">

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: '1.25rem' }}>
        <MetricCard label="Valor actual"      value={fmt(d.valorActualCOP || 0)} color="var(--accent)" />
        <MetricCard label="Aportes / compras" value={fmt((d.totalAportes || 0) + (d.totalCompras || 0))} />
        {tipo === 'usd' && <>
          <MetricCard label="USD acumulados"     value={fmtUSD(Math.round(d.unidadesAcumuladas || 0))} />
          <MetricCard label="Ganancia cambiaria" value={fmt(d.gananciaCambiaria || 0)} color={d.gananciaCambiaria >= 0 ? 'var(--accent)' : 'var(--red)'} />
        </>}
        {tipo === 'cdt' && <>
          <MetricCard label="Capital invertido"   value={fmt(d.capitalInvertido || 0)} />
          <MetricCard label="Intereses estimados" value={fmt(d.interesesEstimados || 0)} color="var(--accent)" />
        </>}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={onToggle} style={{ padding: '6px 12px' }}>
          {inversion.activo !== false ? 'Desactivar' : 'Activar'}
        </Btn>
        <Btn variant="danger" onClick={onDelete} style={{ padding: '6px 10px', marginLeft: 'auto' }}>
          <Trash2 size={13} /> Eliminar
        </Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 14px', fontSize: 13,
            fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
            borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Configuración ── */}
      {tab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <Field label="Nombre">
            <input type="text" value={inversion.nombre || ''} onChange={e => onPatchRoot('nombre', e.target.value)} />
          </Field>
          <Field label="Tipo">
            <select value={tipo} onChange={e => onPatchRoot('tipo', e.target.value)}>
              {TIPOS_INVERSION.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Moneda base">
            <input type="text" value={inversion.monedaBase || 'COP'} onChange={e => onPatchRoot('monedaBase', e.target.value)} />
          </Field>
          <Field label="Aporte mensual plan">
            <CurrencyInput value={Number(plan.aporteMensual || 0)} onChange={v => onPatchPlan('aporteMensual', v)} />
          </Field>
          {fields.trmReferencia && (
            <Field label="TRM referencia">
              <CurrencyInput value={Number(cfg.trmReferencia || 0)} onChange={v => onPatchConfig('trmReferencia', v)} />
            </Field>
          )}
          {fields.plataforma && (
            <Field label="Plataforma">
              <input type="text" value={cfg.plataforma || ''} onChange={e => onPatchConfig('plataforma', e.target.value)} placeholder="Ej. Global66, Binance…" />
            </Field>
          )}
          {fields.ticker && (
            <Field label="Ticker / símbolo">
              <input type="text" value={cfg.ticker || ''} onChange={e => onPatchConfig('ticker', e.target.value)} placeholder="Ej. BTC, AAPL" />
            </Field>
          )}
          {fields.tasaPactadaAnualPct && (
            <Field label="Tasa pactada % anual">
              <input type="number" value={cfg.tasaPactadaAnualPct || 0} onChange={e => onPatchConfig('tasaPactadaAnualPct', Number(e.target.value || 0))} />
            </Field>
          )}
          {fields.rentabilidadEsperadaAnualPct && (
            <Field label="Rentabilidad esperada % anual">
              <input type="number" value={cfg.rentabilidadEsperadaAnualPct || 0} onChange={e => onPatchConfig('rentabilidadEsperadaAnualPct', Number(e.target.value || 0))} />
            </Field>
          )}
          {fields.fechaApertura && (
            <Field label="Fecha apertura">
              <input type="date" value={cfg.fechaApertura || ''} onChange={e => onPatchConfig('fechaApertura', e.target.value)} />
            </Field>
          )}
          {fields.fechaVencimiento && (
            <Field label="Fecha vencimiento">
              <input type="date" value={cfg.fechaVencimiento || ''} onChange={e => onPatchConfig('fechaVencimiento', e.target.value)} />
            </Field>
          )}
          <div style={{ gridColumn: '1 / -1', background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            {tipo === 'usd'    && `TRM promedio de compra: ${fmt(d.trmPromedio || 0)} · Invertido COP: ${fmt(d.totalInvertidoCOP || 0)}`}
            {tipo === 'cdt'    && `Capital: ${fmt(d.capitalInvertido || 0)} · Intereses estimados: ${fmt(d.interesesEstimados || 0)}`}
            {tipo === 'crypto' && `Unidades acumuladas registradas en movimientos.`}
            {!['usd', 'cdt', 'crypto'].includes(tipo) && `Último movimiento: ${d.ultimoMovimiento || '—'}`}
          </div>
        </div>
      )}

      {/* ── Tab: Movimientos ── */}
      {tab === 'movimientos' && (
        <div>
          {/* Form nuevo movimiento */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>

              <Field label="Fecha">
                <input type="date" value={newMov.fecha}
                  onChange={e => setNewMov(p => ({ ...p, fecha: e.target.value, periodo: e.target.value?.slice(0, 7) || p.periodo }))} />
              </Field>

              <Field label="Tipo movimiento">
                <select value={newMov.tipo} onChange={e => setNewMov(p => ({ ...p, tipo: e.target.value }))}>
                  {TIPOS_MOVIMIENTO_INVERSION.map(t => <option key={t} value={t}>{getMovimientoLabel(t)}</option>)}
                </select>
              </Field>

              {/* Monto COP — siempre visible */}
              <Field label={tipo === 'usd' ? 'Monto COP pagado' : 'Monto COP'}>
                <CurrencyInput value={montoCOP} onChange={v => setNewMov(p => ({ ...p, montoCOP: v }))} />
              </Field>

              {/* TRM — solo USD */}
              {tipo === 'usd' && (
                <Field label="TRM de compra">
                  <CurrencyInput value={tasaReferencia} onChange={v => setNewMov(p => ({ ...p, tasaReferencia: v }))} />
                </Field>
              )}

              {/* Fee en COP — solo USD */}
              {tipo === 'usd' && (
                <Field label="Fee plataforma (COP)">
                  <CurrencyInput value={feeCOP} onChange={v => setNewMov(p => ({ ...p, feeCOP: v }))} />
                </Field>
              )}

              {/* Unidades manuales — crypto y acciones (no USD, se calcula) */}
              {conUnidad && tipo !== 'usd' && (
                <Field label={unidadLabel}>
                  <input type="number" step="any" value={newMov.montoUnidad}
                    onChange={e => setNewMov(p => ({ ...p, montoUnidad: e.target.value }))}
                    placeholder="0" />
                </Field>
              )}
            </div>

            {/* Calculadora en vivo — solo USD con datos suficientes */}
            {mostrarCalc && (
              <div style={{
                background: 'rgba(183,222,74,.08)', border: '1px solid rgba(183,222,74,.2)',
                borderRadius: 10, padding: '12px 14px',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                    COP neto invertido
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {fmt(Math.round(copNeto))}
                  </div>
                </div>
                {feeCOP > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                      Fee pagado
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#f5a623' }}>
                      {fmt(feeCOP)}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                    USD recibidos
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#4a6b10' }}>
                    {usdCalculado.toFixed(2)} USD
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                    TRM efectiva
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>
                    {copNeto > 0 && usdCalculado > 0 ? fmt(Math.round(copNeto / usdCalculado)) : '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Nota + Botón registrar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
              <Field label="Nota">
                <input type="text" value={newMov.nota} onChange={e => setNewMov(p => ({ ...p, nota: e.target.value }))} />
              </Field>
              <Btn variant="accent" onClick={async () => {
                if (!newMov.fecha) return
                // Para USD: calcular montoUnidad automáticamente
                const montoUnidadFinal = tipo === 'usd' && tasaReferencia > 0
                  ? Math.round(copNeto / tasaReferencia * 100) / 100
                  : Number(newMov.montoUnidad || 0)
                await onAddMovimiento(createInvestmentMovement({
                  fecha:           newMov.fecha,
                  periodo:         newMov.periodo || newMov.fecha.slice(0, 7),
                  tipo:            newMov.tipo,
                  montoCOP:        montoCOP,
                  montoUnidad:     montoUnidadFinal,
                  tasaReferencia:  tasaReferencia,
                  nota:            newMov.nota || '',
                }))
                resetMov()
              }} style={{ padding: '7px 12px' }}>
                <Plus size={13} /> Registrar
              </Btn>
            </div>
          </div>

          {/* Cards de movimientos */}
          {!movimientos.length ? (
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Sin movimientos registrados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {movimientos.map(mov => (
                <div key={mov.id}
                  style={{ background: 'var(--bg-3)', borderRadius: 10, padding: '10px 12px', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.querySelector('.del-btn').style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.querySelector('.del-btn').style.opacity = '0'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                        {mov.fecha || '—'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: 'var(--bg-4)', color: 'var(--text-2)' }}>
                        {getMovimientoLabel(mov.tipo)}
                      </span>
                    </div>
                    <button className="del-btn" onClick={() => onDeleteMovimiento(mov.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0, transition: 'opacity .15s' }}>
                      <Trash2 size={13} color="var(--red)" />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>COP</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fmt(mov.montoCOP || 0)}
                      </div>
                    </div>
                    {conUnidad && Number(mov.montoUnidad || 0) > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{unidadLabel}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                          {Number(mov.montoUnidad).toLocaleString('es-CO')}
                        </div>
                      </div>
                    )}
                    {tipo === 'usd' && Number(mov.tasaReferencia || 0) > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>TRM</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>
                          {fmt(mov.tasaReferencia)}
                        </div>
                      </div>
                    )}
                    {mov.nota && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Nota</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{mov.nota}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen 2x2 */}
          <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <MetricCard label="Aportes"          value={fmt(d.totalAportes || 0)} />
            <MetricCard label="Compras"          value={fmt(d.totalCompras || 0)} />
            <MetricCard label="Retiros / ventas" value={fmt((d.totalRetiros || 0) + (d.totalVentas || 0))} />
            <MetricCard label="Intereses"        value={fmt((d.totalIntereses || 0) + (d.totalDividendos || 0))} color="var(--accent)" />
          </div>
        </div>
      )}

      {/* ── Tab: Plan ── */}
      {tab === 'plan' && (
        <div>
          <Field label="Aporte mensual plan">
            <CurrencyInput value={Number(plan.aporteMensual || 0)} onChange={v => onPatchPlan('aporteMensual', v)} />
          </Field>

          <div style={{ margin: '1.25rem 0 .75rem', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Eventos planificados
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
            <Field label="Mes +n">
              <input type="number" value={newEvento.mesOffset} onChange={e => setNewEvento(p => ({ ...p, mesOffset: e.target.value }))} />
            </Field>
            <Field label="Monto">
              <CurrencyInput value={Number(newEvento.monto || 0)} onChange={v => setNewEvento(p => ({ ...p, monto: v }))} />
            </Field>
            <Btn variant="ghost" onClick={async () => {
              if (!newEvento.monto) return
              await onAddEvento(createInvestmentPlannedEvent({
                mesOffset: Number(newEvento.mesOffset || 1),
                monto: Number(newEvento.monto || 0),
                nota: newEvento.nota || '',
              }))
              setNewEvento({ mesOffset: 1, monto: '', nota: '' })
            }} style={{ padding: '7px 10px' }}>
              <Plus size={13} />
            </Btn>
          </div>
          <Field label="Nota del evento">
            <input type="text" value={newEvento.nota} placeholder="Bono, prima, aporte extra…"
              onChange={e => setNewEvento(p => ({ ...p, nota: e.target.value }))} />
          </Field>

          {!eventos.length
            ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '12px 0 0' }}>Sin eventos planificados.</p>
            : <div style={{ marginTop: 12 }}>
                {eventos.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Mes +{ev.mesOffset}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ev.nota || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(ev.monto)}</span>
                      <button onClick={() => onDeleteEvento(ev.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: .55 }}>
                        <Trash2 size={13} color="var(--red)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principal
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_INV = { nombre: '', tipo: 'usd', monedaBase: 'USD' }

export default function InversionesPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading, items, metrics,
    createInversion, updateInversion, deleteInversion,
    createEventoPlanificado, deleteEventoPlanificado,
    createMovimiento, deleteMovimiento,
  } = useInversiones(uid)

  const [drawerInv, setDrawerInv] = useState(null)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newInv,    setNewInv]    = useState(EMPTY_INV)
  const [confirm,   setConfirm]   = useState(null)
  const [saving,    setSaving]    = useState(false)

  const drawerVivo = useMemo(
    () => items.find(i => i.id === drawerInv?.id) || drawerInv,
    [items, drawerInv]
  )

  const askConfirm = (message, onConfirm) => setConfirm({ message, onConfirm })

  const patchRoot   = (f, v) => { if (!drawerVivo) return; updateInversion(drawerVivo.id, { [f]: v }) }
  const patchConfig = (f, v) => { if (!drawerVivo) return; updateInversion(drawerVivo.id, { configuracion: { ...(drawerVivo.configuracion || {}), [f]: v } }) }
  const patchPlan   = (f, v) => { if (!drawerVivo) return; updateInversion(drawerVivo.id, { plan: { ...(drawerVivo.plan || {}), [f]: v } }) }

  const handleAdd = async () => {
    if (!newInv.nombre.trim() || saving) return
    setSaving(true)
    try {
      const monedaBase = newInv.tipo === 'usd' || newInv.tipo === 'crypto' ? 'USD' : 'COP'
      await createInversion(createInvestment({ ...newInv, monedaBase }))
      setNewInv(EMPTY_INV)
      setIsNewOpen(false)
    } finally { setSaving(false) }
  }

  if (!uid) return null

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1rem' }}>
        <MetricCard label="Inversiones activas"     value={String(metrics.totalInversiones || 0)} />
        <MetricCard label="Valor actual total"      value={fmtM(metrics.valorActualTotalCOP || 0)} color="var(--accent)" />
        <MetricCard label="Aporte mensual plan"     value={fmtM(metrics.aporteMensualPlan || 0)} />
        <MetricCard label="Total aportes / compras" value={fmtM((metrics.totalAportes || 0) + (metrics.totalCompras || 0))} />
      </div>

      {/* Botón nueva */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Btn variant="accent" onClick={() => setIsNewOpen(true)} style={{ padding: '7px 14px' }}>
          <Plus size={13} /> Nueva inversión
        </Btn>
      </div>

      {/* Grid de cards */}
      {loading ? (
        <Card><div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando inversiones…</div></Card>
      ) : !items.length ? (
        <EmptyState icon={DollarSign} title="Sin inversiones registradas"
          subtitle="Crea tu primera inversión para empezar a registrar aportes y rendimientos."
          action={<Btn variant="accent" onClick={() => setIsNewOpen(true)}><Plus size={13} /> Nueva inversión</Btn>}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: items.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}>
          {items.map(i => (
            <InversionCard key={i.id} item={i} onClick={() => setDrawerInv(i)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      <InversionDrawer
        inversion={drawerVivo} open={!!drawerInv} onClose={() => setDrawerInv(null)}
        onPatchRoot={patchRoot} onPatchConfig={patchConfig} onPatchPlan={patchPlan}
        onToggle={() => patchRoot('activo', drawerVivo?.activo === false ? true : false)}
        onDelete={() => askConfirm(
          `¿Eliminar "${drawerVivo?.nombre}" y todo su histórico?`,
          async () => { await deleteInversion(drawerVivo.id); setDrawerInv(null); setConfirm(null) }
        )}
        onAddMovimiento={payload => createMovimiento(drawerVivo.id, payload)}
        onDeleteMovimiento={movId => askConfirm(
          '¿Eliminar este movimiento?',
          async () => { await deleteMovimiento(drawerVivo.id, movId); setConfirm(null) }
        )}
        onAddEvento={payload => createEventoPlanificado(drawerVivo.id, payload)}
        onDeleteEvento={evId => askConfirm(
          '¿Eliminar este evento planificado?',
          async () => { await deleteEventoPlanificado(drawerVivo.id, evId); setConfirm(null) }
        )}
      />

      {/* Modal nueva inversión */}
      {isNewOpen && (
        <Modal open onClose={() => { setIsNewOpen(false); setNewInv(EMPTY_INV) }}
          title="Nueva inversión" width={480} variant="center">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Nombre">
              <input type="text" value={newInv.nombre} placeholder="Ej. Caja USD, CDT Bancolombia, BTC"
                onChange={e => setNewInv(p => ({ ...p, nombre: e.target.value }))} autoFocus />
            </Field>
            <Field label="Tipo">
              <select value={newInv.tipo} onChange={e => setNewInv(p => ({ ...p, tipo: e.target.value }))}>
                {TIPOS_INVERSION.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
              </select>
            </Field>
            <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              {newInv.tipo === 'usd'               && '💵 Ingresa cuántos COP pagaste, la TRM y el fee. Los USD se calculan automático.'}
              {newInv.tipo === 'cdt'               && '📋 Certificado de depósito. Define tasa pactada y fecha de vencimiento.'}
              {newInv.tipo === 'crypto'            && '🔗 Activo digital. Registra compras con unidades y precio en COP.'}
              {newInv.tipo === 'fondo'             && '📈 Fondo de inversión. Define la rentabilidad esperada para proyecciones.'}
              {newInv.tipo === 'acciones'          && '📊 Acciones. Registra compras con número de acciones y ticker.'}
              {newInv.tipo === 'cuenta-remunerada' && '🏦 Cuenta remunerada. Define la tasa y registra intereses recibidos.'}
              {newInv.tipo === 'bonos'             && '🗓️ Bono con fecha de vencimiento y tasa pactada.'}
              {newInv.tipo === 'otro'              && '📁 Otro tipo. Registra aportes y retiros libremente.'}
            </div>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="subtle" onClick={() => { setIsNewOpen(false); setNewInv(EMPTY_INV) }}>Cancelar</Btn>
            <Btn variant="accent" onClick={handleAdd} disabled={saving || !newInv.nombre.trim()}>
              {saving ? 'Creando…' : 'Crear inversión'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Confirm */}
      {confirm && (
        <ConfirmModal open title="Confirmar acción" message={confirm.message}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}