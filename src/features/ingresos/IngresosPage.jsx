import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useIngresos } from '../../hooks/useIngresos'
import { useActivos } from '../../hooks/useActivos'
import { useDeudas } from '../../hooks/useDeudas'
import {
  createIncomeSource, createIncomeRecord, createIncomeComponent,
} from '../../domain/factories'
import { TIPOS_INGRESO, PERIODICIDADES } from '../../domain/types'
import {
  Card, SectionTitle, Btn, Field, EmptyState, MetricCard, CurrencyInput,
} from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import {
  Plus, Trash2, Wallet, Receipt, Building2, Edit3,
  CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle,
} from 'lucide-react'
import Modal from '../../components/Modal'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function periodLabel(period) {
  if (!period) return '—'
  const [y, m] = period.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}

function getTipoLabel(tipo) {
  const map = {
    nomina: 'Nómina', prima: 'Prima', bono: 'Bono', cesantias: 'Cesantías',
    'intereses-cesantias': 'Int. cesantías', arriendo: 'Arriendo',
    honorarios: 'Honorarios', comisiones: 'Comisiones', dividendos: 'Dividendos',
    intereses: 'Intereses', rendimientos: 'Rendimientos',
    'devolucion-impuestos': 'Dev. impuestos', reintegro: 'Reintegro',
    'venta-activo': 'Venta activo', otro: 'Otro',
  }
  return map[tipo] || tipo
}

function sortRecordsDesc(r = []) {
  return [...r].sort((a, b) => {
    const ak = `${a.periodo || ''}_${a.fecha || ''}`
    const bk = `${b.periodo || ''}_${b.fecha || ''}`
    return bk.localeCompare(ak)
  })
}

function sumComponents(components = [], clase) {
  return (components || []).filter(c => c?.clase === clase).reduce((s, c) => s + Number(c.monto || 0), 0)
}

function deriveAmounts(record = {}) {
  const comps = record?.components || []
  const earn  = sumComponents(comps, 'earning')
  const ded   = sumComponents(comps, 'deduction')
  const alloc = sumComponents(comps, 'allocation')
  const bruto = Number(record.bruto || 0) > 0 ? Number(record.bruto || 0)
    : earn > 0 ? earn : Number(record.montoPrincipal || 0)
  const neto = Number(record.neto || 0) > 0 ? Number(record.neto || 0)
    : (earn > 0 || ded > 0 || alloc > 0) ? earn - ded - alloc
    : Number(record.montoPrincipal || 0)
  return { bruto, neto, earn, ded, alloc }
}

function buildEmptySource() {
  return { nombre: '', tipo: 'nomina', moneda: 'COP', periodicidad: 'mensual' }
}

function buildEmptyRecord(tipo = 'nomina') {
  return {
    tipoIngreso: tipo, subtipoIngreso: '', periodo: currentPeriod(),
    fecha: todayIso(), montoPrincipal: '', bruto: '', neto: '', nota: '',
    linkedEntityId: '', payrollDebtLinks: [],
    payroll: {
      salarioBase: '', auxilioTransporte: '', horasExtra: '', recargos: '',
      comision: '', bonificacion: '', viaticos: '', vacaciones: '', otroDevengado: '',
      salud: '', pension: '', solidaridad: '', retencion: '',
      libranza: '', embargo: '', descuentoEmpresa: '', otroDescuento: '',
      afc: '', fpv: '', abonoHipoteca: '', aporteInversion: '',
      ahorroMeta: '', cajaReserva: '', otroDestino: '',
    },
    rental: { canon: '', administracion: '', otrosCostos: '' },
  }
}

function mapRecordToForm(record = {}, tipo = 'otro', debtLinks = []) {
  const base = buildEmptyRecord(tipo)
  base.tipoIngreso    = record.tipoIngreso    || tipo
  base.periodo        = record.periodo        || currentPeriod()
  base.fecha          = record.fecha          || todayIso()
  base.montoPrincipal = record.montoPrincipal || ''
  base.bruto          = record.bruto          || ''
  base.neto           = record.neto           || ''
  base.nota           = record.nota           || ''
  base.linkedEntityId = record.linkedEntityId || ''

  if (tipo === 'nomina') {
    const comps = record.components || []
    const get = (clase, subtipo) =>
      String(comps.find(c => c.clase === clase && c.subtipo === subtipo)?.monto || '')
    base.payroll = {
      salarioBase:       get('earning',    'salario-base'),
      auxilioTransporte: get('earning',    'auxilio-transporte'),
      horasExtra:        get('earning',    'horas-extra'),
      recargos:          get('earning',    'recargos'),
      comision:          get('earning',    'comision'),
      bonificacion:      get('earning',    'bonificacion'),
      viaticos:          get('earning',    'viaticos'),
      vacaciones:        get('earning',    'vacaciones'),
      otroDevengado:     get('earning',    'otro-devengado'),
      salud:             get('deduction',  'salud'),
      pension:           get('deduction',  'pension'),
      solidaridad:       get('deduction',  'solidaridad'),
      retencion:         get('deduction',  'retencion'),
      libranza:          get('deduction',  'libranza'),
      embargo:           get('deduction',  'embargo'),
      descuentoEmpresa:  get('deduction',  'descuento-empresa'),
      otroDescuento:     get('deduction',  'otro-descuento'),
      afc:               get('allocation', 'afc'),
      fpv:               get('allocation', 'fpv'),
      abonoHipoteca:     get('allocation', 'abono-hipoteca'),
      aporteInversion:   get('allocation', 'aporte-inversion'),
      ahorroMeta:        get('allocation', 'ahorro-meta'),
      cajaReserva:       get('allocation', 'caja-reserva'),
      otroDestino:       get('allocation', 'otro-destino'),
    }
    base.payrollDebtLinks = debtLinks.map(d => {
      const linked = comps.find(
        c => c.clase === 'deduction' && c.linkedEntityType === 'debt' && c.linkedEntityId === d.id
      )
      return {
        debtId: d.id, nombre: d.nombre, enabled: !!linked,
        monto: Math.round(Number(linked?.monto || d.derived?.pagoTotalMensual || 0)),
      }
    })
  }

  if (tipo === 'arriendo') {
    const comps = record.components || []
    base.rental = {
      canon:          comps.find(c => c.clase === 'earning'   && c.subtipo === 'canon-arriendo')?.monto || '',
      administracion: comps.find(c => c.clase === 'deduction' && c.subtipo === 'administracion')?.monto || '',
      otrosCostos:    comps.find(c => c.clase === 'deduction' && c.subtipo === 'otro-descuento')?.monto || '',
    }
  }
  return base
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onCancel} title={title} width={420} variant="center">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        {danger && <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />}
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{message}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="subtle" onClick={onCancel}>Cancelar</Btn>
        <Btn variant={danger ? 'danger' : 'accent'} onClick={onConfirm}>{confirmLabel}</Btn>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TrendIndicator + MiniSparkline
// ─────────────────────────────────────────────────────────────────────────────

function TrendIndicator({ registros = [] }) {
  const sorted = sortRecordsDesc(registros).slice(0, 2)
  if (sorted.length < 2) return null
  const last = deriveAmounts(sorted[0]).neto
  const prev = deriveAmounts(sorted[1]).neto
  if (!prev) return null
  const diff = last - prev
  const pct  = Math.round(Math.abs(diff) / prev * 100)
  if (Math.abs(pct) < 1)
    return <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}><Minus size={10} /> Sin cambio</span>
  const up   = diff > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 500, color: up ? '#4a6b10' : '#9b3a3a' }}>
      <Icon size={12} /> {pct}% vs anterior
    </span>
  )
}

function MiniSparkline({ registros = [] }) {
  const data = sortRecordsDesc(registros).slice(0, 6).reverse().map(r => deriveAmounts(r).neto)
  if (data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const W = 52, H = 20, pad = 2
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const lastPt = pts.split(' ').at(-1).split(',')
  return (
    <svg width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke="#b7de4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill="#b7de4a" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FuenteCard
// ─────────────────────────────────────────────────────────────────────────────

function FuenteCard({ item, period, onClick }) {
  const latest    = sortRecordsDesc(item.registros || [])[0] || null
  const amounts   = latest ? deriveAmounts(latest) : null
  const hasRecord = (item.registros || []).some(r => r.periodo === period)

  const statusColor = hasRecord ? '#4a6b10' : '#9b6c1f'
  const statusBg    = hasRecord ? 'rgba(183,222,74,.14)' : 'rgba(216,162,72,.12)'
  const StatusIcon  = hasRecord ? CheckCircle2 : Clock
  const statusLabel = hasRecord ? `Registrado · ${periodLabel(period)}` : `Pendiente · ${periodLabel(period)}`

  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset', display: 'block', cursor: 'pointer', width: '100%',
        background: 'var(--bg-2)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-xl)', padding: '1rem 1.1rem',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color .15s, box-shadow .15s, transform .12s',
        boxSizing: 'border-box', textAlign: 'left',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(28,35,24,0.09), 0 0 0 3px rgba(183,222,74,.15)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-2)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Fila 1 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{getTipoLabel(item.tipo)} · {item.periodicidad || '—'}</div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
          color: statusColor, background: statusBg, padding: '3px 9px', borderRadius: 999,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <StatusIcon size={11} /> {statusLabel}
        </span>
      </div>

      {/* Fila 2 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500 }}>Último neto</div>
          <div style={{ fontSize: 20, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text)', lineHeight: 1.2 }}>
            {amounts ? fmt(amounts.neto) : '—'}
          </div>
          {amounts && amounts.bruto !== amounts.neto && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>bruto {fmt(amounts.bruto)}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <MiniSparkline registros={item.registros} />
          <TrendIndicator registros={item.registros} />
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FuenteDrawer
// ─────────────────────────────────────────────────────────────────────────────

function FuenteDrawer({ fuente, period, open, onClose, onRegister, onEditRecord, onEdit, onToggle, onRemove, onRemoveRecord }) {
  if (!fuente) return null
  const sorted  = sortRecordsDesc(fuente.registros || [])
  const latest  = sorted[0] || null
  const amounts = latest ? deriveAmounts(latest) : null

  return (
    <Modal open={open} onClose={onClose} title={fuente.nombre} width={720} variant="drawer">
      {/* Métricas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',  // siempre 2 columnas
        gap: 10, marginBottom: '1.25rem',
      }}>
        <MetricCard label="Último período"      value={latest?.periodo || '—'} />
        <MetricCard label="Último neto"         value={fmt(amounts?.neto || 0)} color="var(--accent)" />
        <MetricCard label="Último bruto"        value={fmt(amounts?.bruto || 0)} />
        <MetricCard label="Deducciones + dest." value={fmt((amounts?.ded || 0) + (amounts?.alloc || 0))} />
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Btn variant="accent" onClick={() => onRegister(fuente)} style={{ padding: '7px 14px' }}>
          <Plus size={13} /> Registrar {periodLabel(period)}
        </Btn>
        <Btn variant="ghost" onClick={() => onEdit(fuente)} style={{ padding: '7px 12px' }}>
          <Edit3 size={13} /> Editar fuente
        </Btn>
        <Btn variant="ghost" onClick={() => onToggle(fuente)} style={{ padding: '7px 12px' }}>
          {fuente.activo !== false ? 'Desactivar' : 'Activar'}
        </Btn>
        <Btn variant="danger" onClick={() => onRemove(fuente)} style={{ padding: '7px 10px', marginLeft: 'auto' }}>
          <Trash2 size={13} />
        </Btn>
      </div>

      {/* Histórico */}
      {!sorted.length ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          Sin registros todavía. Usa el botón Registrar para añadir el primero.
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 110px 64px', gap: 8, marginBottom: 6, fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500 }}>
            <span>Período</span><span>Bruto</span><span>Neto</span><span>Tipo</span><span />
          </div>
          {sorted.map(r => {
            const a   = deriveAmounts(r)
            const cur = r.periodo === period
            return (
              <div key={r.id}
                style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 0, background: cur ? 'rgba(183,222,74,.04)' : 'transparent' }}
                onMouseEnter={e => e.currentTarget.querySelector('.row-actions').style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.querySelector('.row-actions').style.opacity = '0'}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, width: 90, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {r.periodo || '—'}
                  {cur && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, flex: 1 }}>{fmt(a.bruto)}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, flex: 1, color: '#4a6b10', fontWeight: 500 }}>{fmt(a.neto)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', width: 110, flexShrink: 0 }}>{getTipoLabel(r.tipoIngreso || fuente.tipo)}</span>
                <div className="row-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}>
                  <button onClick={() => onEditRecord(r, fuente)}
                    style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
                    <Edit3 size={13} color="var(--text-2)" />
                  </button>
                  <button onClick={() => onRemoveRecord(r, fuente)}
                    style={{ background: 'transparent', border: '1px solid transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
                    <Trash2 size={13} color="var(--red)" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Formularios de registro
// ─────────────────────────────────────────────────────────────────────────────

function SimpleIncomeForm({ record, setRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Field label="Período">
          <input type="month" value={record.periodo}
            onChange={e => setRecord(p => ({ ...p, periodo: e.target.value }))} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={record.fecha}
            onChange={e => setRecord(p => ({ ...p, fecha: e.target.value }))} />
        </Field>
      </div>
      <Field label="¿Cuánto recibiste?">
        <CurrencyInput value={record.montoPrincipal} placeholder="0"
          onChange={v => setRecord(p => ({ ...p, montoPrincipal: v }))} />
      </Field>
      <Field label="Nota (opcional)">
        <input type="text" value={record.nota}
          placeholder="Ej. bono trimestral, dividendo abril"
          onChange={e => setRecord(p => ({ ...p, nota: e.target.value }))} />
      </Field>
    </div>
  )
}

function RentalIncomeForm({ record, setRecord, inmuebleOptions }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
      <Field label="Inmueble">
        <select value={record.linkedEntityId}
          onChange={e => setRecord(p => ({ ...p, linkedEntityId: e.target.value }))}>
          <option value="">Selecciona inmueble</option>
          {inmuebleOptions.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </Field>
      <Field label="Período">
        <input type="month" value={record.periodo}
          onChange={e => setRecord(p => ({ ...p, periodo: e.target.value }))} />
      </Field>
      <Field label="Canon mensual">
        <CurrencyInput value={Number(record.rental.canon || 0)}
          onChange={v => setRecord(p => ({ ...p, rental: { ...p.rental, canon: v } }))} />
      </Field>
      <Field label="Administración">
        <CurrencyInput value={Number(record.rental.administracion || 0)}
          onChange={v => setRecord(p => ({ ...p, rental: { ...p.rental, administracion: v } }))} />
      </Field>
      <Field label="Otros costos">
        <CurrencyInput value={Number(record.rental.otrosCostos || 0)}
          onChange={v => setRecord(p => ({ ...p, rental: { ...p.rental, otrosCostos: v } }))} />
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="Nota">
          <input type="text" value={record.nota}
            onChange={e => setRecord(p => ({ ...p, nota: e.target.value }))} />
        </Field>
      </div>
    </div>
  )
}

// ── Nómina ────────────────────────────────────────────────────────────────────

function PayrollSection({ title, fields, p, setPayroll, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const filled = fields.filter(f => Number(p[f.key] || 0) > 0).length
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '11px 14px', background: 'var(--bg-3)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{title}</span>
          {filled > 0 && (
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: 'rgba(183,222,74,.18)', color: '#4a6b10', fontWeight: 500 }}>
              {filled} completado{filled > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span style={{ fontSize: 16, color: 'var(--text-3)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {fields.map(f => (
            <Field key={f.key} label={f.label}>
              <CurrencyInput value={Number(p[f.key] || 0)} onChange={v => setPayroll(f.key, v)} placeholder="0" />
            </Field>
          ))}
        </div>
      )}
    </div>
  )
}

function PayrollLiveSummary({ record }) {
  const p = record.payroll || {}
  const n = k => Number(p[k] || 0)
  const earn  = n('salarioBase') + n('auxilioTransporte') + n('horasExtra') + n('recargos') +
                n('comision') + n('bonificacion') + n('viaticos') + n('vacaciones') + n('otroDevengado')
  const ded   = n('salud') + n('pension') + n('solidaridad') + n('retencion') +
                n('libranza') + n('embargo') + n('descuentoEmpresa') + n('otroDescuento') +
                (record.payrollDebtLinks || []).filter(d => d.enabled).reduce((s, d) => s + Number(d.monto || 0), 0)
  const alloc = n('afc') + n('fpv') + n('abonoHipoteca') + n('aporteInversion') +
                n('ahorroMeta') + n('cajaReserva') + n('otroDestino')
  const bruto = Number(record.bruto || 0) > 0 ? Number(record.bruto || 0) : earn
  const neto  = Number(record.neto  || 0) > 0 ? Number(record.neto  || 0) : bruto - ded - alloc
  const netoInvalid = neto > bruto && bruto > 0
  if (!bruto && !earn) return null
  return (
    <div style={{
      background: netoInvalid ? 'rgba(217,92,92,.08)' : 'var(--bg-3)',
      border: netoInvalid ? '1px solid rgba(217,92,92,.25)' : '1px solid var(--border)',
      borderRadius: 12, padding: '12px 14px', marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500 }}>Resumen en vivo</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
        {[
          { label: 'Lo que ganaste', value: earn || bruto, color: 'var(--text)' },
          { label: 'Te descontaron', value: ded,           color: '#b54545' },
          { label: 'Apartaste',      value: alloc,         color: '#416fc8' },
          { label: 'Neto estimado',  value: neto,          color: netoInvalid ? '#b54545' : '#4a6b10' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-mono)', color: item.color }}>{fmt(item.value)}</div>
          </div>
        ))}
      </div>
      {netoInvalid && <div style={{ marginTop: 8, fontSize: 12, color: '#b54545' }}>El neto estimado supera el bruto — revisa los valores.</div>}
    </div>
  )
}

function PayrollIncomeForm({ record, setRecord, payrollLinkedDebts = [], lastRecord = null }) {
  const p = record.payroll || {}
  const setPayroll = (field, value) =>
    setRecord(prev => ({ ...prev, payroll: { ...prev.payroll, [field]: value } }))

  const copyFromLast = () => {
    if (!lastRecord) return
    const comps = lastRecord.components || []
    const get = (clase, subtipo) => {
      const found = comps.find(c => c.clase === clase && c.subtipo === subtipo)
      return found ? Number(found.monto || 0) : 0
    }
    setRecord(prev => ({
      ...prev,
      bruto: Number(lastRecord.bruto || 0),
      neto:  Number(lastRecord.neto  || 0),
      payroll: {
        salarioBase:       get('earning',    'salario-base'),
        auxilioTransporte: get('earning',    'auxilio-transporte'),
        horasExtra:        get('earning',    'horas-extra'),
        recargos:          get('earning',    'recargos'),
        comision:          get('earning',    'comision'),
        bonificacion:      get('earning',    'bonificacion'),
        viaticos:          get('earning',    'viaticos'),
        vacaciones:        get('earning',    'vacaciones'),
        otroDevengado:     get('earning',    'otro-devengado'),
        salud:             get('deduction',  'salud'),
        pension:           get('deduction',  'pension'),
        solidaridad:       get('deduction',  'solidaridad'),
        retencion:         get('deduction',  'retencion'),
        libranza:          get('deduction',  'libranza'),
        embargo:           get('deduction',  'embargo'),
        descuentoEmpresa:  get('deduction',  'descuento-empresa'),
        otroDescuento:     get('deduction',  'otro-descuento'),
        afc:               get('allocation', 'afc'),
        fpv:               get('allocation', 'fpv'),
        abonoHipoteca:     get('allocation', 'abono-hipoteca'),
        aporteInversion:   get('allocation', 'aporte-inversion'),
        ahorroMeta:        get('allocation', 'ahorro-meta'),
        cajaReserva:       get('allocation', 'caja-reserva'),
        otroDestino:       get('allocation', 'otro-destino'),
      },
    }))
  }

  const brutoActual = Number(record.bruto || 0)
  const mismoValor  = lastRecord && Number(lastRecord.bruto || 0) > 0 && brutoActual === Number(lastRecord.bruto || 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, flex: 1 }}>
          <Field label="Período">
            <input type="month" value={record.periodo}
              onChange={e => setRecord(p => ({ ...p, periodo: e.target.value }))} />
          </Field>
          <Field label="Fecha de pago">
            <input type="date" value={record.fecha}
              onChange={e => setRecord(p => ({ ...p, fecha: e.target.value }))} />
          </Field>
        </div>
        {lastRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <Btn variant="ghost" onClick={copyFromLast} style={{ padding: '7px 12px', fontSize: 12 }}>
              Copiar mes anterior
            </Btn>
            {mismoValor && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Igual al último</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Field label="Bruto total (opcional)">
          <CurrencyInput value={Number(record.bruto || 0)} placeholder="calculado automático"
            onChange={v => setRecord(p => ({ ...p, bruto: v }))} />
        </Field>
        <Field label="Neto recibido (opcional)">
          <CurrencyInput value={Number(record.neto || 0)} placeholder="calculado automático"
            onChange={v => setRecord(p => ({ ...p, neto: v }))} />
        </Field>
      </div>

      <PayrollLiveSummary record={record} />

      <PayrollSection title="Lo que ganaste (devengados)" defaultOpen p={p} setPayroll={setPayroll}
        fields={[
          { key: 'salarioBase',       label: 'Salario base' },
          { key: 'auxilioTransporte', label: 'Aux. transporte' },
          { key: 'horasExtra',        label: 'Horas extra' },
          { key: 'recargos',          label: 'Recargos' },
          { key: 'comision',          label: 'Comisión' },
          { key: 'bonificacion',      label: 'Bonificación' },
          { key: 'viaticos',          label: 'Viáticos' },
          { key: 'vacaciones',        label: 'Vacaciones' },
          { key: 'otroDevengado',     label: 'Otro' },
        ]}
      />
      <PayrollSection title="Lo que te descontaron (deducciones)" defaultOpen p={p} setPayroll={setPayroll}
        fields={[
          { key: 'salud',            label: 'Salud' },
          { key: 'pension',          label: 'Pensión' },
          { key: 'solidaridad',      label: 'Solidaridad' },
          { key: 'retencion',        label: 'Retención' },
          { key: 'libranza',         label: 'Libranza' },
          { key: 'embargo',          label: 'Embargo' },
          { key: 'descuentoEmpresa', label: 'Desc. empresa' },
          { key: 'otroDescuento',    label: 'Otro descuento' },
        ]}
      />
      <PayrollSection title="Lo que apartaste voluntariamente" p={p} setPayroll={setPayroll}
        fields={[
          { key: 'afc',             label: 'AFC' },
          { key: 'fpv',             label: 'FPV' },
          { key: 'abonoHipoteca',   label: 'Abono hipoteca' },
          { key: 'aporteInversion', label: 'Aporte inversión' },
          { key: 'ahorroMeta',      label: 'Ahorro meta' },
          { key: 'cajaReserva',     label: 'Caja reserva' },
          { key: 'otroDestino',     label: 'Otro destino' },
        ]}
      />

      {payrollLinkedDebts.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ padding: '11px 14px', background: 'var(--bg-3)' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Cuotas descontadas por nómina</span>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payrollLinkedDebts.map((item, idx) => (
              <div key={item.debtId} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center' }}>
                <input type="checkbox" checked={!!item.enabled}
                  onChange={e => setRecord(prev => {
                    const next = [...(prev.payrollDebtLinks || [])]
                    next[idx] = { ...next[idx], enabled: e.target.checked }
                    return { ...prev, payrollDebtLinks: next }
                  })} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Pago mensual del crédito</div>
                  <CurrencyInput value={Number(item.monto || 0)}
                    onChange={v => setRecord(prev => {
                      const next = [...(prev.payrollDebtLinks || [])]
                      next[idx] = { ...next[idx], monto: v }
                      return { ...prev, payrollDebtLinks: next }
                    })} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Field label="Nota">
        <input type="text" value={record.nota} placeholder="Ej. desprendible abril"
          onChange={e => setRecord(p => ({ ...p, nota: e.target.value }))} />
      </Field>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principal
// ─────────────────────────────────────────────────────────────────────────────

export default function IngresosPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading, fuentes, metrics,
    createFuente, updateFuente, deleteFuente,
    createRegistro, updateRegistro, deleteRegistro,
  } = useIngresos(uid, { selectedPeriod: currentPeriod() })
  const { items: activos } = useActivos(uid)
  const { items: deudas }  = useDeudas(uid)

  const period = currentPeriod()

  const inmuebleOptions    = useMemo(() => (activos || []).filter(a => a.tipo === 'inmueble' && a.activo !== false), [activos])
  const payrollLinkedDebts = useMemo(() => (deudas  || []).filter(d => d?.condiciones?.descontadoNomina), [deudas])

  const [drawerFuente,          setDrawerFuente]          = useState(null)
  const [isSourceModalOpen,     setIsSourceModalOpen]     = useState(false)
  const [isEditSourceModalOpen, setIsEditSourceModalOpen] = useState(false)
  const [isRecordModalOpen,     setIsRecordModalOpen]     = useState(false)
  const [confirmState,          setConfirmState]          = useState(null)
  const [newSource,             setNewSource]             = useState({ nombre: '', tipo: 'nomina', moneda: 'COP', periodicidad: 'mensual' })
  const [editSource,            setEditSource]            = useState(null)
  const [recordDraft,           setRecordDraft]           = useState(buildEmptyRecord('nomina'))
  const [editingRecordId,       setEditingRecordId]       = useState(null)
  const [editingSourceId,       setEditingSourceId]       = useState(null)

  const drawerFuenteViva = useMemo(
    () => fuentes.find(f => f.id === drawerFuente?.id) || drawerFuente,
    [fuentes, drawerFuente]
  )

  const pendingCount = fuentes.filter(f => f.activo !== false && !(f.registros || []).some(r => r.periodo === period)).length
  const doneCount    = fuentes.filter(f => f.activo !== false &&  (f.registros || []).some(r => r.periodo === period)).length
  const firstPending = fuentes.find(f => f.activo !== false && !(f.registros || []).some(r => r.periodo === period))

  const makePayrollDebtLinks = () => payrollLinkedDebts.map(d => ({
    debtId: d.id, nombre: d.nombre, enabled: true,
    monto: Math.round(Number(d.derived?.pagoTotalMensual || 0)),
  }))

  const openNewRecordModal = (fuente) => {
    const next = buildEmptyRecord(fuente.tipo || 'nomina')
    if ((fuente.tipo || 'nomina') === 'nomina') next.payrollDebtLinks = makePayrollDebtLinks()
    setEditingRecordId(null)
    setEditingSourceId(fuente.id)
    setRecordDraft(next)
    setIsRecordModalOpen(true)
  }

  const openEditRecordModal = (record, fuente) => {
    const tipo = record.tipoIngreso || fuente.tipo || 'otro'
    const next = mapRecordToForm(record, tipo, payrollLinkedDebts)
    setEditingRecordId(record.id)
    setEditingSourceId(fuente.id)
    setRecordDraft(next)
    setIsRecordModalOpen(true)
  }

  const closeRecordModal = () => {
    setIsRecordModalOpen(false)
    setEditingRecordId(null)
    setEditingSourceId(null)
  }

  const openEditSourceModal = (source) => {
    setEditSource({ id: source.id, nombre: source.nombre || '', tipo: source.tipo || 'nomina', periodicidad: source.periodicidad || 'mensual', moneda: source.moneda || 'COP' })
    setIsEditSourceModalOpen(true)
  }

  const confirm = ({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm }) =>
    setConfirmState({ title, message, confirmLabel, danger, onConfirm })

  const addFuente = async () => {
    if (!newSource.nombre.trim()) return
    if (newSource.tipo === 'arriendo' && !inmuebleOptions.length) {
      confirm({ title: 'Sin inmuebles', message: 'Primero crea un activo tipo inmueble.', confirmLabel: 'Entendido', danger: false, onConfirm: () => setConfirmState(null) })
      return
    }
    await createFuente(createIncomeSource(newSource))
    setNewSource({ nombre: '', tipo: 'nomina', moneda: 'COP', periodicidad: 'mensual' })
    setIsSourceModalOpen(false)
  }

  const saveEditedSource = async () => {
    if (!editSource?.id || !editSource.nombre.trim()) return
    await updateFuente(editSource.id, { nombre: editSource.nombre, tipo: editSource.tipo, periodicidad: editSource.periodicidad, moneda: editSource.moneda })
    setIsEditSourceModalOpen(false)
    setEditSource(null)
  }

  const handleRemoveFuente = (fuente) => {
    confirm({
      title: 'Eliminar fuente', danger: true, confirmLabel: 'Eliminar',
      message: `¿Eliminar "${fuente.nombre}" y todos sus registros?`,
      onConfirm: async () => {
        await deleteFuente(fuente.id)
        setDrawerFuente(null)
        setConfirmState(null)
      },
    })
  }

  const handleRemoveRecord = (record, fuente) => {
    confirm({
      title: 'Eliminar registro', danger: true, confirmLabel: 'Eliminar',
      message: `¿Eliminar el registro de ${periodLabel(record.periodo)}?`,
      onConfirm: async () => {
        await deleteRegistro(fuente.id, record.id)
        setConfirmState(null)
      },
    })
  }

  const buildPayload = () => {
    const fuente = fuentes.find(f => f.id === editingSourceId)
    const tipo   = fuente?.tipo || 'otro'
    const r      = recordDraft

    if (tipo === 'nomina') {
      const p = r.payroll || {}
      const n = k => Number(p[k] || 0)
      const debtComps = (r.payrollDebtLinks || [])
        .filter(d => d.enabled && Number(d.monto || 0) > 0)
        .map(d => createIncomeComponent({ clase: 'deduction', subtipo: 'libranza', monto: Number(d.monto || 0), linkedEntityType: 'debt', linkedEntityId: d.debtId, autoSuggested: true, nota: `Descuento nómina: ${d.nombre}` }))
      const comps = [
        createIncomeComponent({ clase: 'earning',    subtipo: 'salario-base',       monto: n('salarioBase') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'auxilio-transporte',  monto: n('auxilioTransporte') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'horas-extra',         monto: n('horasExtra') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'recargos',            monto: n('recargos') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'comision',            monto: n('comision') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'bonificacion',        monto: n('bonificacion') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'viaticos',            monto: n('viaticos') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'vacaciones',          monto: n('vacaciones') }),
        createIncomeComponent({ clase: 'earning',    subtipo: 'otro-devengado',      monto: n('otroDevengado') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'salud',               monto: n('salud') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'pension',             monto: n('pension') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'solidaridad',         monto: n('solidaridad') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'retencion',           monto: n('retencion') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'libranza',            monto: n('libranza') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'embargo',             monto: n('embargo') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'descuento-empresa',   monto: n('descuentoEmpresa') }),
        createIncomeComponent({ clase: 'deduction',  subtipo: 'otro-descuento',      monto: n('otroDescuento') }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'afc',                 monto: n('afc') }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'fpv',                 monto: n('fpv') }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'abono-hipoteca',      monto: n('abonoHipoteca') }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'aporte-inversion',    monto: n('aporteInversion') }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'ahorro-meta',         monto: n('ahorroMeta') }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'caja-reserva',        monto: n('cajaReserva') }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'otro-destino',        monto: n('otroDestino') }),
        ...debtComps,
      ].filter(c => Number(c.monto || 0) > 0)
      const base = createIncomeRecord({ tipoIngreso: 'nomina', periodo: r.periodo, fecha: r.fecha })
      return { ...base, tipoIngreso: 'nomina', periodo: r.periodo, fecha: r.fecha, bruto: Number(r.bruto || 0), neto: Number(r.neto || 0), montoPrincipal: Number(r.neto || 0), components: comps, nota: r.nota || '' }
    }

    if (tipo === 'arriendo') {
      if (!r.linkedEntityId) {
        confirm({ title: 'Falta el inmueble', message: 'Vincula un inmueble antes de guardar.', confirmLabel: 'Entendido', danger: false, onConfirm: () => setConfirmState(null) })
        return null
      }
      const canon = Number(r.rental.canon || 0)
      const admin = Number(r.rental.administracion || 0)
      const otros = Number(r.rental.otrosCostos || 0)
      const base  = createIncomeRecord({ tipoIngreso: 'arriendo', periodo: r.periodo, fecha: r.fecha })
      return {
        ...base, tipoIngreso: 'arriendo', periodo: r.periodo, fecha: r.fecha,
        linkedEntityType: 'asset', linkedEntityId: r.linkedEntityId,
        montoPrincipal: canon, bruto: canon, neto: Number(r.neto || 0) || canon - admin - otros,
        components: [
          createIncomeComponent({ clase: 'earning',   subtipo: 'canon-arriendo', monto: canon, linkedEntityType: 'asset', linkedEntityId: r.linkedEntityId }),
          createIncomeComponent({ clase: 'deduction', subtipo: 'administracion', monto: admin, linkedEntityType: 'asset', linkedEntityId: r.linkedEntityId }),
          createIncomeComponent({ clase: 'deduction', subtipo: 'otro-descuento', monto: otros, linkedEntityType: 'asset', linkedEntityId: r.linkedEntityId }),
        ].filter(c => Number(c.monto || 0) > 0),
        nota: r.nota || '',
      }
    }

    const base = createIncomeRecord({ tipoIngreso: tipo, periodo: r.periodo, fecha: r.fecha })
    return {
      ...base, tipoIngreso: tipo, periodo: r.periodo, fecha: r.fecha,
      montoPrincipal: Number(r.montoPrincipal || 0),
      bruto: Number(r.bruto || 0) || Number(r.montoPrincipal || 0),
      neto:  Number(r.neto  || 0) || Number(r.montoPrincipal || 0),
      nota: r.nota || '', linkedEntityId: r.linkedEntityId || null,
    }
  }

  const saveRecord = async () => {
    if (!editingSourceId || !recordDraft.periodo) return
    const payload = buildPayload()
    if (!payload) return
    if (editingRecordId) {
      const { id: _omit, ...payloadWithoutId } = payload
      await updateRegistro(editingSourceId, editingRecordId, payloadWithoutId)
    } else {
      await createRegistro(editingSourceId, payload)
    }
    closeRecordModal()
  }

  const recordFuente = fuentes.find(f => f.id === editingSourceId) || null

  if (!uid) return null

  return (
    <div>
      {/* ── Banner ── */}
      {(() => {
        return (
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 10,
            padding: '12px 16px', borderRadius: 14, marginBottom: '1.25rem',
            background: pendingCount === 0 ? 'rgba(183,222,74,.12)' : 'var(--amber-dim)',
            border: `1px solid ${pendingCount === 0 ? 'rgba(183,222,74,.3)' : 'rgba(216,162,72,.3)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
              {pendingCount === 0 ? <CheckCircle2 size={18} color="#4a6b10" /> : <Clock size={18} color="#9b6c1f" />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {pendingCount === 0
                    ? `Todo registrado — ${periodLabel(period)}`
                    : `${pendingCount} fuente${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} en ${periodLabel(period)}`}
                </div>
                {doneCount > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                    {doneCount} de {doneCount + pendingCount} fuentes registradas este mes
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              {firstPending && pendingCount === 1 && (
                <Btn variant="accent" onClick={() => openNewRecordModal(firstPending)} style={{ padding: '6px 12px' }}>
                  <Plus size={13} /> Registrar ahora
                </Btn>
              )}
              <Btn onClick={() => setIsSourceModalOpen(true)} variant="ghost" style={{ padding: '6px 12px' }}>
                <Plus size={13} /> Nueva fuente
              </Btn>
            </div>
          </div>
        )
      })()}

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Ingreso bruto"  value={fmtM(metrics.ingresoBrutoMensual      || 0)} />
        <MetricCard label="Ingreso neto"   value={fmtM(metrics.ingresoNetoMensual       || 0)} color="#4a6b10" />
        <MetricCard label="Deducciones"    value={fmtM(metrics.totalDeduccionesMensual  || 0)} />
        <MetricCard label="Destinaciones"  value={fmtM(metrics.totalDestinacionesMensual|| 0)} color="#416fc8" />
      </div>

      {/* ── Grid de fuentes ── */}
      {loading ? (
        <Card><div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando fuentes…</div></Card>
      ) : !fuentes.length ? (
        <EmptyState icon={Wallet} title="Sin fuentes de ingreso"
          subtitle="Crea una primera fuente para empezar a registrar ingresos reales."
          action={<Btn variant="accent" onClick={() => setIsSourceModalOpen(true)}><Plus size={13} /> Nueva fuente</Btn>}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: fuentes.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 12,
        }}>
          {fuentes.map(f => (
            <FuenteCard key={f.id} item={f} period={period} onClick={() => setDrawerFuente(f)} />
          ))}
        </div>
      )}

      {/* ── Drawer detalle fuente ── */}
      <FuenteDrawer
        fuente={drawerFuenteViva} period={period} open={!!drawerFuente}
        onClose={() => setDrawerFuente(null)}
        onRegister={fuente => openNewRecordModal(fuente)}
        onEditRecord={openEditRecordModal}
        onEdit={openEditSourceModal}
        onToggle={src => updateFuente(src.id, { activo: !src.activo })}
        onRemove={handleRemoveFuente}
        onRemoveRecord={handleRemoveRecord}
      />

      {/* ── Modal: Nueva fuente ── */}
      <Modal open={isSourceModalOpen} onClose={() => { setIsSourceModalOpen(false); setNewSource({ nombre: '', tipo: 'nomina', moneda: 'COP', periodicidad: 'mensual' }) }}
        title="Nueva fuente de ingreso" width={680}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <Field label="Nombre">
            <input type="text" value={newSource.nombre} placeholder="Ej. Nómina Empresa X"
              onChange={e => setNewSource(p => ({ ...p, nombre: e.target.value }))} />
          </Field>
          <Field label="Tipo">
            <select value={newSource.tipo} onChange={e => setNewSource(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_INGRESO.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Periodicidad">
            <select value={newSource.periodicidad} onChange={e => setNewSource(p => ({ ...p, periodicidad: e.target.value }))}>
              {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        {newSource.tipo === 'arriendo' && (
          <div style={{ marginTop: '1rem', padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Building2 size={14} color="var(--blue)" style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
              Las fuentes de arriendo requieren al menos un activo tipo inmueble.
            </div>
          </div>
        )}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="subtle" onClick={() => setIsSourceModalOpen(false)}>Cancelar</Btn>
          <Btn variant="accent" onClick={addFuente}><Plus size={13} /> Crear fuente</Btn>
        </div>
      </Modal>

      {/* ── Modal: Editar fuente ── */}
      <Modal open={isEditSourceModalOpen} onClose={() => { setIsEditSourceModalOpen(false); setEditSource(null) }}
        title={`Editar fuente${editSource?.nombre ? ` · ${editSource.nombre}` : ''}`} width={680}>
        {editSource && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <Field label="Nombre">
                <input type="text" value={editSource.nombre} onChange={e => setEditSource(p => ({ ...p, nombre: e.target.value }))} />
              </Field>
              <Field label="Tipo">
                <select value={editSource.tipo} onChange={e => setEditSource(p => ({ ...p, tipo: e.target.value }))}>
                  {TIPOS_INGRESO.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
                </select>
              </Field>
              <Field label="Periodicidad">
                <select value={editSource.periodicidad} onChange={e => setEditSource(p => ({ ...p, periodicidad: e.target.value }))}>
                  {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Moneda">
                <input type="text" value={editSource.moneda} onChange={e => setEditSource(p => ({ ...p, moneda: e.target.value }))} />
              </Field>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="subtle" onClick={() => setIsEditSourceModalOpen(false)}>Cancelar</Btn>
              <Btn variant="accent" onClick={saveEditedSource}><Edit3 size={13} /> Guardar cambios</Btn>
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal: Registro de ingreso ── */}
      <Modal
        open={isRecordModalOpen} onClose={closeRecordModal}
        title={editingRecordId
          ? `Editar registro · ${recordFuente?.nombre || ''}`
          : recordFuente?.tipo === 'nomina'
            ? `Registrar nómina · ${recordFuente?.nombre || ''}`
            : `Registrar ingreso · ${recordFuente?.nombre || ''}`}
        width={820}
        variant={recordFuente?.tipo === 'nomina' ? 'drawer' : 'center'}
      >
        {recordFuente?.tipo === 'nomina' ? (
          <PayrollIncomeForm record={recordDraft} setRecord={setRecordDraft}
            payrollLinkedDebts={recordDraft.payrollDebtLinks || []}
            lastRecord={!editingRecordId ? sortRecordsDesc(recordFuente?.registros || [])[0] || null : null}
          />
        ) : recordFuente?.tipo === 'arriendo' ? (
          <RentalIncomeForm record={recordDraft} setRecord={setRecordDraft} inmuebleOptions={inmuebleOptions} />
        ) : (
          <SimpleIncomeForm record={recordDraft} setRecord={setRecordDraft} />
        )}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="subtle" onClick={closeRecordModal}>Cancelar</Btn>
          <Btn variant="accent" onClick={saveRecord}>
            <Receipt size={13} />
            {editingRecordId ? 'Guardar cambios' : 'Guardar registro'}
          </Btn>
        </div>
      </Modal>

      {/* ── Confirm ── */}
      {confirmState && (
        <ConfirmModal open title={confirmState.title} message={confirmState.message}
          confirmLabel={confirmState.confirmLabel} danger={confirmState.danger}
          onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(null)} />
      )}
    </div>
  )
}