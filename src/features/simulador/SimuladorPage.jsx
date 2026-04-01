import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useResumen } from '../../hooks/useResumen'
import { Card, SectionTitle, Field, Btn, MetricCard, EmptyState, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { Calculator } from 'lucide-react'

function tasaMensualDesdeEA(eaPct) {
  const ea = Number(eaPct || 0) / 100
  return Math.pow(1 + ea, 1 / 12) - 1
}

function calcularCuotaFinanciada({ monto, plazoMeses, tasaEA }) {
  const pv = Number(monto || 0)
  const n = Math.max(1, Number(plazoMeses || 1))
  const r = tasaMensualDesdeEA(tasaEA)

  if (!r) return Math.round(pv / n)

  const cuota = pv * (r / (1 - Math.pow(1 + r, -n)))
  return Math.round(cuota)
}

function evaluarRiesgo({ flujoLibrePlan, cuotaNueva, precioContado }) {
  if (precioContado > 0) {
    if (precioContado <= Math.max(0, flujoLibrePlan) * 3) {
      return { nivel: 'bajo', texto: 'Golpe manejable para caja' }
    }
    if (precioContado <= Math.max(0, flujoLibrePlan) * 8) {
      return { nivel: 'medio', texto: 'Te consume caja importante' }
    }
    return { nivel: 'alto', texto: 'Presión fuerte sobre liquidez' }
  }

  if (cuotaNueva <= Math.max(0, flujoLibrePlan) * 0.35) {
    return { nivel: 'bajo', texto: 'Cuota razonable contra flujo libre' }
  }
  if (cuotaNueva <= Math.max(0, flujoLibrePlan) * 0.7) {
    return { nivel: 'medio', texto: 'Cuota exigente pero posible' }
  }
  return { nivel: 'alto', texto: 'Cuota muy pesada para el flujo actual' }
}

export default function SimuladorPage() {
  const { user } = useAuth()
  const uid = user?.uid || null
  const { loading, state } = useResumen(uid)

  const [form, setForm] = useState({
    nombre: '',
    tipoCompra: 'financiado',
    precio: '',
    inicial: '',
    plazoMeses: '60',
    tasaEA: '15',
    gastosAsociados: '',
  })

  const result = useMemo(() => {
    const precio = Number(form.precio || 0)
    const inicial = Number(form.inicial || 0)
    const gastosAsociados = Number(form.gastosAsociados || 0)
    const totalContado = precio + gastosAsociados

    const flujoLibrePlan = Number(state?.resumen?.flujoLibrePlan || 0)
    const ingresoNeto = Number(state?.ingresos?.netoMensual || 0)
    const gastoBase = Number(state?.gastos?.totalMensual || 0)
    const planActual = Number(state?.resumen?.planMensual || 0)

    if (!precio) {
      return {
        flujoLibrePlan,
        ingresoNeto,
        gastoBase,
        planActual,
        precio,
        totalContado,
        montoFinanciar: 0,
        cuotaNueva: 0,
        totalPagadoCredito: 0,
        intereses: 0,
        flujoPostCompra: flujoLibrePlan,
        esfuerzoSobreIngreso: 0,
        riesgo: evaluarRiesgo({ flujoLibrePlan, cuotaNueva: 0, precioContado: 0 }),
      }
    }

    if (form.tipoCompra === 'contado') {
      const flujoPostCompra = flujoLibrePlan
      const esfuerzoSobreIngreso = ingresoNeto > 0 ? Math.round((totalContado / ingresoNeto) * 100) : 0

      return {
        flujoLibrePlan,
        ingresoNeto,
        gastoBase,
        planActual,
        precio,
        totalContado,
        montoFinanciar: 0,
        cuotaNueva: 0,
        totalPagadoCredito: 0,
        intereses: 0,
        flujoPostCompra,
        esfuerzoSobreIngreso,
        riesgo: evaluarRiesgo({ flujoLibrePlan, cuotaNueva: 0, precioContado: totalContado }),
      }
    }

    const montoFinanciar = Math.max(0, precio - inicial + gastosAsociados)
    const cuotaNueva = calcularCuotaFinanciada({
      monto: montoFinanciar,
      plazoMeses: Number(form.plazoMeses || 0),
      tasaEA: Number(form.tasaEA || 0),
    })

    const totalPagadoCredito = cuotaNueva * Number(form.plazoMeses || 0)
    const intereses = Math.max(0, totalPagadoCredito - montoFinanciar)
    const flujoPostCompra = flujoLibrePlan - cuotaNueva
    const esfuerzoSobreIngreso = ingresoNeto > 0 ? Math.round((cuotaNueva / ingresoNeto) * 100) : 0

    return {
      flujoLibrePlan,
      ingresoNeto,
      gastoBase,
      planActual,
      precio,
      totalContado,
      montoFinanciar,
      cuotaNueva,
      totalPagadoCredito,
      intereses,
      flujoPostCompra,
      esfuerzoSobreIngreso,
      riesgo: evaluarRiesgo({ flujoLibrePlan, cuotaNueva, precioContado: 0 }),
    }
  }, [form, state])

  if (!uid) return null

  if (loading) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Preparando simulador…</div>
      </Card>
    )
  }

  if (!state) {
    return (
      <EmptyState
        icon={Calculator}
        title="Sin base para simular"
        subtitle="Primero carga ingresos, gastos y deudas para que el simulador tenga contexto."
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Ingreso neto mensual" value={fmtM(state.ingresos?.netoMensual || 0)} color="var(--accent)" />
        <MetricCard label="Gastos base" value={fmtM(state.gastos?.totalMensual || 0)} />
        <MetricCard label="Plan financiero actual" value={fmtM(state.resumen?.planMensual || 0)} />
        <MetricCard
          label="Flujo libre plan"
          value={fmtM(state.resumen?.flujoLibrePlan || 0)}
          color={(state.resumen?.flujoLibrePlan || 0) >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Simular compra</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Field label="Nombre de la compra">
            <input
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. carro, viaje, reforma, membresía"
            />
          </Field>

          <Field label="Modo">
            <select
              value={form.tipoCompra}
              onChange={(e) => setForm((p) => ({ ...p, tipoCompra: e.target.value }))}
            >
              <option value="financiado">Financiado</option>
              <option value="contado">Contado</option>
            </select>
          </Field>

          <Field label="Precio">
            <input
              type="number"
              value={form.precio}
              onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
            />
          </Field>

          <Field label="Gastos asociados">
            <input
              type="number"
              value={form.gastosAsociados}
              onChange={(e) => setForm((p) => ({ ...p, gastosAsociados: e.target.value }))}
              placeholder="Seguros, papeleo, comisión..."
            />
          </Field>
        </div>

        {form.tipoCompra === 'financiado' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Field label="Inicial">
              <input
                type="number"
                value={form.inicial}
                onChange={(e) => setForm((p) => ({ ...p, inicial: e.target.value }))}
              />
            </Field>

            <Field label="Plazo (meses)">
              <input
                type="number"
                value={form.plazoMeses}
                onChange={(e) => setForm((p) => ({ ...p, plazoMeses: e.target.value }))}
              />
            </Field>

            <Field label="Tasa EA %">
              <input
                type="number"
                value={form.tasaEA}
                onChange={(e) => setForm((p) => ({ ...p, tasaEA: e.target.value }))}
              />
            </Field>
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
        <MetricCard label="Monto a financiar" value={fmt(result.montoFinanciar || 0)} />
        <MetricCard label="Cuota estimada" value={fmt(result.cuotaNueva || 0)} color="#5ca8ff" />
        <MetricCard label="Intereses estimados" value={fmt(result.intereses || 0)} />
        <MetricCard
          label="Flujo post compra"
          value={fmt(result.flujoPostCompra || 0)}
          color={result.flujoPostCompra >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <SectionTitle>Lectura financiera</SectionTitle>

          <Row label="Ingreso neto mensual" value={fmt(result.ingresoNeto || 0)} />
          <Row label="Gasto base mensual" value={fmt(result.gastoBase || 0)} />
          <Row label="Plan financiero actual" value={fmt(result.planActual || 0)} />
          <Row label="Flujo libre antes" value={fmt(result.flujoLibrePlan || 0)} />
          <Row label="Flujo libre después" value={fmt(result.flujoPostCompra || 0)} color={result.flujoPostCompra >= 0 ? 'var(--accent)' : 'var(--red)'} />
          {form.tipoCompra === 'financiado' && (
            <>
              <Row label="Cuota nueva" value={fmt(result.cuotaNueva || 0)} />
              <Row label="Esfuerzo sobre ingreso" value={`${result.esfuerzoSobreIngreso || 0}%`} />
            </>
          )}
          {form.tipoCompra === 'contado' && (
            <>
              <Row label="Salida total de caja" value={fmt(result.totalContado || 0)} />
              <Row label="Esfuerzo sobre ingreso" value={`${result.esfuerzoSobreIngreso || 0}%`} />
            </>
          )}

          <div style={{ marginTop: 12 }}>
            <Badge color={riesgoColor(result.riesgo?.nivel)}>{result.riesgo?.texto || 'Sin evaluación'}</Badge>
          </div>
        </Card>

        <Card>
          <SectionTitle>Lectura ejecutiva</SectionTitle>

          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.75 }}>
            {form.precio ? (
              <>
                La compra <strong style={{ color: 'var(--text)' }}>{form.nombre || 'sin nombre'}</strong>{' '}
                {form.tipoCompra === 'financiado' ? (
                  <>
                    implicaría financiar <strong style={{ color: 'var(--text)' }}>{fmt(result.montoFinanciar || 0)}</strong>,
                    con una cuota estimada de <strong style={{ color: '#5ca8ff' }}>{fmt(result.cuotaNueva || 0)}</strong>.
                    Después de esa cuota, tu flujo libre proyectado quedaría en{' '}
                    <strong style={{ color: result.flujoPostCompra >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                      {fmt(result.flujoPostCompra || 0)}
                    </strong>.
                  </>
                ) : (
                  <>
                    requeriría una salida de caja de{' '}
                    <strong style={{ color: 'var(--text)' }}>{fmt(result.totalContado || 0)}</strong>.
                    No te afecta cuota mensual, pero sí liquidez disponible.
                  </>
                )}
              </>
            ) : (
              <>Carga un monto para empezar la simulación.</>
            )}
          </div>

          {form.tipoCompra === 'financiado' && result.cuotaNueva > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: '0.8rem 0.9rem',
                borderRadius: 8,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-3)',
                lineHeight: 1.65,
              }}
            >
              Total estimado pagado al crédito:{' '}
              <strong style={{ color: 'var(--text)' }}>{fmt(result.totalPagadoCredito || 0)}</strong>
              {' · '}
              intereses estimados:{' '}
              <strong style={{ color: 'var(--text)' }}>{fmt(result.intereses || 0)}</strong>
            </div>
          )}
        </Card>
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

function riesgoColor(nivel) {
  if (nivel === 'bajo') return 'green'
  if (nivel === 'medio') return 'amber'
  return 'red'
}