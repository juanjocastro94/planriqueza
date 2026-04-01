import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  subscribeFixedExpenses,
  subscribeVariableExpenses,
  subscribeExtraordinaryExpenses,
  subscribeSubscriptions,
  createFixedExpenseDoc,
  updateFixedExpenseDoc,
  deleteFixedExpenseDoc,
  createVariableExpenseDoc,
  updateVariableExpenseDoc,
  deleteVariableExpenseDoc,
  createExtraordinaryExpenseDoc,
  updateExtraordinaryExpenseDoc,
  deleteExtraordinaryExpenseDoc,
  createSubscriptionDoc,
  updateSubscriptionDoc,
  deleteSubscriptionDoc,
} from '../services/firestore/gastos'

function extraordinaryMonthlyProvision(item) {
  const valor = Number(item?.valor || 0)
  const frecuencia = item?.frecuencia || 'anual'

  const veces = {
    mensual: 12,
    bimestral: 6,
    trimestral: 4,
    semestral: 2,
    anual: 1,
    eventual: 1,
  }[frecuencia] || 1

  return Math.round((valor * veces) / 12)
}

function deriveGastosState({ fijos, variables, extraordinarios, suscripciones }) {
  const totalFijos = (fijos || [])
    .filter((i) => i.activo !== false)
    .reduce((s, i) => s + Number(i.valorMensual || 0), 0)

  const totalVariables = (variables || [])
    .filter((i) => i.activo !== false)
    .reduce((s, i) => s + Number(i.presupuestoMensual || 0), 0)

  const totalExtraordinariosProvision = (extraordinarios || [])
    .filter((i) => i.activo !== false)
    .reduce((s, i) => s + extraordinaryMonthlyProvision(i), 0)

  const totalSuscripciones = (suscripciones || [])
    .filter((i) => i.activo !== false)
    .reduce((s, i) => s + Number(i.valorMensual || 0), 0)

  return {
    fijos: fijos || [],
    variables: variables || [],
    extraordinarios: extraordinarios || [],
    suscripciones: suscripciones || [],
    metrics: {
      totalFijos,
      totalVariables,
      totalExtraordinariosProvision,
      totalSuscripciones,
      totalMensual:
        totalFijos +
        totalVariables +
        totalExtraordinariosProvision +
        totalSuscripciones,
    },
  }
}

export function useGastos(uid) {
  const [fijos, setFijos] = useState([])
  const [variables, setVariables] = useState([])
  const [extraordinarios, setExtraordinarios] = useState([])
  const [suscripciones, setSuscripciones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setFijos([])
      setVariables([])
      setExtraordinarios([])
      setSuscripciones([])
      setLoading(false)
      return
    }

    setLoading(true)

    let readyCount = 0
    const markReady = () => {
      readyCount += 1
      if (readyCount >= 4) setLoading(false)
    }

    const unsubs = [
      subscribeFixedExpenses(uid, (items) => {
        setFijos(items || [])
        markReady()
      }),
      subscribeVariableExpenses(uid, (items) => {
        setVariables(items || [])
        markReady()
      }),
      subscribeExtraordinaryExpenses(uid, (items) => {
        setExtraordinarios(items || [])
        markReady()
      }),
      subscribeSubscriptions(uid, (items) => {
        setSuscripciones(items || [])
        markReady()
      }),
    ]

    return () => unsubs.forEach((u) => u && u())
  }, [uid])

  const state = useMemo(
    () => deriveGastosState({ fijos, variables, extraordinarios, suscripciones }),
    [fijos, variables, extraordinarios, suscripciones]
  )

  const createFijo = useCallback(async (payload) => {
    await createFixedExpenseDoc(uid, payload)
  }, [uid])

  const updateFijo = useCallback(async (id, patch) => {
    await updateFixedExpenseDoc(uid, id, patch)
  }, [uid])

  const deleteFijo = useCallback(async (id) => {
    await deleteFixedExpenseDoc(uid, id)
  }, [uid])

  const createVariable = useCallback(async (payload) => {
    await createVariableExpenseDoc(uid, payload)
  }, [uid])

  const updateVariable = useCallback(async (id, patch) => {
    await updateVariableExpenseDoc(uid, id, patch)
  }, [uid])

  const deleteVariable = useCallback(async (id) => {
    await deleteVariableExpenseDoc(uid, id)
  }, [uid])

  const createExtraordinario = useCallback(async (payload) => {
    await createExtraordinaryExpenseDoc(uid, payload)
  }, [uid])

  const updateExtraordinario = useCallback(async (id, patch) => {
    await updateExtraordinaryExpenseDoc(uid, id, patch)
  }, [uid])

  const deleteExtraordinario = useCallback(async (id) => {
    await deleteExtraordinaryExpenseDoc(uid, id)
  }, [uid])

  const createSuscripcion = useCallback(async (payload) => {
    await createSubscriptionDoc(uid, payload)
  }, [uid])

  const updateSuscripcion = useCallback(async (id, patch) => {
    await updateSubscriptionDoc(uid, id, patch)
  }, [uid])

  const deleteSuscripcion = useCallback(async (id) => {
    await deleteSubscriptionDoc(uid, id)
  }, [uid])

  return {
    loading,
    fijos: state.fijos,
    variables: state.variables,
    extraordinarios: state.extraordinarios,
    suscripciones: state.suscripciones,
    metrics: state.metrics,
    createFijo,
    updateFijo,
    deleteFijo,
    createVariable,
    updateVariable,
    deleteVariable,
    createExtraordinario,
    updateExtraordinario,
    deleteExtraordinario,
    createSuscripcion,
    updateSuscripcion,
    deleteSuscripcion,
  }
}