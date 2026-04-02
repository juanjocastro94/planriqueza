import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useResumen } from '../../hooks/useResumen'
import { Card, SectionTitle, MetricCard, Badge, EmptyState, Btn } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import {
  LayoutDashboard, TrendingUp, Wallet, Landmark, DollarSign,
  ArrowRight, Target, AlertTriangle, CheckCircle2,
  CalendarRange, Layers3, Minus, ChevronRight,
} from 'lucide-react'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// FocusCard — alerta contextual
// ─────────────────────────────────────────────────────────────────────────────

function FocusCard({ tone = 'info', title, body }) {
  const tones = {
    success: { bg: 'rgba(183,222,74,0.12)', border: '1px solid rgba(183,222,74,0.22)', icon: '#6f8f1c', title: '#5f7d15' },
    warning: { bg: 'rgba(216,162,72,0.12)', border: '1px solid rgba(216,162,72,0.22)', icon: '#b27a22', title: '#9b6c1f' },
    danger:  { bg: 'rgba(217,92,92,0.10)',  border: '1px solid rgba(217,92,92,0.22)', icon: 'var(--red)', title: 'var(--red)' },
    info:    { bg: 'var(--bg-3)',            border: '1px solid var(--border)',        icon: 'var(--blue)', title: '#416fc8' },
  }
  const c    = tones[tone] || tones.info
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' ? AlertTriangle : Target

  return (
    <div style={{ background: c.bg, border: c.border, borderRadius: 'var(--radius-lg)', padding: '1rem 1.15rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Icon size={18} color={c.icon} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.title, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{body}</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FlujoCaja — el corazón del resumen
// ─────────────────────────────────────────────────────────────────────────────

function FlujoCaja({ ingresoNeto, gastosMensual, deudaMensual, aporteMensualPlan }) {
  const flujoTrasgastos = ingresoNeto - gastosMensual
  const flujoTradeuda   = flujoTrasgastos - deudaMensual
  const flujoLibre      = flujoTradeuda - aporteMensualPlan
  const pctGastos       = ingresoNeto > 0 ? Math.round((gastosMensual / ingresoNeto) * 100) : 0
  const pctDeuda        = ingresoNeto > 0 ? Math.round((deudaMensual  / ingresoNeto) * 100) : 0
  const pctInversion    = ingresoNeto > 0 ? Math.round((aporteMensualPlan / ingresoNeto) * 100) : 0
  const pctLibre        = Math.max(0, 100 - pctGastos - pctDeuda - pctInversion)

  const Row = ({ label, value, color, pct, isTotal, indent }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0',
      borderTop: isTotal ? '1px solid var(--border)' : 'none',
      marginTop: isTotal ? 4 : 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {indent && <ChevronRight size={12} color="var(--text-3)" />}
        <span style={{
          fontSize: isTotal ? 14 : 13,
          fontWeight: isTotal ? 700 : 400,
          color: isTotal ? 'var(--text)' : 'var(--text-2)',
          paddingLeft: indent ? 0 : 4,
        }}>
          {label}
        </span>
        {pct !== undefined && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {pct}%
          </span>
        )}
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: isTotal ? 16 : 13,
        fontWeight: isTotal ? 700 : 400,
        color: color || 'var(--text)',
      }}>
        {value >= 0 ? '' : '−'}{fmtM(Math.abs(value))}
      </span>
    </div>
  )

  return (
    <Card>
      <SectionTitle>Flujo de caja mensual</SectionTitle>

      <Row label="Ingresos netos"     value={ingresoNeto}      color="var(--accent)" isTotal />
      <Row label="Gastos fijos y variables" value={-gastosMensual} color="var(--red)"    pct={pctGastos}   indent />
      <Row label="Cuotas de deuda"    value={-deudaMensual}    color="var(--red)"    pct={pctDeuda}    indent />
      <Row label="Plan de inversión"  value={-aporteMensualPlan} color="var(--blue)" pct={pctInversion} indent />

      {/* Barra visual */}
      <div style={{ margin: '10px 0', height: 8, borderRadius: 999, background: 'var(--bg-4)', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${pctGastos}%`,    background: 'var(--red)',    transition: 'width .4s' }} />
        <div style={{ width: `${pctDeuda}%`,     background: '#f5a623',       transition: 'width .4s' }} />
        <div style={{ width: `${pctInversion}%`, background: 'var(--blue)',   transition: 'width .4s' }} />
        <div style={{ width: `${pctLibre}%`,     background: 'var(--accent)', transition: 'width .4s' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-3)', marginBottom: 8, flexWrap: 'wrap' }}>
        <span>■ Gastos {pctGastos}%</span>
        <span style={{ color: '#f5a623' }}>■ Deuda {pctDeuda}%</span>
        <span style={{ color: 'var(--blue)' }}>■ Inversión {pctInversion}%</span>
        <span style={{ color: 'var(--accent)' }}>■ Libre {pctLibre}%</span>
      </div>

      {/* Resultado */}
      <div style={{
        marginTop: 4,
        background: flujoLibre >= 0 ? 'rgba(183,222,74,.08)' : 'rgba(217,92,92,.08)',
        border: `1px solid ${flujoLibre >= 0 ? 'rgba(183,222,74,.2)' : 'rgba(217,92,92,.2)'}`,
        borderRadius: 10, padding: '12px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: 3 }}>
            Flujo libre disponible
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {flujoLibre >= 0
              ? 'Puedes destinar este monto a ahorro, inversión extra o colchón'
              : 'Tu egreso supera el ingreso — revisa gastos o aumenta ingresos'}
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
          color: flujoLibre >= 0 ? '#4a6b10' : 'var(--red)',
          flexShrink: 0, marginLeft: 16,
        }}>
          {fmtM(flujoLibre)}
        </div>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertasCard — donde poner atención
// ─────────────────────────────────────────────────────────────────────────────

function AlertasCard({ ingresoNeto, gastosMensual, deudaMensual, aporteMensualPlan, cumplimiento, deudaSaldo }) {
  const alertas = []

  const pctDeuda   = ingresoNeto > 0 ? (deudaMensual  / ingresoNeto) * 100 : 0
  const pctGastos  = ingresoNeto > 0 ? (gastosMensual / ingresoNeto) * 100 : 0
  const flujoLibre = ingresoNeto - gastosMensual - deudaMensual - aporteMensualPlan

  if (pctDeuda > 40) alertas.push({ tone: 'danger', msg: `Tus cuotas de deuda representan el ${Math.round(pctDeuda)}% de tus ingresos — por encima del umbral saludable de 40%.` })
  else if (pctDeuda > 30) alertas.push({ tone: 'warning', msg: `Las cuotas de deuda están en el ${Math.round(pctDeuda)}% de tus ingresos. Considera un plan de amortización acelerada.` })

  if (pctGastos > 60) alertas.push({ tone: 'danger', msg: `Tus gastos consumen el ${Math.round(pctGastos)}% del ingreso neto — poco margen para deuda e inversión.` })

  if (flujoLibre < 0) alertas.push({ tone: 'danger', msg: `Flujo libre negativo: tus egresos superan el ingreso en ${fmtM(Math.abs(flujoLibre))} al mes.` })
  else if (flujoLibre < ingresoNeto * 0.1) alertas.push({ tone: 'warning', msg: `El flujo libre es muy ajustado (${fmtM(flujoLibre)}). Cualquier imprevisto puede generar déficit.` })

  if (aporteMensualPlan === 0) alertas.push({ tone: 'warning', msg: 'No tienes un plan de inversión mensual activo. Define un aporte fijo, así sea pequeño.' })

  if (cumplimiento > 0 && cumplimiento < 50) alertas.push({ tone: 'warning', msg: `Cumplimiento del período al ${cumplimiento}%. Faltan movimientos por registrar.` })

  if (alertas.length === 0) alertas.push({ tone: 'success', msg: 'Tu flujo está equilibrado y tus métricas están dentro de rangos saludables. Sigue así.' })

  return (
    <Card>
      <SectionTitle>Puntos de atención</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertas.map((a, i) => {
          const Icon = a.tone === 'success' ? CheckCircle2 : a.tone === 'danger' ? AlertTriangle : Target
          const colors = {
            success: { bg: 'rgba(183,222,74,.1)', border: 'rgba(183,222,74,.2)', icon: '#4a6b10', text: '#4a6b10' },
            warning: { bg: 'rgba(216,162,72,.1)', border: 'rgba(216,162,72,.2)', icon: '#9b6c1f', text: 'var(--text-2)' },
            danger:  { bg: 'rgba(217,92,92,.08)', border: 'rgba(217,92,92,.2)', icon: 'var(--red)', text: 'var(--text-2)' },
          }[a.tone]
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 10, padding: '10px 12px',
            }}>
              <Icon size={15} color={colors.icon} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: colors.text, lineHeight: 1.6 }}>{a.msg}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StepCard
// ─────────────────────────────────────────────────────────────────────────────

function StepCard({ title, subtitle, status = 'pending' }) {
  const map = {
    done:    { color: 'green',   label: 'Hecho' },
    pending: { color: 'amber',   label: 'Pendiente' },
    empty:   { color: 'default', label: 'Opcional' },
  }
  const s = map[status] || map.pending
  return (
    <div style={{ background: 'var(--bg-3)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>{subtitle}</div>
      </div>
      <Badge color={s.color}>{s.label}</Badge>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PulseCard
// ─────────────────────────────────────────────────────────────────────────────

function PulseCard({ icon: Icon, title, main, sub, color }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={14} color={color} />
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>{title}</div>
      </div>
      <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: color || 'var(--text)', fontWeight: 700, marginBottom: 6 }}>{main}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>{sub}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ResumenPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const [viewMode,       setViewMode]       = useState('current')
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod())

  const { loading, state } = useResumen(uid, { viewMode, selectedPeriod })

  if (!uid) return null

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '2rem 0' }}>Construyendo resumen financiero…</div>
  }

  if (!state) {
    return (
      <EmptyState icon={LayoutDashboard} title="Sin resumen disponible"
        subtitle="Completa ingresos, gastos, deudas e inversiones para construir el tablero." />
    )
  }

  const hasAnyData = state.ingresos.totalFuentes > 0 || state.deudas.total > 0 ||
    state.inversiones.total > 0 || state.gastos.totalMensual > 0

  if (!hasAnyData) {
    return (
      <EmptyState icon={LayoutDashboard} title="Tu resumen todavía está vacío"
        subtitle="Empieza creando una fuente de ingreso, una deuda principal o tu primera inversión." />
    )
  }

  const { ingresos, gastos, deudas, inversiones, resumen, periodLabel, periodData, lifetimeData, snapshot } = state

  const isCurrent  = viewMode === 'current'
  const isPeriod   = viewMode === 'period'
  const isLifetime = viewMode === 'lifetime'

  // Valores clave para cálculos
  const ingresoNeto      = Number(ingresos.netoMensual || 0)
  const gastosMensual    = Number(gastos.totalMensual || 0)
  const deudaMensual     = Number(snapshot.deudaPagoPlanMensual || 0)
  const aporteMensual    = Number(inversiones.planMensual || 0)
  const cumplimiento     = Number(periodData.cumplimientoMensual || 0)
  const flujoLibre       = ingresoNeto - gastosMensual - deudaMensual - aporteMensual
  const patrimonio       = Number(resumen.patrimonioFinanciero || 0)

  const setupItems = [
    {
      title: 'Ingresos cargados',
      subtitle: ingresos.totalFuentes > 0
        ? `${ingresos.totalFuentes} fuente(s) · neto ${fmtM(ingresoNeto)}/mes`
        : 'Agrega al menos una fuente de ingreso.',
      status: ingresos.totalFuentes > 0 ? 'done' : 'pending',
    },
    {
      title: 'Deudas registradas',
      subtitle: deudas.total > 0
        ? `${deudas.total} deuda(s) · cuota total ${fmtM(deudaMensual)}/mes`
        : 'Registra tus deudas para ver el impacto real en tu flujo.',
      status: deudas.total > 0 ? 'done' : 'pending',
    },
    {
      title: 'Inversión activa',
      subtitle: inversiones.total > 0
        ? `${inversiones.total} inversión(es) · valor ${fmtM(inversiones.valorActualTotal)}`
        : 'Define un plan de inversión mensual para crecer.',
      status: inversiones.total > 0 ? 'done' : 'empty',
    },
  ]

  return (
    <div>
      {/* ── Selector de vista ── */}
      <Card style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Vista del resumen</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {isCurrent  && 'Lectura del mes actual'}
              {isPeriod   && `Lectura del período ${periodLabel}`}
              {isLifetime && 'Lectura acumulada desde tus primeros registros'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn variant={isCurrent  ? 'accent' : 'subtle'} onClick={() => setViewMode('current')}>Este mes</Btn>
            <Btn variant={isPeriod   ? 'accent' : 'subtle'} onClick={() => setViewMode('period')}>
              <CalendarRange size={13} /> Mes específico
            </Btn>
            <Btn variant={isLifetime ? 'accent' : 'subtle'} onClick={() => setViewMode('lifetime')}>
              <Layers3 size={13} /> Acumulado
            </Btn>
            {isPeriod && (
              <input type="month" value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                style={{ width: 160 }} />
            )}
          </div>
        </div>
      </Card>

      {/* ── KPIs principales 2×2 ── */}
      {!isLifetime ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
          <MetricCard label="Ingreso neto mensual"  value={fmtM(ingresoNeto)}   color="var(--accent)" />
          <MetricCard label="Flujo libre"            value={fmtM(flujoLibre)}    color={flujoLibre >= 0 ? 'var(--accent)' : 'var(--red)'} />
          <MetricCard label="Pago deuda mensual"     value={fmtM(deudaMensual)}  color="var(--red)" />
          <MetricCard label={`Cumplimiento ${isCurrent ? 'mes' : periodLabel}`}
            value={`${cumplimiento}%`}
            color={cumplimiento >= 100 ? 'var(--accent)' : cumplimiento >= 70 ? 'var(--amber)' : 'var(--red)'} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
          <MetricCard label="Patrimonio financiero"    value={fmtM(patrimonio)}  color={patrimonio >= 0 ? 'var(--accent)' : 'var(--red)'} />
          <MetricCard label="Inversiones actuales"     value={fmtM(inversiones.valorActualTotal)} color="var(--blue)" />
          <MetricCard label="Deuda pagada acumulada"   value={fmtM(lifetimeData.deudaPagadaAcumulada)} color="var(--red)" />
          <MetricCard label="Inversión acumulada"      value={fmtM(lifetimeData.inversionAcumulada)} color="var(--blue)" />
        </div>
      )}

      {/* ── Flujo de caja — solo en vista no-lifetime ── */}
      {!isLifetime && (
        <div style={{ marginBottom: '1.25rem' }}>
          <FlujoCaja
            ingresoNeto={ingresoNeto}
            gastosMensual={gastosMensual}
            deudaMensual={deudaMensual}
            aporteMensualPlan={aporteMensual}
          />
        </div>
      )}

      {/* ── Alertas + Setup ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: '1.25rem' }}>
        <AlertasCard
          ingresoNeto={ingresoNeto}
          gastosMensual={gastosMensual}
          deudaMensual={deudaMensual}
          aporteMensualPlan={aporteMensual}
          cumplimiento={cumplimiento}
          deudaSaldo={Number(deudas.saldoTotal || 0)}
        />
        <Card>
          <SectionTitle>Estado del sistema</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {setupItems.map(item => <StepCard key={item.title} {...item} />)}
          </div>
        </Card>
      </div>

      {/* ── Pulse cards: Ingresos / Deudas / Inversiones ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: '1.25rem' }}>
        <PulseCard icon={Wallet} title="Ingresos" color="var(--accent)"
          main={fmtM(ingresoNeto)}
          sub={`${ingresos.totalFuentes} fuente(s) registradas`} />
        <PulseCard icon={Landmark} title="Deudas" color="var(--red)"
          main={fmtM(deudas.saldoTotal)}
          sub={isLifetime
            ? `${deudas.total} deuda(s) · pagado ${fmtM(deudas.realAcumulado)}`
            : `${deudas.total} deuda(s) · real período ${fmtM(deudas.realMensual)}`} />
        <PulseCard icon={DollarSign} title="Inversiones" color="var(--blue)"
          main={fmtM(inversiones.valorActualTotal)}
          sub={isLifetime
            ? `${inversiones.total} inversión(es) · acumulado ${fmtM(inversiones.realAcumulado)}`
            : `${inversiones.total} inversión(es) · real período ${fmtM(inversiones.realMensual)}`} />
      </div>

      {/* ── Lectura simple en texto ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingUp size={14} color="var(--accent)" />
          <SectionTitle>Lectura simple</SectionTitle>
        </div>
        {!isLifetime ? (
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.9 }}>
            En <strong style={{ color: 'var(--text)' }}>{periodLabel}</strong> recibes{' '}
            <strong style={{ color: 'var(--accent)' }}>{fmtM(ingresoNeto)}</strong> netos,
            de los cuales{' '}
            <strong style={{ color: 'var(--red)' }}>{fmtM(gastosMensual)}</strong> van a gastos y{' '}
            <strong style={{ color: '#f5a623' }}>{fmtM(deudaMensual)}</strong> a cuotas de deuda.
            {aporteMensual > 0 && (
              <> Tu plan de inversión es <strong style={{ color: 'var(--blue)' }}>{fmtM(aporteMensual)}</strong>/mes.</>
            )}
            {' '}Te quedan <strong style={{ color: flujoLibre >= 0 ? '#4a6b10' : 'var(--red)' }}>{fmtM(flujoLibre)}</strong> de flujo libre —{' '}
            {flujoLibre >= 0
              ? `el ${Math.round((flujoLibre / ingresoNeto) * 100)}% de tus ingresos disponible para ahorro adicional, imprevistos o acelerar la deuda.`
              : 'estás en déficit. Revisa gastos o busca fuentes de ingreso adicional.'}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.9 }}>
            Desde tus primeros registros has acumulado{' '}
            <strong style={{ color: '#f5a623' }}>{fmtM(lifetimeData.deudaPagadaAcumulada)}</strong> en pagos de deuda y{' '}
            <strong style={{ color: 'var(--blue)' }}>{fmtM(lifetimeData.inversionAcumulada)}</strong> en inversión registrada.
            Tu patrimonio financiero hoy es{' '}
            <strong style={{ color: patrimonio >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmtM(patrimonio)}</strong>
            {' '}(inversiones menos saldo de deuda).
          </div>
        )}
      </Card>
    </div>
  )
}