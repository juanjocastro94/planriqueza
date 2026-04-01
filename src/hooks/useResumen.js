import { useMemo } from 'react'
import { useIngresos } from './useIngresos'
import { useGastos } from './useGastos'
import { useDeudas } from './useDeudas'
import { useInversiones } from './useInversiones'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatPeriodLabel(period) {
  if (!period) return ''
  const [year, month] = String(period).split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}

function safeNum(v) {
  return Number(v || 0)
}

function getAllPeriods(deudasItems = [], inversionesItems = []) {
  const set = new Set()

  ;(deudasItems || []).forEach((debt) => {
    ;(debt?.ejecucion?.movimientos || []).forEach((m) => {
      if (m?.periodo) set.add(m.periodo)
    })
  })

  ;(inversionesItems || []).forEach((inv) => {
    ;(inv?.ejecucion?.movimientos || []).forEach((m) => {
      if (m?.periodo) set.add(m.periodo)
    })
  })

  const periods = Array.from(set).sort().reverse()
  if (!periods.includes(currentPeriod())) periods.unshift(currentPeriod())
  return periods
}

function deudaRealMes(items = [], period) {
  return items.reduce((s, debt) => {
    const movimientos = debt?.ejecucion?.movimientos || []
    const total = movimientos
      .filter((m) => m.periodo === period)
      .reduce(
        (acc, m) =>
          acc +
          safeNum(m.cuotaPagada) +
          safeNum(m.abonoCapital) +
          safeNum(m.cargos),
        0
      )
    return s + total
  }, 0)
}

function deudaRealAcumulada(items = []) {
  return items.reduce((s, debt) => {
    const movimientos = debt?.ejecucion?.movimientos || []
    const total = movimientos.reduce(
      (acc, m) =>
        acc +
        safeNum(m.cuotaPagada) +
        safeNum(m.abonoCapital) +
        safeNum(m.cargos),
      0
    )
    return s + total
  }, 0)
}

function deudaPlanMes(items = []) {
  return items.reduce((s, debt) => {
    const cuota = safeNum(debt?.derived?.pagoTotalMensual)
    const abonoPlan = safeNum(debt?.plan?.abonoMensualCapital)

    return s + cuota + abonoPlan
  }, 0)
}

function inversionRealMes(items = [], period) {
  return items.reduce((s, inv) => {
    const movimientos = inv?.ejecucion?.movimientos || []
    const total = movimientos
      .filter((m) => m.periodo === period)
      .reduce((acc, m) => acc + safeNum(m.montoCOP), 0)
    return s + total
  }, 0)
}

function inversionRealAcumulada(items = []) {
  return items.reduce((s, inv) => {
    const movimientos = inv?.ejecucion?.movimientos || []
    const total = movimientos.reduce((acc, m) => acc + safeNum(m.montoCOP), 0)
    return s + total
  }, 0)
}

function inversionPlanMes(items = []) {
  return items.reduce((s, inv) => {
    const aporte = safeNum(inv?.plan?.aporteMensual)
    return s + aporte
  }, 0)
}

function calcularCumplimiento(plan, real) {
  if (!plan) return real > 0 ? 100 : 0
  return Math.round((safeNum(real) / safeNum(plan)) * 100)
}

function buildFocus({
  viewMode,
  periodLabel,
  ingresoNetoMensual,
  gastoMensualTotal,
  deudaPagoMensual,
  inversionPlanMensual,
  planMensual,
  realMensual,
  flujoLibrePlan,
}) {
  const cumplimiento = calcularCumplimiento(planMensual, realMensual)
  const cargaDeuda = ingresoNetoMensual > 0 ? Math.round((deudaPagoMensual / ingresoNetoMensual) * 100) : 0

  if (viewMode === 'lifetime') {
    return {
      tone: 'info',
      title: 'Vista acumulada',
      body: 'Aquí estás viendo la película completa desde tu primer registro, no solo el comportamiento de un mes.',
    }
  }

  if (realMensual === 0) {
    return {
      tone: flujoLibrePlan >= 0 ? 'warning' : 'danger',
      title: `Sin ejecución registrada — ${periodLabel}`,
      body:
        flujoLibrePlan >= 0
          ? `Tienes capacidad teórica para ejecutar ${planMensual.toLocaleString('es-CO')} este período, pero aún no hay movimiento real registrado.`
          : `Tu estructura actual deja un flujo libre plan negativo. Antes de empujar inversión, toca ordenar presión mensual.`,
    }
  }

  if (cumplimiento >= 100) {
    return {
      tone: 'success',
      title: `Plan cumplido — ${periodLabel}`,
      body: `Ya ejecutaste ${realMensual.toLocaleString('es-CO')} frente a un plan de ${planMensual.toLocaleString('es-CO')}. Ahora el foco es sostener consistencia.`,
    }
  }

  if (cargaDeuda >= 35) {
    return {
      tone: 'danger',
      title: 'La deuda pesa demasiado',
      body: `Hoy la carga mensual de deuda está cerca del ${cargaDeuda}% de tu ingreso neto mensual. Esa sigue siendo la restricción principal.`,
    }
  }

  if (flujoLibrePlan > 0 && inversionPlanMensual === 0) {
    return {
      tone: 'info',
      title: 'Ya hay espacio para construir patrimonio',
      body: `Después de gastos y compromisos, todavía queda flujo libre plan. El siguiente paso es decidir si va a deuda, caja o inversión.`,
    }
  }

  return {
    tone: 'info',
    title: `Mes en curso — ${periodLabel}`,
    body: `Tu sistema ya tiene actividad registrada. El siguiente salto no es meter más datos, sino usarlos para decidir mejor.`,
  }
}

export function useResumen(uid, options = {}) {
  const {
    viewMode = 'current', // current | period | lifetime
    selectedPeriod = currentPeriod(),
  } = options

  const ingresos = useIngresos(uid)
  const gastos = useGastos(uid)
  const deudas = useDeudas(uid)
  const inversiones = useInversiones(uid)

  const loading =
    ingresos.loading ||
    gastos.loading ||
    deudas.loading ||
    inversiones.loading

  const state = useMemo(() => {
    const resolvedPeriod = viewMode === 'current' ? currentPeriod() : selectedPeriod
    const periodLabel =
      viewMode === 'lifetime'
        ? 'Acumulado'
        : formatPeriodLabel(resolvedPeriod)

    const allPeriods = getAllPeriods(deudas.items || [], inversiones.items || [])

    // Snapshots actuales
    const ingresoBrutoMensual = safeNum(ingresos.metrics?.ingresoBrutoMensual)
    const ingresoNetoMensual = safeNum(ingresos.metrics?.ingresoNetoMensual)

    const gastoFijoMensual = safeNum(gastos.metrics?.totalFijos)
    const gastoVariableMensual = safeNum(gastos.metrics?.totalVariables)
    const gastoExtraProvision = safeNum(gastos.metrics?.totalExtraordinariosProvision)
    const gastoSuscripciones = safeNum(gastos.metrics?.totalSuscripciones)
    const gastoMensualTotal = safeNum(gastos.metrics?.totalMensual)

    const deudaSaldoTotal = safeNum(deudas.metrics?.saldoTotal)
    const deudaPagoPlanMensual = deudaPlanMes(deudas.items || [])
    const deudaPagoRealMensual = deudaRealMes(deudas.items || [], resolvedPeriod)
    const deudaPagoRealAcumulado = deudaRealAcumulada(deudas.items || [])

    const inversionValorActualTotal = safeNum(inversiones.metrics?.valorActualTotalCOP)
    const inversionPlanMensual = inversionPlanMes(inversiones.items || [])
    const inversionRealMensual = inversionRealMes(inversiones.items || [], resolvedPeriod)
    const inversionRealAcumulado = inversionRealAcumulada(inversiones.items || [])

    const planMensual = deudaPagoPlanMensual + inversionPlanMensual
    const realMensual = deudaPagoRealMensual + inversionRealMensual
    const cumplimientoMensual = calcularCumplimiento(planMensual, realMensual)

    const flujoLibrePlan = ingresoNetoMensual - gastoMensualTotal - planMensual
    const flujoLibreReal = ingresoNetoMensual - gastoMensualTotal - realMensual

    const patrimonioFinanciero = inversionValorActualTotal - deudaSaldoTotal

    const focus = buildFocus({
      viewMode,
      periodLabel,
      ingresoNetoMensual,
      gastoMensualTotal,
      deudaPagoMensual: deudaPagoPlanMensual,
      inversionPlanMensual,
      planMensual,
      realMensual,
      flujoLibrePlan,
    })

    return {
      viewMode,
      selectedPeriod: resolvedPeriod,
      availablePeriods: allPeriods,
      periodLabel,

      snapshot: {
        ingresoBrutoMensual,
        ingresoNetoMensual,
        gastoMensualTotal,
        deudaSaldoTotal,
        deudaPagoPlanMensual,
        inversionValorActualTotal,
        patrimonioFinanciero,
      },

      periodData: {
        period: resolvedPeriod,
        deudaRealMensual: deudaPagoRealMensual,
        inversionRealMensual,
        planMensual,
        realMensual,
        cumplimientoMensual,
        flujoLibrePlan,
        flujoLibreReal,
      },

      lifetimeData: {
        deudaPagadaAcumulada: deudaPagoRealAcumulado,
        inversionAcumulada: inversionRealAcumulado,
      },

      ingresos: {
        brutoMensual: ingresoBrutoMensual,
        netoMensual: ingresoNetoMensual,
        totalFuentes: safeNum(ingresos.metrics?.totalFuentes),
      },

      gastos: {
        fijoMensual: gastoFijoMensual,
        variableMensual: gastoVariableMensual,
        extraordinarioProvisionMensual: gastoExtraProvision,
        suscripcionesMensual: gastoSuscripciones,
        totalMensual: gastoMensualTotal,
      },

      deudas: {
        saldoTotal: deudaSaldoTotal,
        planMensual: deudaPagoPlanMensual,
        realMensual: deudaPagoRealMensual,
        realAcumulado: deudaPagoRealAcumulado,
        pagoMensualTotal: safeNum(deudas.metrics?.pagoMensualTotal || deudas.metrics?.pagoTotalMensual || deudaPagoPlanMensual),
        total: safeNum(deudas.metrics?.totalDeudas),
      },

      inversiones: {
        valorActualTotal: inversionValorActualTotal,
        planMensual: inversionPlanMensual,
        realMensual: inversionRealMensual,
        realAcumulado: inversionRealAcumulado,
        total: safeNum(inversiones.metrics?.totalInversiones),
      },

      resumen: {
        planMensual,
        realMensual,
        cumplimientoMensual,
        flujoLibrePlan,
        flujoLibreReal,
        patrimonioFinanciero,
      },

      focus,
    }
  }, [ingresos, gastos, deudas, inversiones, viewMode, selectedPeriod])

  return {
    loading,
    state,
    ingresos,
    gastos,
    deudas,
    inversiones,
  }
}