import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useResumen } from '../../hooks/useResumen'
import { Card, SectionTitle, MetricCard, Badge, EmptyState, Btn } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Landmark,
  DollarSign,
  ArrowRight,
  Target,
  AlertTriangle,
  CheckCircle2,
  CalendarRange,
  Layers3,
} from 'lucide-react'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function FocusCard({ tone = 'info', title, body, actionLabel }) {
  const tones = {
    success: {
      bg: 'rgba(183,222,74,0.12)',
      border: '1px solid rgba(183,222,74,0.22)',
      icon: '#6f8f1c',
      title: '#5f7d15',
    },
    warning: {
      bg: 'rgba(216,162,72,0.12)',
      border: '1px solid rgba(216,162,72,0.22)',
      icon: '#b27a22',
      title: '#9b6c1f',
    },
    danger: {
      bg: 'rgba(217,92,92,0.10)',
      border: '1px solid rgba(217,92,92,0.22)',
      icon: 'var(--red)',
      title: 'var(--red)',
    },
    info: {
      bg: 'var(--bg-3)',
      border: '1px solid var(--border)',
      icon: 'var(--blue)',
      title: '#416fc8',
    },
  }

  const c = tones[tone] || tones.info
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' ? AlertTriangle : Target

  return (
    <Card
      style={{
        background: c.bg,
        border: c.border,
        padding: '1.1rem 1.15rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Icon size={18} color={c.icon} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.title, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{body}</div>
          {actionLabel && (
            <div style={{ marginTop: 12 }}>
              <Btn variant="subtle" style={{ padding: '6px 10px' }}>
                {actionLabel} <ArrowRight size={12} />
              </Btn>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function StepCard({ title, subtitle, status = 'pending' }) {
  const map = {
    done: { color: 'green', label: 'Hecho' },
    pending: { color: 'amber', label: 'Pendiente' },
    empty: { color: 'default', label: 'Opcional' },
  }
  const s = map[status] || map.pending

  return (
    <Card style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 700 }}>{title}</div>
        <Badge color={s.color}>{s.label}</Badge>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{subtitle}</div>
    </Card>
  )
}

function PulseCard({ icon: Icon, title, main, sub, color }) {
  return (
    <Card style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={14} color={color} />
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.04em' }}>{title}</div>
      </div>

      <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: color || 'var(--text)', fontWeight: 700, marginBottom: 6 }}>
        {main}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>{sub}</div>
    </Card>
  )
}

function buildFocus(state) {
  if (state.focus) return state.focus

  return {
    tone: 'info',
    title: 'Resumen disponible',
    body: 'Tu información financiera ya está consolidada. Usa esta vista para detectar prioridades y decidir mejor.',
    actionLabel: null,
  }
}

export default function ResumenPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const [viewMode, setViewMode] = useState('current')
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod())

  const { loading, state } = useResumen(uid, { viewMode, selectedPeriod })

  if (!uid) return null

  if (loading) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Construyendo resumen financiero…</div>
      </Card>
    )
  }

  if (!state) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Sin resumen disponible"
        subtitle="Completa ingresos, gastos, deudas e inversiones para construir el tablero."
      />
    )
  }

  const hasAnyData =
    state.ingresos.totalFuentes > 0 ||
    state.deudas.total > 0 ||
    state.inversiones.total > 0 ||
    state.gastos.totalMensual > 0

  if (!hasAnyData) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Tu resumen todavía está vacío"
        subtitle="Empieza creando una fuente de ingreso, una deuda principal o tu primera meta."
      />
    )
  }

  const { ingresos, gastos, deudas, inversiones, resumen, periodLabel, periodData, lifetimeData, snapshot } = state
  const patrimonio = resumen.patrimonioFinanciero
  const focus = buildFocus(state)

  const isLifetime = viewMode === 'lifetime'
  const isPeriod = viewMode === 'period'
  const isCurrent = viewMode === 'current'

  const setupItems = [
    {
      title: 'Ingresos cargados',
      subtitle: ingresos.totalFuentes > 0
        ? `${ingresos.totalFuentes} fuente(s) registradas. Neto mensual actual: ${fmt(ingresos.netoMensual)}.`
        : 'Necesitas al menos una fuente de ingreso para que Compás tenga sentido real.',
      status: ingresos.totalFuentes > 0 ? 'done' : 'pending',
    },
    {
      title: 'Deuda principal definida',
      subtitle: deudas.total > 0
        ? `${deudas.total} deuda(s) registradas. Saldo total actual: ${fmt(deudas.saldoTotal)}.`
        : 'Si tienes deuda, este debería ser uno de los primeros módulos en completar.',
      status: deudas.total > 0 ? 'done' : 'pending',
    },
    {
      title: 'Inversión o patrimonio en marcha',
      subtitle: inversiones.total > 0
        ? `${inversiones.total} inversión(es) registradas. Valor actual: ${fmt(inversiones.valorActualTotal)}.`
        : 'No es obligatorio para arrancar, pero sí importante para pasar de control a crecimiento.',
      status: inversiones.total > 0 ? 'done' : 'empty',
    },
  ]

  const topMetrics = isLifetime
    ? [
        {
          label: 'Deuda pagada acumulada',
          value: fmtM(lifetimeData.deudaPagadaAcumulada),
          color: 'var(--red)',
        },
        {
          label: 'Inversión acumulada',
          value: fmtM(lifetimeData.inversionAcumulada),
          color: 'var(--blue)',
        },
        {
          label: 'Saldo deuda actual',
          value: fmtM(snapshot.deudaSaldoTotal),
          color: 'var(--red)',
        },
        {
          label: 'Patrimonio actual',
          value: fmtM(snapshot.patrimonioFinanciero),
          color: snapshot.patrimonioFinanciero >= 0 ? 'var(--accent)' : 'var(--red)',
        },
      ]
    : [
        {
          label: 'Flujo libre plan',
          value: fmtM(periodData.flujoLibrePlan),
          color: periodData.flujoLibrePlan >= 0 ? 'var(--accent)' : 'var(--red)',
        },
        {
          label: 'Pago deuda mensual',
          value: fmtM(snapshot.deudaPagoPlanMensual),
          color: 'var(--red)',
        },
        {
          label: 'Inversiones actuales',
          value: fmtM(inversiones.valorActualTotal),
          color: 'var(--blue)',
        },
        {
          label: isCurrent ? 'Cumplimiento mes' : `Cumplimiento ${periodLabel}`,
          value: `${periodData.cumplimientoMensual}%`,
          color:
            periodData.cumplimientoMensual >= 100
              ? 'var(--accent)'
              : periodData.cumplimientoMensual >= 70
                ? 'var(--amber)'
                : 'var(--red)',
        },
      ]

  return (
    <div>
      <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Vista del resumen</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {isCurrent && 'Lectura del mes actual'}
              {isPeriod && `Lectura del período ${periodLabel}`}
              {isLifetime && 'Lectura acumulada desde tus primeros registros'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn variant={isCurrent ? 'accent' : 'subtle'} onClick={() => setViewMode('current')}>
              Este mes
            </Btn>

            <Btn variant={isPeriod ? 'accent' : 'subtle'} onClick={() => setViewMode('period')}>
              <CalendarRange size={13} />
              Mes específico
            </Btn>

            <Btn variant={isLifetime ? 'accent' : 'subtle'} onClick={() => setViewMode('lifetime')}>
              <Layers3 size={13} />
              Acumulado
            </Btn>

            {isPeriod && (
              <div style={{ width: 170 }}>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {topMetrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            color={m.color}
          />
        ))}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <FocusCard {...focus} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12, marginBottom: '1.25rem' }}>
        <Card>
          <SectionTitle>{isLifetime ? 'Foto actual del sistema' : `Cómo estás en ${periodLabel}`}</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MetricCard label="Ingreso neto mensual" value={fmtM(ingresos.netoMensual)} color="var(--accent)" />
            <MetricCard label="Gasto mensual total" value={fmtM(gastos.totalMensual)} />
            <MetricCard
              label={isLifetime ? 'Deuda pagada acumulada' : 'Plan mensual'}
              value={fmtM(isLifetime ? lifetimeData.deudaPagadaAcumulada : periodData.planMensual)}
            />
            <MetricCard
              label={isLifetime ? 'Inversión acumulada' : 'Ejecución del período'}
              value={fmtM(isLifetime ? lifetimeData.inversionAcumulada : periodData.realMensual)}
              color={isLifetime ? 'var(--blue)' : 'var(--text)'}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle>{isLifetime ? 'Base del sistema' : 'Próximos pasos'}</SectionTitle>

          <div style={{ display: 'grid', gap: 10 }}>
            {setupItems.map((item) => (
              <StepCard key={item.title} {...item} />
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <PulseCard
          icon={Wallet}
          title="Ingresos"
          main={fmt(ingresos.netoMensual)}
          sub={`${ingresos.totalFuentes} fuente(s) registradas`}
          color="var(--accent)"
        />

        <PulseCard
          icon={Landmark}
          title="Deudas"
          main={fmt(deudas.saldoTotal)}
          sub={
            isLifetime
              ? `${deudas.total} deuda(s) · pagado acumulado ${fmt(deudas.realAcumulado)}`
              : `${deudas.total} deuda(s) · real del período ${fmt(deudas.realMensual)}`
          }
          color="var(--red)"
        />

        <PulseCard
          icon={DollarSign}
          title="Inversiones"
          main={fmt(inversiones.valorActualTotal)}
          sub={
            isLifetime
              ? `${inversiones.total} inversión(es) · acumulado ${fmt(inversiones.realAcumulado)}`
              : `${inversiones.total} inversión(es) · real del período ${fmt(inversiones.realMensual)}`
          }
          color="var(--blue)"
        />
      </div>

      <Card style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingUp size={14} color="var(--accent)" />
          <SectionTitle>Lectura simple</SectionTitle>
        </div>

        {!isLifetime ? (
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
            En <strong style={{ color: 'var(--text)' }}>{periodLabel}</strong> estás generando{' '}
            <strong style={{ color: 'var(--text)' }}>{fmt(ingresos.netoMensual)}</strong> netos al mes y gastando{' '}
            <strong style={{ color: 'var(--text)' }}>{fmt(gastos.totalMensual)}</strong>. Tu plan del período es{' '}
            <strong style={{ color: 'var(--text)' }}>{fmt(periodData.planMensual)}</strong>, tu ejecución real va en{' '}
            <strong style={{ color: 'var(--blue)' }}>{fmt(periodData.realMensual)}</strong> y el flujo libre plan queda en{' '}
            <strong style={{ color: periodData.flujoLibrePlan >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {fmt(periodData.flujoLibrePlan)}
            </strong>.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
            Desde tus primeros registros has acumulado{' '}
            <strong style={{ color: 'var(--red)' }}>{fmt(lifetimeData.deudaPagadaAcumulada)}</strong> en pagos de deuda
            y <strong style={{ color: 'var(--blue)' }}>{fmt(lifetimeData.inversionAcumulada)}</strong> en inversión registrada.
            Hoy tu patrimonio financiero actual es{' '}
            <strong style={{ color: patrimonio >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(patrimonio)}</strong>,
            calculado como inversiones actuales menos saldo actual de deuda.
          </div>
        )}
      </Card>
    </div>
  )
}