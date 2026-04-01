import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSeguimiento } from '../../hooks/useSeguimiento'
import { Card, SectionTitle, MetricCard, EmptyState, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { TrendingUp, Landmark, DollarSign, Wallet, Receipt } from 'lucide-react'

function typeConfig(type) {
  const map = {
    ingreso: { label: 'Ingreso', color: 'var(--accent)', icon: Wallet },
    'deuda-cuota': { label: 'Cuota', color: 'var(--red)', icon: Landmark },
    'deuda-abono': { label: 'Abono', color: '#5ca8ff', icon: Landmark },
    'deuda-cargo': { label: 'Cargo', color: '#ffc266', icon: Landmark },
    'inversion-aporte': { label: 'Aporte', color: '#5ca8ff', icon: DollarSign },
    'inversion-compra': { label: 'Compra', color: '#5ca8ff', icon: DollarSign },
    'inversion-retiro': { label: 'Retiro', color: '#ffc266', icon: DollarSign },
    'inversion-venta': { label: 'Venta', color: '#ffc266', icon: DollarSign },
    'inversion-interes': { label: 'Interés', color: 'var(--accent)', icon: DollarSign },
    'inversion-dividendo': { label: 'Dividendo', color: 'var(--accent)', icon: DollarSign },
    'inversion-ajuste': { label: 'Ajuste', color: 'var(--text)', icon: DollarSign },
    'gasto-total': { label: 'Gasto', color: 'var(--text)', icon: Receipt },
  }
  return map[type] || { label: type, color: 'var(--text)', icon: TrendingUp }
}

export default function SeguimientoPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading,
    periods,
    defaultPeriod,
    summary,
    feed,
    getPeriodData,
  } = useSeguimiento(uid)

  const [period, setPeriod] = useState(defaultPeriod || '')

  const periodData = useMemo(() => {
    if (!period) {
      return {
        summary,
        feed,
      }
    }
    return getPeriodData(period)
  }, [period, summary, feed, getPeriodData])

  if (!uid) return null

  if (loading) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Construyendo seguimiento…</div>
      </Card>
    )
  }

  if (!periods.length) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sin movimientos todavía"
        subtitle="Registra ingresos, movimientos de deudas o inversiones para activar el seguimiento."
      />
    )
  }

  const s = periodData.summary
  const f = periodData.feed

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {periods.slice(0, 12).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              borderRadius: 6,
              cursor: 'pointer',
              background: p === period ? 'var(--accent)' : 'var(--bg-3)',
              color: p === period ? '#0a0a0a' : 'var(--text-2)',
              border: '1px solid ' + (p === period ? 'transparent' : 'var(--border)'),
              fontWeight: p === period ? 600 : 400,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Ingresos reales" value={fmtM(s.ingresoReal || 0)} color="var(--accent)" />
        <MetricCard label="Pago de deudas" value={fmtM(s.deudaReal || 0)} color="var(--red)" />
        <MetricCard label="Mov. inversiones" value={fmtM(s.inversionReal || 0)} color="#5ca8ff" />
        <MetricCard label="Gasto mensual base" value={fmtM(s.gastoMensual || 0)} />
        <MetricCard
          label="Ahorro neto"
          value={fmtM(s.ahorroNeto || 0)}
          color={s.ahorroNeto >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
      </div>

      <Card>
        <SectionTitle>Feed consolidado del período</SectionTitle>

        {!f.length ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin movimientos para este período.</div>
        ) : (
          f.map((item) => {
            const cfg = typeConfig(item.type)
            const Icon = cfg.icon

            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 160px',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 0',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={13} color={cfg.color} />
                  <Badge color="default">{cfg.label}</Badge>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {item.subtitle || '—'} · {item.date}
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: cfg.color,
                    textAlign: 'right',
                  }}
                >
                  {fmt(item.amount || 0)}
                </div>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}