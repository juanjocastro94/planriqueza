import { useMemo } from 'react'
import { useIngresos } from './useIngresos'
import { useGastos } from './useGastos'
import { useDeudas } from './useDeudas'
import { useInversiones } from './useInversiones'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function buildPeriods({ ingresos, deudas, inversiones }) {
  const set = new Set()

  ;(ingresos?.fuentes || []).forEach((f) => {
    ;(f.registros || []).forEach((r) => {
      if (r.periodo) set.add(r.periodo)
    })
  })

  ;(deudas?.items || []).forEach((d) => {
    ;(d.ejecucion?.movimientos || []).forEach((m) => {
      if (m.periodo) set.add(m.periodo)
    })
  })

  ;(inversiones?.items || []).forEach((i) => {
    ;(i.ejecucion?.movimientos || []).forEach((m) => {
      if (m.periodo) set.add(m.periodo)
      else if (m.fecha?.slice) set.add(m.fecha.slice(0, 7))
    })
  })

  const current = currentPeriod()
  if (!set.has(current)) set.add(current)

  return Array.from(set).sort().reverse()
}

function buildFeed({ period, ingresos, deudas, inversiones, gastos }) {
  const items = []

  ;(ingresos?.fuentes || []).forEach((f) => {
    ;(f.registros || [])
      .filter((r) => r.periodo === period)
      .forEach((r) => {
        const neto =
          Number(r.neto || 0) > 0
            ? Number(r.neto || 0)
            : Number(r.bruto || 0) +
              Number(r.variable || 0) -
              Number(r.salud || 0) -
              Number(r.pension || 0) -
              Number(r.solidaridad || 0) -
              Number(r.retencion || 0) -
              Number(r.otrosDescuentos || 0)

        items.push({
          id: `ingreso-${f.id}-${r.id}`,
          date: r.periodo,
          type: 'ingreso',
          title: f.nombre || 'Ingreso',
          subtitle: r.nota || f.tipo || 'registro',
          amount: neto,
        })
      })
  })

  ;(deudas?.items || []).forEach((d) => {
    ;(d.ejecucion?.movimientos || [])
      .filter((m) => m.periodo === period)
      .forEach((m) => {
        if (Number(m.cuotaPagada || 0) > 0) {
          items.push({
            id: `deuda-cuota-${d.id}-${m.id}`,
            date: m.periodo,
            type: 'deuda-cuota',
            title: d.nombre || 'Pago deuda',
            subtitle: m.nota || 'Cuota pagada',
            amount: Number(m.cuotaPagada || 0),
          })
        }

        if (Number(m.abonoCapital || 0) > 0) {
          items.push({
            id: `deuda-abono-${d.id}-${m.id}`,
            date: m.periodo,
            type: 'deuda-abono',
            title: d.nombre || 'Abono deuda',
            subtitle: m.nota || 'Abono a capital',
            amount: Number(m.abonoCapital || 0),
          })
        }

        if (Number(m.cargos || 0) > 0) {
          items.push({
            id: `deuda-cargo-${d.id}-${m.id}`,
            date: m.periodo,
            type: 'deuda-cargo',
            title: d.nombre || 'Cargo deuda',
            subtitle: m.nota || 'Cargo',
            amount: Number(m.cargos || 0),
          })
        }
      })
  })

  ;(inversiones?.items || []).forEach((inv) => {
    ;(inv.ejecucion?.movimientos || [])
      .filter((m) => (m.periodo || m.fecha?.slice?.(0, 7)) === period)
      .forEach((m) => {
        items.push({
          id: `inv-${inv.id}-${m.id}`,
          date: m.fecha || m.periodo,
          type: `inversion-${m.tipo}`,
          title: inv.nombre || 'Inversión',
          subtitle: m.nota || m.tipo || 'movimiento',
          amount: Number(m.montoCOP || 0),
        })
      })
  })

  const gastoMensual = Number(gastos?.metrics?.totalMensual || 0)
  if (gastoMensual > 0) {
    items.push({
      id: `gasto-total-${period}`,
      date: period,
      type: 'gasto-total',
      title: 'Gasto mensual estimado',
      subtitle: 'Fijos + variables + provisiones + suscripciones',
      amount: gastoMensual,
    })
  }

  return items.sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

function summarizePeriod({ period, ingresos, deudas, inversiones, gastos }) {
  const ingresoReal = (ingresos?.fuentes || []).reduce((s, f) => {
    return (
      s +
      (f.registros || [])
        .filter((r) => r.periodo === period)
        .reduce((acc, r) => {
          const neto =
            Number(r.neto || 0) > 0
              ? Number(r.neto || 0)
              : Number(r.bruto || 0) +
                Number(r.variable || 0) -
                Number(r.salud || 0) -
                Number(r.pension || 0) -
                Number(r.solidaridad || 0) -
                Number(r.retencion || 0) -
                Number(r.otrosDescuentos || 0)
          return acc + neto
        }, 0)
    )
  }, 0)

  const deudaReal = (deudas?.items || []).reduce((s, d) => {
    return (
      s +
      (d.ejecucion?.movimientos || [])
        .filter((m) => m.periodo === period)
        .reduce(
          (acc, m) =>
            acc +
            Number(m.cuotaPagada || 0) +
            Number(m.abonoCapital || 0) +
            Number(m.cargos || 0),
          0
        )
    )
  }, 0)

  const inversionReal = (inversiones?.items || []).reduce((s, inv) => {
    return (
      s +
      (inv.ejecucion?.movimientos || [])
        .filter((m) => (m.periodo || m.fecha?.slice?.(0, 7)) === period)
        .reduce((acc, m) => acc + Number(m.montoCOP || 0), 0)
    )
  }, 0)

  const gastoMensual = Number(gastos?.metrics?.totalMensual || 0)

  return {
    ingresoReal,
    deudaReal,
    inversionReal,
    gastoMensual,
    ahorroNeto: ingresoReal - gastoMensual - deudaReal - inversionReal,
  }
}

export function useSeguimiento(uid) {
  const ingresos = useIngresos(uid)
  const gastos = useGastos(uid)
  const deudas = useDeudas(uid)
  const inversiones = useInversiones(uid)

  const loading =
    ingresos.loading ||
    gastos.loading ||
    deudas.loading ||
    inversiones.loading

  const periods = useMemo(
    () => buildPeriods({ ingresos, deudas, inversiones }),
    [ingresos, deudas, inversiones]
  )

  const state = useMemo(() => {
    const defaultPeriod = periods[0] || currentPeriod()
    const summary = summarizePeriod({
      period: defaultPeriod,
      ingresos,
      deudas,
      inversiones,
      gastos,
    })
    const feed = buildFeed({
      period: defaultPeriod,
      ingresos,
      deudas,
      inversiones,
      gastos,
    })

    return {
      periods,
      defaultPeriod,
      summary,
      feed,
    }
  }, [periods, ingresos, deudas, inversiones, gastos])

  const getPeriodData = useMemo(() => {
    return (period) => ({
      summary: summarizePeriod({
        period,
        ingresos,
        deudas,
        inversiones,
        gastos,
      }),
      feed: buildFeed({
        period,
        ingresos,
        deudas,
        inversiones,
        gastos,
      }),
    })
  }, [ingresos, deudas, inversiones, gastos])

  return {
    loading,
    periods: state.periods,
    defaultPeriod: state.defaultPeriod,
    summary: state.summary,
    feed: state.feed,
    getPeriodData,
  }
}