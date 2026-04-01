import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useResumen } from '../../hooks/useResumen'
import { Card, SectionTitle, MetricCard, Field, EmptyState, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { GitCompare } from 'lucide-react'

function calcFutureValue(monthlyContribution, annualRatePct, years) {
  const pmt = Number(monthlyContribution || 0)
  const r = Number(annualRatePct || 0) / 100 / 12
  const n = Math.max(1, Number(years || 1) * 12)

  if (!r) return Math.round(pmt * n)

  return Math.round(pmt * ((Math.pow(1 + r, n) - 1) / r))
}

function scenarioColor(rank) {
  if (rank === 1) return 'var(--accent)'
  if (rank === 2) return '#5ca8ff'
  return '#ffc266'
}

export default function EscenariosPage() {
  const { user } = useAuth()
  const uid = user?.uid || null
  const { loading, state } = useResumen(uid)

  const [years, setYears] = useState(5)
  const [debtReturnProxy, setDebtReturnProxy] = useState(14)
  const [investmentReturn, setInvestmentReturn] = useState(8)
  const [reservePct, setReservePct] = useState(20)

  const scenarios = useMemo(() => {
    const flujoLibre = Number(state?.resumen?.flujoLibrePlan || 0)
    const deudaSaldo = Number(state?.deudas?.saldoTotal || 0)
    const inversionActual = Number(state?.inversiones?.valorActualTotal || 0)
    const patrimonioActual = Number(state?.resumen?.patrimonioFinanciero || 0)

    const usableFlow = Math.max(0, flujoLibre)
    const reserve = usableFlow * (Number(reservePct || 0) / 100)
    const allocatable = Math.max(0, usableFlow - reserve)

    const rows = [
      {
        id: 'base',
        nombre: 'Base',
        deudaExtraMensual: 0,
        inversionExtraMensual: 0,
        descripcion: 'Mantener el plan actual sin reasignar flujo libre.',
      },
      {
        id: 'deuda',
        nombre: 'Acelerar deuda',
        deudaExtraMensual: allocatable * 0.8,
        inversionExtraMensual: allocatable * 0.2,
        descripcion: 'Priorizar bajar deuda más rápido y liberar carga financiera.',
      },
      {
        id: 'inversion',
        nombre: 'Acelerar inversión',
        deudaExtraMensual: allocatable * 0.2,
        inversionExtraMensual: allocatable * 0.8,
        descripcion: 'Priorizar acumulación de portafolio y crecimiento compuesto.',
      },
    ].map((row) => {
      const ahorroInteres = calcFutureValue(row.deudaExtraMensual, debtReturnProxy, years)
      const valorInversionNueva = calcFutureValue(row.inversionExtraMensual, investmentReturn, years)
      const deudaProyectada = Math.max(0, deudaSaldo - ahorroInteres)
      const inversionProyectada = inversionActual + valorInversionNueva
      const patrimonioProyectado = patrimonioActual + ahorroInteres + valorInversionNueva

      return {
        ...row,
        ahorroInteres,
        valorInversionNueva,
        deudaProyectada,
        inversionProyectada,
        patrimonioProyectado,
      }
    })

    const ranked = [...rows].sort((a, b) => b.patrimonioProyectado - a.patrimonioProyectado)

    return ranked.map((item, index) => ({
      ...item,
      rank: index + 1,
    }))
  }, [state, years, debtReturnProxy, investmentReturn, reservePct])

  if (!uid) return null

  if (loading) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Construyendo escenarios…</div>
      </Card>
    )
  }

  if (!state) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Sin base para escenarios"
        subtitle="Primero carga ingresos, gastos, deudas e inversiones."
      />
    )
  }

  const flujoLibre = Number(state?.resumen?.flujoLibrePlan || 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard
          label="Flujo libre plan"
          value={fmtM(flujoLibre)}
          color={flujoLibre >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
        <MetricCard
          label="Deuda total actual"
          value={fmtM(state?.deudas?.saldoTotal || 0)}
          color="var(--red)"
        />
        <MetricCard
          label="Inversiones actuales"
          value={fmtM(state?.inversiones?.valorActualTotal || 0)}
          color="#5ca8ff"
        />
        <MetricCard
          label="Patrimonio financiero"
          value={fmtM(state?.resumen?.patrimonioFinanciero || 0)}
          color="var(--accent)"
        />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Supuestos del análisis</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Field label="Horizonte (años)">
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value || 1))}
            />
          </Field>

          <Field label="Retorno proxy deuda %">
            <input
              type="number"
              value={debtReturnProxy}
              onChange={(e) => setDebtReturnProxy(Number(e.target.value || 0))}
            />
          </Field>

          <Field label="Retorno inversión %">
            <input
              type="number"
              value={investmentReturn}
              onChange={(e) => setInvestmentReturn(Number(e.target.value || 0))}
            />
          </Field>

          <Field label="Reserva de flujo libre %">
            <input
              type="number"
              value={reservePct}
              onChange={(e) => setReservePct(Number(e.target.value || 0))}
            />
          </Field>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
          El modelo toma el flujo libre del plan, separa una reserva prudente y compara distintos usos del excedente.
          No reemplaza una tabla de amortización exacta; sirve para priorización estratégica.
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 12 }}>
        {scenarios.map((s) => (
          <Card key={s.id}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <SectionTitle>{s.nombre}</SectionTitle>
                  <Badge color={s.rank === 1 ? 'green' : s.rank === 2 ? 'blue' : 'amber'}>
                    #{s.rank}
                  </Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.descripcion}</div>
              </div>

              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: scenarioColor(s.rank),
                  fontSize: 18,
                }}
              >
                {fmtM(s.patrimonioProyectado)}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
                marginBottom: '1rem',
              }}
            >
              <MetricCard label="Extra a deuda / mes" value={fmtM(s.deudaExtraMensual)} />
              <MetricCard label="Extra a inversión / mes" value={fmtM(s.inversionExtraMensual)} />
              <MetricCard label="Ahorro / efecto deuda" value={fmtM(s.ahorroInteres)} color="var(--accent)" />
              <MetricCard label="Nueva inversión acumulada" value={fmtM(s.valorInversionNueva)} color="#5ca8ff" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Row label="Deuda proyectada" value={fmt(s.deudaProyectada)} color="var(--red)" />
                <Row label="Inversión proyectada" value={fmt(s.inversionProyectada)} color="#5ca8ff" />
                <Row label="Patrimonio proyectado" value={fmt(s.patrimonioProyectado)} color="var(--accent)" />
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                En <strong style={{ color: 'var(--text)' }}>{years} años</strong>, este escenario proyecta un patrimonio
                financiero de <strong style={{ color: scenarioColor(s.rank) }}>{fmt(s.patrimonioProyectado)}</strong>.
                La diferencia sale de cómo distribuyes el flujo libre entre reducir deuda y acelerar inversión.
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

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