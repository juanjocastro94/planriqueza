import { useMemo } from 'react'
import { useIngresos } from './useIngresos'
import { useGastos } from './useGastos'
import { useDeudas } from './useDeudas'
import { useInversiones } from './useInversiones'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentPeriodLabel() {
  const d = new Date()
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}

function deudaRealMes(items = [], period = currentPeriod()) {
  return items.reduce((s, debt) => {
    const movimientos = debt?.ejecucion?.movimientos || []
    const total = movimientos
      .filter((m) => m.periodo === period)
      .reduce(
        (acc, m) =>
          acc +
          Number(m.cuotaPagada || 0) +
          Number(m.abonoCapital || 0) +
          Number(m.cargos || 0),
        0
      )
    return s + total
  }, 0)
}

function deudaPlanMes(items = []) {
  return items.reduce((s, debt) => {
    const cuota = Number(debt?.derived?.pagoTotalMensual || 0)
    const abonoPlan = Number(debt?.plan?.abonoMensualCapital || 0)
    const puntuales = (debt?.plan?.eventosPlanificados || [])
      .filter((e) => Number(e.mesOffset || 0) === 1)
      .reduce((acc, e) => acc + Number(e.monto || 0), 0)

    return s + cuota + abonoPlan + puntuales
  }, 0)
}

function inversionRealMes(items = [], period = currentPeriod()) {
  return items.reduce((s, inv) => {
    const movimientos = inv?.ejecucion?.movimientos || []
    const total = movimientos
      .filter((m) => m.periodo === period)
      .reduce((acc, m) => acc + Number(m.montoCOP || 0), 0)
    return s + total
  }, 0)
}

function inversionPlanMes(items = []) {
  return items.reduce((s, inv) => {
    const aporte = Number(inv?.plan?.aporteMensual || 0)
    const puntuales = (inv?.plan?.eventosPlanificados || [])
      .filter((e) => Number(e.mesOffset || 0) === 1)
      .reduce((acc, e) => acc + Number(e.monto || 0), 0)

    return s + aporte + puntuales
  }, 0)
}

function calcularCumplimiento(plan, real) {
  if (!plan) return real > 0 ? 100 : 0
  return Math.round((Number(real || 0) / Number(plan || 0)) * 100)
}

export function useResumen(uid) {
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
    const period = currentPeriod()

    const ingresoBrutoMensual = Number(ingresos.metrics?.ingresoBrutoMensual || 0)
    const ingresoNetoMensual = Number(ingresos.metrics?.ingresoNetoMensual || 0)

    const gastoFijoMensual = Number(gastos.metrics?.totalFijos || 0)
    const gastoVariableMensual = Number(gastos.metrics?.totalVariables || 0)
    const gastoExtraProvision = Number(gastos.metrics?.totalExtraordinariosProvision || 0)
    const gastoSuscripciones = Number(gastos.metrics?.totalSuscripciones || 0)
    const gastoMensualTotal = Number(gastos.metrics?.totalMensual || 0)

    const deudaSaldoTotal = Number(deudas.metrics?.saldoTotal || 0)
    const deudaPagoPlanMensual = deudaPlanMes(deudas.items || [])
    const deudaPagoRealMensual = deudaRealMes(deudas.items || [], period)

    const inversionValorActualTotal = Number(inversiones.metrics?.valorActualTotalCOP || 0)
    const inversionPlanMensual = inversionPlanMes(inversiones.items || [])
    const inversionRealMensual = inversionRealMes(inversiones.items || [], period)

    const planMensual = deudaPagoPlanMensual + inversionPlanMensual
    const realMensual = deudaPagoRealMensual + inversionRealMensual
    const cumplimientoMensual = calcularCumplimiento(planMensual, realMensual)

    const flujoLibrePlan = ingresoNetoMensual - gastoMensualTotal - planMensual
    const flujoLibreReal = ingresoNetoMensual - gastoMensualTotal - realMensual

    const patrimonioFinanciero = inversionValorActualTotal - deudaSaldoTotal

    return {
      period,
      periodLabel: currentPeriodLabel(),

      ingresos: {
        brutoMensual: ingresoBrutoMensual,
        netoMensual: ingresoNetoMensual,
        totalFuentes: Number(ingresos.metrics?.totalFuentes || 0),
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
        total: Number(deudas.metrics?.totalDeudas || 0),
      },

      inversiones: {
        valorActualTotal: inversionValorActualTotal,
        planMensual: inversionPlanMensual,
        realMensual: inversionRealMensual,
        total: Number(inversiones.metrics?.totalInversiones || 0),
      },

      resumen: {
        planMensual,
        realMensual,
        cumplimientoMensual,
        flujoLibrePlan,
        flujoLibreReal,
        patrimonioFinanciero,
      },
    }
  }, [ingresos, gastos, deudas, inversiones])

  return {
    loading,
    state,
    ingresos,
    gastos,
    deudas,
    inversiones,
  }
}