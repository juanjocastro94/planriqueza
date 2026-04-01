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

function tasaEAFromDebt(debt) {
  const tasaTipo = debt?.condiciones?.tasaTipo || 'ea'
  const tasaValor = Number(debt?.condiciones?.tasaValor || 0)

  if (tasaTipo === 'nmv') {
    return (Math.pow(1 + tasaValor / 100, 12) - 1) * 100
  }

  return tasaValor
}

function tasaMensualFromEA(tasaEA) {
  return Math.pow(1 + Number(tasaEA || 0) / 100, 1 / 12) - 1
}

function latestMovementPeriod(movimientos = []) {
  if (!movimientos.length) return null
  return [...movimientos].sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))[0]?.periodo || null
}

function deriveDebt(debt) {
  const condiciones = debt?.condiciones || {}
  const costos = debt?.costos || {}
  const plan = debt?.plan || {}
  const ejecucion = debt?.ejecucion || {}

  const saldoActual = Number(condiciones.saldoActual || 0)
  const montoOriginal = Number(condiciones.montoOriginal || 0)
  const residualPct = Number(condiciones.residualPct || 0)

  const residualValor =
    Number(condiciones.residualValor || 0) > 0
      ? Number(condiciones.residualValor || 0)
      : Math.round((montoOriginal || saldoActual) * (residualPct / 100))

  const mesesPagados = calcularMesesPagadosDesdeFecha(condiciones.fechaDesembolso)
  const mesesRestantes = Math.max(1, Number(condiciones.plazoMeses || 1) - mesesPagados)

  const cuotaCalculada = calcularCuotaDeuda({
    saldo: saldoActual,
    tasaTipo: condiciones.tasaTipo,
    tasaValor: Number(condiciones.tasaValor || 0),
    mesesRestantes,
    residualPct: Number(condiciones.residualPct || 0),
  })

  const cuotaFinanciera =
    Number(condiciones.cuotaManual || 0) > 0
      ? Number(condiciones.cuotaManual || 0)
      : cuotaCalculada

  const segurosMensuales =
    Number(costos.seguroVidaMensual || 0) +
    Number(costos.seguroDesempleoMensual || 0) +
    Number(costos.seguroHogarMensual || 0) +
    Number(costos.seguroTodoRiesgoMensual || 0) +
    Number(costos.otrosSegurosMensuales || 0)

  const otrosCargosMensuales = Number(costos.otrosCargosMensuales || 0)
  const pagoTotalMensual = cuotaFinanciera + segurosMensuales + otrosCargosMensuales

  const movimientos = ejecucion.movimientos || []
  const eventosPlanificados = plan.eventosPlanificados || []

  const totalMovimientos = movimientos.reduce(
    (acc, mov) => {
      acc.cuotaPagada += Number(mov.cuotaPagada || 0)
      acc.abonoCapital += Number(mov.abonoCapital || 0)
      acc.cargos += Number(mov.cargos || 0)
      return acc
    },
    { cuotaPagada: 0, abonoCapital: 0, cargos: 0 }
  )

  return {
    ...debt,
    derived: {
      tasaEA: tasaEAFromDebt(debt),
      tasaMensual: tasaMensualFromEA(tasaEAFromDebt(debt)),
      mesesPagados,
      mesesRestantes,
      globo: residualValor,
      residualValor,
      cuotaCalculada,
      cuotaFinanciera,
      segurosMensuales,
      otrosCargosMensuales,
      pagoTotalMensual,
      totalMovimientos,
      totalEventosPlanificados: eventosPlanificados.reduce((s, e) => s + Number(e.monto || 0), 0),
      ultimoPeriodoRegistrado: latestMovementPeriod(movimientos),
    },
  }
}

function deriveDebtsState(items = []) {
  const debts = items.map(deriveDebt)

  const metrics = debts.reduce(
    (acc, debt) => {
      acc.totalDeudas += 1
      acc.saldoTotal += Number(debt.condiciones?.saldoActual || 0)
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