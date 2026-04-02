import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  subscribeDebts,
  createDebtDoc,
  updateDebtDoc,
  deleteDebtDoc,
  createDebtPlannedEventDoc,
  updateDebtPlannedEventDoc,
  deleteDebtPlannedEventDoc,
  createDebtMovementDoc,
  updateDebtMovementDoc,
  deleteDebtMovementDoc,
} from '../services/firestore/deudas'
import { calcularCuotaDeuda, calcularMesesPagadosDesdeFecha } from '../utils/calc'


function latestMovementPeriod(movimientos = []) {
  if (!movimientos.length) return null
  return [...movimientos].sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))[0]?.periodo || null
}

function deriveDebt(debt) {
  const condiciones = debt?.condiciones || {}
  const costos      = debt?.costos      || {}
  const plan        = debt?.plan        || {}
  const ejecucion   = debt?.ejecucion   || {}

  const montoOriginal = Number(condiciones.montoOriginal || 0)
  const plazoMeses    = Number(condiciones.plazoMeses    || 1)
  const residualPct   = Number(condiciones.residualPct   || 0)
  const residualValor = Number(condiciones.residualValor || 0) > 0
    ? Number(condiciones.residualValor)
    : Math.round(montoOriginal * (residualPct / 100))

  const movimientos         = ejecucion.movimientos         || []
  const eventosPlanificados = plan.eventosPlanificados      || []

  // ── Tasa mensual ──────────────────────────────────────────────────────────
  const tasaTipo  = condiciones.tasaTipo  || 'ea'
  const tasaValor = Number(condiciones.tasaValor || 0)
  const tasaEA    = tasaTipo === 'nmv'
    ? (Math.pow(1 + tasaValor / 100, 12) - 1) * 100
    : tasaValor
  const i = Math.pow(1 + tasaEA / 100, 1 / 12) - 1  // tasa mensual

  // ── Cuota FIJA sobre monto original y plazo total (amortización francesa) ─
  // C = (P - G/(1+i)^n) × i / (1 - (1+i)^-n)
  // Si hay valor residual (globo), se descuenta del capital a amortizar
  let cuotaOriginal = 0
  if (montoOriginal > 0 && i > 0) {
    const factor = Math.pow(1 + i, plazoMeses)
    cuotaOriginal = Math.round(
      (montoOriginal - residualValor / factor) * i / (1 - 1 / factor)
    )
  } else if (montoOriginal > 0) {
    cuotaOriginal = Math.round(montoOriginal / plazoMeses)
  }

  // ── Meses pagados desde la fecha de desembolso ────────────────────────────
  const mesesPagados   = calcularMesesPagadosDesdeFecha(condiciones.fechaDesembolso)
  const mesesRestantes = Math.max(1, plazoMeses - mesesPagados)

  // ── Saldo teórico por tabla de amortización francesa ──────────────────────
  // S(n) = P×(1+i)^n − C×[(1+i)^n − 1]/i
  let saldoAmortizado = montoOriginal
  if (montoOriginal > 0 && i > 0 && mesesPagados > 0) {
    const factor = Math.pow(1 + i, mesesPagados)
    saldoAmortizado = Math.max(0, Math.round(
      montoOriginal * factor - cuotaOriginal * (factor - 1) / i
    ))
  }

  // ── Abonos extra a capital registrados (reducen el saldo adicional) ───────
  const abonosExtraCapital = movimientos.reduce(
    (s, m) => s + Number(m.abonoCapital || 0), 0
  )

  // ── Saldo real = saldo amortizado − abonos extra ──────────────────────────
  const saldoReal = Math.max(0, saldoAmortizado - abonosExtraCapital)

  // ── Cuota calculada = cuotaOriginal (es fija, no cambia) ──────────────────
  // Si el usuario ingresó cuota manual, esa tiene prioridad
  const cuotaCalculada  = cuotaOriginal
  const cuotaFinanciera = Number(condiciones.cuotaManual || 0) > 0
    ? Number(condiciones.cuotaManual)
    : cuotaCalculada

  // ── Costos mensuales ──────────────────────────────────────────────────────
  const segurosMensuales =
    Number(costos.seguroVidaMensual       || 0) +
    Number(costos.seguroDesempleoMensual  || 0) +
    Number(costos.seguroHogarMensual      || 0) +
    Number(costos.seguroTodoRiesgoMensual || 0) +
    Number(costos.otrosSegurosMensuales   || 0)
  const otrosCargosMensuales = Number(costos.otrosCargosMensuales || 0)
  const pagoTotalMensual = cuotaFinanciera + segurosMensuales + otrosCargosMensuales

  // ── Totales de movimientos ────────────────────────────────────────────────
  const totalMovimientos = movimientos.reduce(
    (acc, mov) => {
      acc.cuotaPagada  += Number(mov.cuotaPagada  || 0)
      acc.abonoCapital += Number(mov.abonoCapital || 0)
      acc.cargos       += Number(mov.cargos       || 0)
      return acc
    },
    { cuotaPagada: 0, abonoCapital: 0, cargos: 0 }
  )

  // ── Intereses restantes SIN plan ──────────────────────────────────────────
  // Total a pagar − saldo pendiente − globo = intereses puros restantes
  const interesesRestantesSinPlan = Math.max(0, Math.round(
    cuotaFinanciera * mesesRestantes - saldoReal + residualValor
  ))

  // ── Proyección CON plan (simulación mes a mes) ────────────────────────────
  const abonoMensualPlan = Number(plan.abonoMensualCapital || 0)
  let saldoSim       = saldoReal
  let mesesConPlan   = mesesRestantes
  let interesesConPlan = 0

  if (saldoSim > 0 && i > 0 && (abonoMensualPlan > 0 || eventosPlanificados.length > 0)) {
    saldoSim     = saldoReal
    mesesConPlan = 0
    for (let m = 1; m <= mesesRestantes + 1; m++) {
      if (saldoSim <= 0) break
      const interesMes      = saldoSim * i
      const amortizacion    = cuotaFinanciera - interesMes
      interesesConPlan     += interesMes
      const eventoMes       = eventosPlanificados
        .filter(e => Number(e.mesOffset) === m)
        .reduce((s, e) => s + Number(e.monto || 0), 0)
      saldoSim = Math.max(0, saldoSim - amortizacion - abonoMensualPlan - eventoMes)
      mesesConPlan = m
      if (saldoSim <= 0) break
    }
  }

  const mesesAhorrados    = Math.max(0, mesesRestantes - mesesConPlan)
  const interesesAhorrados = Math.max(0, Math.round(interesesRestantesSinPlan - interesesConPlan))

  return {
    ...debt,
    derived: {
      tasaEA,
      tasaMensual:     i,
      mesesPagados,
      mesesRestantes,
      mesesConPlan,
      mesesAhorrados,
      saldoAmortizado,
      saldoReal,
      globo:           residualValor,
      residualValor,
      cuotaOriginal,
      cuotaCalculada,
      cuotaFinanciera,
      segurosMensuales,
      otrosCargosMensuales,
      pagoTotalMensual,
      interesesRestantesSinPlan,
      interesesConPlan:  Math.round(interesesConPlan),
      interesesAhorrados,
      totalMovimientos,
      totalEventosPlanificados: eventosPlanificados.reduce((s, e) => s + Number(e.monto || 0), 0),
      ultimoPeriodoRegistrado:  latestMovementPeriod(movimientos),
    },
  }
}

function deriveDebtsState(items = []) {
  const debts = items.map(deriveDebt)

  const metrics = debts.reduce(
    (acc, debt) => {
      acc.totalDeudas += 1
      acc.saldoTotal += Number(debt.derived?.saldoReal || 0)
      acc.pagoMensualTotal += Number(debt.derived?.pagoTotalMensual || 0)
      acc.abonoMensualPlan += Number(debt.plan?.abonoMensualCapital || 0)
      return acc
    },
    {
      totalDeudas: 0,
      saldoTotal: 0,
      pagoMensualTotal: 0,
      abonoMensualPlan: 0,
    }
  )

  return {
    items: debts,
    metrics,
  }
}

export function useDeudas(uid) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeDebts(uid, (nextItems) => {
      setItems(nextItems || [])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [uid])

  const state = useMemo(() => deriveDebtsState(items), [items])

  const createDeuda = useCallback(
    async (payload) => {
      await createDebtDoc(uid, payload)
    },
    [uid]
  )

  const updateDeuda = useCallback(
    async (debtId, patch) => {
      await updateDebtDoc(uid, debtId, patch)
    },
    [uid]
  )

  const deleteDeuda = useCallback(
    async (debtId) => {
      await deleteDebtDoc(uid, debtId)
    },
    [uid]
  )

  const createEventoPlanificado = useCallback(
    async (debtId, payload) => {
      await createDebtPlannedEventDoc(uid, debtId, payload)
    },
    [uid]
  )

  const updateEventoPlanificado = useCallback(
    async (debtId, eventId, patch) => {
      await updateDebtPlannedEventDoc(uid, debtId, eventId, patch)
    },
    [uid]
  )

  const deleteEventoPlanificado = useCallback(
    async (debtId, eventId) => {
      await deleteDebtPlannedEventDoc(uid, debtId, eventId)
    },
    [uid]
  )

  const createMovimiento = useCallback(
    async (debtId, payload) => {
      await createDebtMovementDoc(uid, debtId, payload)
    },
    [uid]
  )

  const updateMovimiento = useCallback(
    async (debtId, movementId, patch) => {
      await updateDebtMovementDoc(uid, debtId, movementId, patch)
    },
    [uid]
  )

  const deleteMovimiento = useCallback(
    async (debtId, movementId) => {
      await deleteDebtMovementDoc(uid, debtId, movementId)
    },
    [uid]
  )

  return {
    loading,
    items: state.items,
    metrics: state.metrics,
    createDeuda,
    updateDeuda,
    deleteDeuda,
    createEventoPlanificado,
    updateEventoPlanificado,
    deleteEventoPlanificado,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
  }
}