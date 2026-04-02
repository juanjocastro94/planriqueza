import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDeudas } from '../../hooks/useDeudas'
import { createDebt, createDebtMovement, createDebtPlannedEvent } from '../../domain/factories'
import { TIPOS_DEUDA, TIPOS_TASA, MODOS_ABONO_CAPITAL, MODOS_SEGURO } from '../../domain/types'
import { Card, Btn, Field, EmptyState, MetricCard, CurrencyInput } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { Plus, Trash2, Landmark, AlertTriangle, Edit3 } from 'lucide-react'
import Modal from '../../components/Modal'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getTipoLabel(tipo) {
  const map = {
    hipotecario: 'Hipotecario', vehiculo: 'Vehículo',
    'libre-destino': 'Libre destino', tarjeta: 'Tarjeta',
    educativo: 'Educativo', otro: 'Otro',
  }
  return map[tipo] || tipo
}

function sortMovementsDesc(items = []) {
  return [...items].sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))
}

function sortEventsAsc(items = []) {
  return [...items].sort((a, b) => Number(a.mesOffset || 0) - Number(b.mesOffset || 0))
}

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
        <Btn variant="danger" onClick={onConfirm}>Confirmar</Btn>
      </div>
    </Modal>
  )
}

function DeudaCard({ deuda, onClick }) {
  const active = deuda.activo !== false
  const saldo  = Number(deuda.derived?.saldoReal || 0)
  const cuota  = Number(deuda.derived?.pagoTotalMensual || 0)
  const meses  = Number(deuda.derived?.mesesRestantes || 0)
  const color  = deuda.visual?.color || 'var(--blue)'

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
        {getTipoLabel(deuda.tipo)} · {deuda.moneda || 'COP'}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 14, paddingRight: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {deuda.nombre}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Saldo actual</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: saldo > 0 ? 'var(--red)' : 'var(--text)' }}>
          {saldo > 0 ? fmt(saldo) : '—'}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>Cuota mensual</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{cuota > 0 ? fmt(cuota) : '—'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>Meses restantes</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{meses > 0 ? meses : '—'}</div>
        </div>
      </div>
    </button>
  )
}

function DeudaDrawer({
  deuda, open, onClose,
  onPatchRoot, onPatchCondiciones, onPatchCostos, onPatchPlan,
  onDelete, onToggle,
  onAddEvento, onDeleteEvento,
  onAddMovimiento, onDeleteMovimiento,
}) {
  const [tab, setTab] = useState('condiciones')
  const [newEvento, setNewEvento] = useState({ mesOffset: 1, monto: '', nota: '' })
  const [newMov, setNewMov] = useState({ periodo: currentPeriod(), cuotaPagada: '', abonoCapital: '', cargos: '', nota: '' })

  if (!deuda) return null

  const c        = deuda.condiciones || {}
  const costos   = deuda.costos      || {}
  const plan     = deuda.plan        || {}
  const d        = deuda.derived     || {}
  const movimientos = sortMovementsDesc(deuda.ejecucion?.movimientos || [])
  const eventos     = sortEventsAsc(plan.eventosPlanificados || [])
  const abonoMensualPlan = Number(plan.abonoMensualCapital || 0)

  const tabs = [
    { id: 'condiciones', label: 'Condiciones' },
    { id: 'costos',      label: 'Costos' },
    { id: 'plan',        label: 'Plan' },
    { id: 'movimientos', label: `Movimientos (${movimientos.length})` },
  ]

  return (
    <Modal open={open} onClose={onClose} title={deuda.nombre} width={780} variant="drawer">
      {/* Métricas derived — responsive */}
      <div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 8, marginBottom: '1.25rem',
}}>
  <MetricCard label="Cuota financiera"  value={fmt(d.cuotaFinanciera || 0)} color="var(--accent)" />
  <MetricCard label="Pago total mes"    value={fmt(d.pagoTotalMensual || 0)} />
  <MetricCard label="Meses restantes"   value={String(d.mesesRestantes || 0)} />
</div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={onToggle} style={{ padding: '6px 12px' }}>
          {deuda.activo !== false ? 'Desactivar' : 'Activar'}
        </Btn>
        <Btn variant="danger" onClick={onDelete} style={{ padding: '6px 10px', marginLeft: 'auto' }}>
          <Trash2 size={13} /> Eliminar deuda
        </Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 14px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
            borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Condiciones */}
      {tab === 'condiciones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <Field label="Nombre">
            <input type="text" value={deuda.nombre || ''} onChange={e => onPatchRoot('nombre', e.target.value)} />
          </Field>
          <Field label="Tipo">
            <select value={deuda.tipo || 'libre-destino'} onChange={e => onPatchRoot('tipo', e.target.value)}>
              {TIPOS_DEUDA.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Moneda">
            <input type="text" value={deuda.moneda || 'COP'} onChange={e => onPatchRoot('moneda', e.target.value)} />
          </Field>
          <Field label="Monto original">
            <CurrencyInput value={Number(c.montoOriginal || 0)} onChange={v => onPatchCondiciones('montoOriginal', v)} />
          </Field>
          <Field label="Fecha desembolso">
            <input type="date" value={c.fechaDesembolso || ''} onChange={e => onPatchCondiciones('fechaDesembolso', e.target.value)} />
          </Field>
          <Field label="Plazo (meses)">
            <input type="number" value={c.plazoMeses || 0} onChange={e => onPatchCondiciones('plazoMeses', Number(e.target.value || 0))} />
          </Field>
          <Field label="Tipo tasa">
            <select value={c.tasaTipo || 'ea'} onChange={e => onPatchCondiciones('tasaTipo', e.target.value)}>
              {TIPOS_TASA.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="Tasa valor (%)">
            <input type="number" value={c.tasaValor || 0} onChange={e => onPatchCondiciones('tasaValor', Number(e.target.value || 0))} />
          </Field>
          <Field label="Cuota manual (opcional)">
            <CurrencyInput value={Number(c.cuotaManual || 0)} onChange={v => onPatchCondiciones('cuotaManual', v || null)} />
          </Field>
          <Field label="Residual %">
            <input type="number" value={c.residualPct || 0} onChange={e => onPatchCondiciones('residualPct', Number(e.target.value || 0))} />
          </Field>
          <Field label="Modo abono capital">
            <select value={c.modoAbonoCapital || 'reducir-plazo'} onChange={e => onPatchCondiciones('modoAbonoCapital', e.target.value)}>
              {MODOS_ABONO_CAPITAL.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Descontado nómina">
            <select value={c.descontadoNomina ? 'si' : 'no'} onChange={e => onPatchCondiciones('descontadoNomina', e.target.value === 'si')}>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </Field>
          <Field label="Color visual">
            <input type="color" value={deuda.visual?.color || '#5ca8ff'}
              onChange={e => onPatchRoot('visual', { ...(deuda.visual || {}), color: e.target.value })} />
          </Field>
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px' }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Cuota calculada</div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmt(d.cuotaCalculada || 0)}</div>
  </div>
  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px' }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Globo / residual</div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmt(d.globo || 0)}</div>
  </div>
</div>
          <div style={{ gridColumn: '1 / -1', background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>
            <span>Saldo calculado por amortización: </span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmt(d.saldoReal || 0)}</strong>
            <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
              ({d.mesesPagados || 0} meses pagados · abonos extra: {fmt(d.totalMovimientos?.abonoCapital || 0)})
            </span>
          </div>
        </div>
      )}

      {/* Tab: Costos */}
      {tab === 'costos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <Field label="Seguro modo">
            <select value={costos.seguroModo || 'separado'} onChange={e => onPatchCostos('seguroModo', e.target.value)}>
              {MODOS_SEGURO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Seguro vida">
            <CurrencyInput value={Number(costos.seguroVidaMensual || 0)} onChange={v => onPatchCostos('seguroVidaMensual', v)} />
          </Field>
          <Field label="Seguro desempleo">
            <CurrencyInput value={Number(costos.seguroDesempleoMensual || 0)} onChange={v => onPatchCostos('seguroDesempleoMensual', v)} />
          </Field>
          <Field label="Seguro hogar">
            <CurrencyInput value={Number(costos.seguroHogarMensual || 0)} onChange={v => onPatchCostos('seguroHogarMensual', v)} />
          </Field>
          <Field label="Todo riesgo">
            <CurrencyInput value={Number(costos.seguroTodoRiesgoMensual || 0)} onChange={v => onPatchCostos('seguroTodoRiesgoMensual', v)} />
          </Field>
          <Field label="Otros seguros">
            <CurrencyInput value={Number(costos.otrosSegurosMensuales || 0)} onChange={v => onPatchCostos('otrosSegurosMensuales', v)} />
          </Field>
          <Field label="Otros cargos mensuales">
            <CurrencyInput value={Number(costos.otrosCargosMensuales || 0)} onChange={v => onPatchCostos('otrosCargosMensuales', v)} />
          </Field>
          <div style={{ gridColumn: '1 / -1', background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>
            Seguros totales: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmt(d.segurosMensuales || 0)}</strong>
            {' '}· Otros cargos: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmt(d.otrosCargosMensuales || 0)}</strong>
          </div>
        </div>
      )}

      {/* Tab: Plan */}
      {tab === 'plan' && (
        <div>
          <Field label="Abono mensual a capital (plan)">
            <CurrencyInput value={Number(plan.abonoMensualCapital || 0)} onChange={v => onPatchPlan('abonoMensualCapital', v)} />
          </Field>

          {/* Impacto del plan */}
          {(abonoMensualPlan > 0 || eventos.length > 0) && (
            <div style={{ marginTop: '1.25rem', background: 'rgba(183,222,74,.08)', border: '1px solid rgba(183,222,74,.25)', borderRadius: 12, padding: '1rem 1.1rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6b10', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>
                Impacto del plan acelerado
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Sin plan</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{d.mesesRestantes} meses</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{fmt(d.interesesRestantesSinPlan || 0)} en intereses</div>
                </div>
                <div style={{ fontSize: 22, color: 'var(--accent)', textAlign: 'center' }}>→</div>
                <div style={{ background: 'rgba(183,222,74,.12)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(183,222,74,.2)' }}>
                  <div style={{ fontSize: 10, color: '#4a6b10', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Con plan</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#4a6b10' }}>{d.mesesConPlan} meses</div>
                  <div style={{ fontSize: 11, color: '#4a6b10', marginTop: 3 }}>{fmt(d.interesesConPlan || 0)} en intereses</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Te ahorras en tiempo</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#4a6b10' }}>{d.mesesAhorrados || 0} meses</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                    {Math.floor((d.mesesAhorrados || 0) / 12)} años {(d.mesesAhorrados || 0) % 12} meses menos
                  </div>
                </div>
                <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Te ahorras en intereses</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#4a6b10' }}>{fmtM(d.interesesAhorrados || 0)}</div>
                  {d.interesesRestantesSinPlan > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                      {Math.round(((d.interesesAhorrados || 0) / d.interesesRestantesSinPlan) * 100)}% menos intereses
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Eventos planificados */}
          <div style={{ margin: '1.25rem 0 .75rem', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Eventos planificados
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
            <Field label="Mes +n">
              <input type="number" value={newEvento.mesOffset} onChange={e => setNewEvento(p => ({ ...p, mesOffset: e.target.value }))} />
            </Field>
            <Field label="Monto">
              <CurrencyInput value={Number(newEvento.monto || 0)} onChange={v => setNewEvento(p => ({ ...p, monto: v }))} />
            </Field>
            <Btn variant="ghost" onClick={async () => {
              if (!newEvento.monto) return
              await onAddEvento(createDebtPlannedEvent({ mesOffset: Number(newEvento.mesOffset || 1), monto: Number(newEvento.monto || 0), nota: newEvento.nota || '' }))
              setNewEvento({ mesOffset: 1, monto: '', nota: '' })
            }} style={{ padding: '7px 10px' }}>
              <Plus size={13} />
            </Btn>
          </div>
          <Field label="Nota del evento">
            <input type="text" value={newEvento.nota} placeholder="Bono, prima…" onChange={e => setNewEvento(p => ({ ...p, nota: e.target.value }))} />
          </Field>

          {!eventos.length
            ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '12px 0 0' }}>Sin eventos planificados.</p>
            : <div style={{ marginTop: 12 }}>
                {eventos.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Mes +{ev.mesOffset}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ev.nota || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(ev.monto)}</span>
                      <button onClick={() => onDeleteEvento(ev.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: .55 }}>
                        <Trash2 size={13} color="var(--red)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          }

          {/* Resumen ejecución */}
          <div style={{ margin: '1.25rem 0 .75rem', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Resumen de ejecución
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
            <MetricCard label="Cuotas pagadas"   value={fmt(d.totalMovimientos?.cuotaPagada  || 0)} />
            <MetricCard label="Abonos capital"   value={fmt(d.totalMovimientos?.abonoCapital || 0)} color="var(--accent)" />
            <MetricCard label="Cargos"           value={fmt(d.totalMovimientos?.cargos       || 0)} />
            <MetricCard label="Plan extra total" value={fmt(d.totalEventosPlanificados       || 0)} />
          </div>
        </div>
      )}

      {/* Tab: Movimientos */}
      {tab === 'movimientos' && (
        <div>
          {/* Form nuevo movimiento — en móvil apilado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              <Field label="Período">
                <input type="month" value={newMov.periodo} onChange={e => setNewMov(p => ({ ...p, periodo: e.target.value }))} />
              </Field>
              <Field label="Cuota pagada">
                <CurrencyInput value={Number(newMov.cuotaPagada || 0)} onChange={v => setNewMov(p => ({ ...p, cuotaPagada: v }))} />
              </Field>
              <Field label="Abono capital">
                <CurrencyInput value={Number(newMov.abonoCapital || 0)} onChange={v => setNewMov(p => ({ ...p, abonoCapital: v }))} />
              </Field>
              <Field label="Cargos">
                <CurrencyInput value={Number(newMov.cargos || 0)} onChange={v => setNewMov(p => ({ ...p, cargos: v }))} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
              <Field label="Nota">
                <input type="text" value={newMov.nota} onChange={e => setNewMov(p => ({ ...p, nota: e.target.value }))} />
              </Field>
              <Btn variant="accent" onClick={async () => {
                if (!newMov.periodo) return
                await onAddMovimiento(createDebtMovement({
                  periodo: newMov.periodo,
                  cuotaPagada: Number(newMov.cuotaPagada || 0),
                  abonoCapital: Number(newMov.abonoCapital || 0),
                  cargos: Number(newMov.cargos || 0),
                  nota: newMov.nota || '',
                }))
                setNewMov({ periodo: currentPeriod(), cuotaPagada: '', abonoCapital: '', cargos: '', nota: '' })
              }} style={{ padding: '7px 12px' }}>
                <Plus size={13} /> Registrar
              </Btn>
            </div>
          </div>

          {!movimientos.length
  ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Sin movimientos registrados.</p>
  : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {movimientos.map(mov => (
        <div key={mov.id}
          style={{ background: 'var(--bg-3)', borderRadius: 10, padding: '10px 12px' }}
          onMouseEnter={e => e.currentTarget.querySelector('.del-btn').style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.querySelector('.del-btn').style.opacity = '0'}
        >
          {/* Fila 1: período + eliminar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
              {mov.periodo || '—'}
            </span>
            <button className="del-btn" onClick={() => onDeleteMovimiento(mov.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0, transition: 'opacity .15s' }}>
              <Trash2 size={13} color="var(--red)" />
            </button>
          </div>

          {/* Fila 2: valores en grid adaptivo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Cuota pagada</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fmt(mov.cuotaPagada || 0)}
              </div>
            </div>
            {Number(mov.abonoCapital || 0) > 0 && (
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Abono capital</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fmt(mov.abonoCapital)}
                </div>
              </div>
            )}
            {Number(mov.cargos || 0) > 0 && (
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Cargos</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fmt(mov.cargos)}
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
}
        </div>
      )}
    </Modal>
  )
}

const EMPTY_DEBT = { nombre: '', tipo: 'libre-destino', moneda: 'COP' }

export default function DeudasPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading, items, metrics,
    createDeuda, updateDeuda, deleteDeuda,
    createEventoPlanificado, deleteEventoPlanificado,
    createMovimiento, deleteMovimiento,
  } = useDeudas(uid)

  const [drawerDeuda,   setDrawerDeuda]   = useState(null)
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false)
  const [newDebt,       setNewDebt]       = useState(EMPTY_DEBT)
  const [confirm,       setConfirm]       = useState(null)
  const [saving,        setSaving]        = useState(false)

  const drawerDeudaViva = useMemo(
    () => items.find(d => d.id === drawerDeuda?.id) || drawerDeuda,
    [items, drawerDeuda]
  )

  const askConfirm = (message, onConfirm) => setConfirm({ message, onConfirm })

  const patch            = (field, value) => { if (!drawerDeudaViva) return; updateDeuda(drawerDeudaViva.id, { [field]: value }) }
  const patchCondiciones = (field, value) => { if (!drawerDeudaViva) return; updateDeuda(drawerDeudaViva.id, { condiciones: { ...(drawerDeudaViva.condiciones || {}), [field]: value } }) }
  const patchCostos      = (field, value) => { if (!drawerDeudaViva) return; updateDeuda(drawerDeudaViva.id, { costos:      { ...(drawerDeudaViva.costos      || {}), [field]: value } }) }
  const patchPlan        = (field, value) => { if (!drawerDeudaViva) return; updateDeuda(drawerDeudaViva.id, { plan:        { ...(drawerDeudaViva.plan        || {}), [field]: value } }) }

  const handleAddDeuda = async () => {
    if (!newDebt.nombre.trim() || saving) return
    setSaving(true)
    try {
      await createDeuda(createDebt(newDebt))
      setNewDebt(EMPTY_DEBT)
      setIsNewDebtOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!uid) return null

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1rem' }}>
        <MetricCard label="Deudas activas"     value={String(metrics.totalDeudas || 0)} />
        <MetricCard label="Saldo total"        value={fmtM(metrics.saldoTotal || 0)} color="var(--red)" />
        <MetricCard label="Pago mensual total" value={fmtM(metrics.pagoMensualTotal || 0)} />
        <MetricCard label="Abono plan mensual" value={fmtM(metrics.abonoMensualPlan || 0)} color="var(--accent)" />
      </div>

      {/* Botón nueva deuda */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Btn variant="accent" onClick={() => setIsNewDebtOpen(true)} style={{ padding: '7px 14px' }}>
          <Plus size={13} /> Nueva deuda
        </Btn>
      </div>

      {/* Grid de cards */}
      {loading ? (
        <Card><div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando deudas…</div></Card>
      ) : !items.length ? (
        <EmptyState icon={Landmark} title="Sin deudas registradas"
          subtitle="Crea tu primera deuda para empezar a hacer seguimiento."
          action={<Btn variant="accent" onClick={() => setIsNewDebtOpen(true)}><Plus size={13} /> Nueva deuda</Btn>}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: items.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}>
          {items.map(d => (
            <DeudaCard key={d.id} deuda={d} onClick={() => setDrawerDeuda(d)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      <DeudaDrawer
        deuda={drawerDeudaViva} open={!!drawerDeuda} onClose={() => setDrawerDeuda(null)}
        onPatchRoot={patch} onPatchCondiciones={patchCondiciones}
        onPatchCostos={patchCostos} onPatchPlan={patchPlan}
        onToggle={() => patch('activo', drawerDeudaViva?.activo === false ? true : false)}
        onDelete={() => askConfirm(
          `¿Eliminar "${drawerDeudaViva?.nombre}" y todo su histórico?`,
          async () => { await deleteDeuda(drawerDeudaViva.id); setDrawerDeuda(null); setConfirm(null) }
        )}
        onAddEvento={payload => createEventoPlanificado(drawerDeudaViva.id, payload)}
        onDeleteEvento={eventId => askConfirm(
          '¿Eliminar este evento planificado?',
          async () => { await deleteEventoPlanificado(drawerDeudaViva.id, eventId); setConfirm(null) }
        )}
        onAddMovimiento={payload => createMovimiento(drawerDeudaViva.id, payload)}
        onDeleteMovimiento={movId => askConfirm(
          '¿Eliminar este movimiento?',
          async () => { await deleteMovimiento(drawerDeudaViva.id, movId); setConfirm(null) }
        )}
      />

      {/* Modal nueva deuda */}
      <Modal open={isNewDebtOpen} onClose={() => { setIsNewDebtOpen(false); setNewDebt(EMPTY_DEBT) }}
        title="Nueva deuda" width={480} variant="center">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nombre">
            <input type="text" value={newDebt.nombre} placeholder="Ej. Hipoteca AV Villas"
              onChange={e => setNewDebt(p => ({ ...p, nombre: e.target.value }))} autoFocus />
          </Field>
          <Field label="Tipo">
            <select value={newDebt.tipo} onChange={e => setNewDebt(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_DEUDA.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Moneda">
            <input type="text" value={newDebt.moneda} onChange={e => setNewDebt(p => ({ ...p, moneda: e.target.value }))} />
          </Field>
        </div>
        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="subtle" onClick={() => { setIsNewDebtOpen(false); setNewDebt(EMPTY_DEBT) }}>Cancelar</Btn>
          <Btn variant="accent" onClick={handleAddDeuda} disabled={saving || !newDebt.nombre.trim()}>
            {saving ? 'Creando…' : 'Crear deuda'}
          </Btn>
        </div>
      </Modal>

      {/* Confirm */}
      {confirm && (
        <ConfirmModal open title="Confirmar acción" message={confirm.message}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}