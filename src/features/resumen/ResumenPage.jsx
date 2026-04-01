import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useResumen } from '../../hooks/useResumen'
import { Card, SectionTitle, MetricCard, Badge, EmptyState } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { LayoutDashboard, TrendingUp, Wallet, Landmark, DollarSign, Receipt } from 'lucide-react'

function Row({ label, value, color }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '7px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color }}>{value}</span>
    </div>
  )
}

function AlertBox({ type = 'info', title, children }) {
  const styles = {
    success: {
      bg: 'var(--accent-dim)',
      border: '1px solid rgba(200,240,96,0.25)',
      color: 'var(--accent)',
    },
    warning: {
      bg: 'rgba(255,194,102,0.08)',
      border: '1px solid rgba(255,194,102,0.25)',
      color: '#ffc266',
    },
    info: {
      bg: 'var(--bg-3)',
      border: '1px solid var(--border)',
      color: '#5ca8ff',
    },
    danger: {
      bg: 'rgba(255,92,92,0.08)',
      border: '1px solid rgba(255,92,92,0.25)',
      color: 'var(--red)',
    },
  }[type]

  return (
    <div
      style={{
        padding: '1rem 1.1rem',
        background: styles.bg,
        border: styles.border,
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1rem',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: styles.color, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>{children}</div>
    </div>
  )
}

export default function ResumenPage() {
  const { user } = useAuth()
  const uid = user?.uid || null
  const { loading, state } = useResumen(uid)

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
        subtitle="Empieza creando fuentes de ingreso, gastos, deudas o inversiones."
      />
    )
  }

  const { ingresos, gastos, deudas, inversiones, resumen, periodLabel } = state

  const cumplimiento = resumen.cumplimientoMensual
  const flujoPlan = resumen.flujoLibrePlan
  const flujoReal = resumen.flujoLibreReal
  const patrimonio = resumen.patrimonioFinanciero

  return (
    <div>
      {cumplimiento >= 100 ? (
        <AlertBox type="success" title={`Plan cumplido — ${periodLabel}`}>
          Registraste {fmt(resumen.realMensual)} frente a un plan de {fmt(resumen.planMensual)}.
          {flujoPlan > 0 ? ` Aún te quedarían ${fmt(flujoPlan)} después del plan.` : ''}
        </AlertBox>
      ) : resumen.realMensual === 0 ? (
        <AlertBox type={flujoPlan >= 0 ? 'warning' : 'danger'} title={`Sin ejecución registrada — ${periodLabel}`}>
          Tu plan del mes es {fmt(resumen.planMensual)}. Con el nivel actual de gastos, tu flujo libre plan es{' '}
          <strong style={{ color: flujoPlan >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(flujoPlan)}</strong>.
        </AlertBox>
      ) : (
        <AlertBox type="info" title={`Mes en curso — ${periodLabel}`}>
          Llevas {cumplimiento}% del plan mensual. Has registrado {fmt(resumen.realMensual)} y faltan{' '}
          {fmt(Math.max(0, resumen.planMensual - resumen.realMensual))}.
        </AlertBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Ingreso neto mensual" value={fmtM(ingresos.netoMensual)} color="var(--accent)" />
        <MetricCard label="Gasto mensual total" value={fmtM(gastos.totalMensual)} />
        <MetricCard label="Plan mensual" value={fmtM(resumen.planMensual)} />
        <MetricCard
          label="Cumplimiento"
          value={`${cumplimiento}%`}
          color={cumplimiento >= 100 ? 'var(--accent)' : cumplimiento >= 70 ? '#f59e0b' : 'var(--red)'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Saldo de deudas" value={fmtM(deudas.saldoTotal)} color="var(--red)" />
        <MetricCard label="Valor inversiones" value={fmtM(inversiones.valorActualTotal)} color="#5ca8ff" />
        <MetricCard
          label="Patrimonio financiero"
          value={fmtM(patrimonio)}
          color={patrimonio >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
        <MetricCard
          label="Flujo libre plan"
          value={fmtM(flujoPlan)}
          color={flujoPlan >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        <Card>
          <SectionTitle>Vista consolidada</SectionTitle>
          <Row label="Ingreso bruto mensual" value={fmt(ingresos.brutoMensual)} />
          <Row label="Ingreso neto mensual" value={fmt(ingresos.netoMensual)} color="var(--accent)" />
          <Row label="Gasto fijo mensual" value={fmt(gastos.fijoMensual)} />
          <Row label="Gasto variable mensual" value={fmt(gastos.variableMensual)} />
          <Row label="Provisión extraordinarios" value={fmt(gastos.extraordinarioProvisionMensual)} />
          <Row label="Suscripciones" value={fmt(gastos.suscripcionesMensual)} />
          <Row label="Total gastos" value={fmt(gastos.totalMensual)} />
          <Row label="Flujo libre real" value={fmt(flujoReal)} color={flujoReal >= 0 ? '#5ca8ff' : 'var(--red)'} />
        </Card>

        <Card>
          <SectionTitle>Plan vs ejecución</SectionTitle>
          <Row label="Plan deuda" value={fmt(deudas.planMensual)} />
          <Row label="Real deuda" value={fmt(deudas.realMensual)} color={deudas.realMensual >= deudas.planMensual ? 'var(--accent)' : 'var(--text)'} />
          <Row label="Plan inversiones" value={fmt(inversiones.planMensual)} />
          <Row label="Real inversiones" value={fmt(inversiones.realMensual)} color={inversiones.realMensual >= inversiones.planMensual ? 'var(--accent)' : 'var(--text)'} />
          <Row label="Plan mensual total" value={fmt(resumen.planMensual)} />
          <Row label="Real mensual total" value={fmt(resumen.realMensual)} color="#5ca8ff" />
          <div style={{ marginTop: 12 }}>
            <Badge color={cumplimiento >= 100 ? 'green' : cumplimiento >= 70 ? 'amber' : 'red'}>
              {cumplimiento}% cumplimiento del mes
            </Badge>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Wallet size={14} color="var(--accent)" />
            <SectionTitle>Ingresos</SectionTitle>
          </div>
          <Row label="Fuentes" value={String(ingresos.totalFuentes)} />
          <Row label="Neto mensual" value={fmt(ingresos.netoMensual)} />
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Receipt size={14} color="#ffc266" />
            <SectionTitle>Gastos</SectionTitle>
          </div>
          <Row label="Mensual total" value={fmt(gastos.totalMensual)} />
          <Row label="Provisión extra" value={fmt(gastos.extraordinarioProvisionMensual)} />
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Landmark size={14} color="var(--red)" />
            <SectionTitle>Deudas</SectionTitle>
          </div>
          <Row label="Total deudas" value={String(deudas.total)} />
          <Row label="Saldo total" value={fmt(deudas.saldoTotal)} />
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <DollarSign size={14} color="#5ca8ff" />
            <SectionTitle>Inversiones</SectionTitle>
          </div>
          <Row label="Total inversiones" value={String(inversiones.total)} />
          <Row label="Valor actual" value={fmt(inversiones.valorActualTotal)} />
        </Card>
      </div>

      <Card style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingUp size={14} color="var(--accent)" />
          <SectionTitle>Lectura ejecutiva</SectionTitle>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.75 }}>
          Hoy tu estructura muestra un ingreso neto mensual de <strong style={{ color: 'var(--text)' }}>{fmt(ingresos.netoMensual)}</strong>,
          gastos mensuales de <strong style={{ color: 'var(--text)' }}>{fmt(gastos.totalMensual)}</strong> y un flujo libre plan de{' '}
          <strong style={{ color: flujoPlan >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(flujoPlan)}</strong>.
          Tu patrimonio financiero actual es{' '}
          <strong style={{ color: patrimonio >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(patrimonio)}</strong>,
          calculado como inversiones menos saldo de deuda.
        </div>
      </Card>
    </div>
  )
}