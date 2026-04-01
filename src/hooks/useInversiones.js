import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  subscribeInvestments,
  createInvestmentDoc,
  updateInvestmentDoc,
  deleteInvestmentDoc,
  createInvestmentPlannedEventDoc,
  updateInvestmentPlannedEventDoc,
  deleteInvestmentPlannedEventDoc,
  createInvestmentMovementDoc,
  updateInvestmentMovementDoc,
  deleteInvestmentMovementDoc,
} from '../services/firestore/inversiones'

function latestMovementDate(movimientos = []) {
  if (!movimientos.length) return null
  return [...movimientos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0]?.fecha || null
}

function sumMovementsByType(movimientos = [], tipo) {
  return movimientos
    .filter((m) => m.tipo === tipo)
    .reduce((s, m) => s + Number(m.montoCOP || 0), 0)
}

function deriveUsdInvestment(item) {
  const movimientos = item?.ejecucion?.movimientos || []
  const trmReferencia = Number(item?.configuracion?.trmReferencia || 0)

  const compras = movimientos.filter((m) => m.tipo === 'compra' || m.tipo === 'aporte')

  const totalInvertidoCOP = compras.reduce((s, m) => s + Number(m.montoCOP || 0), 0)
  const unidadesAcumuladas = compras.reduce((s, m) => s + Number(m.montoUnidad || 0), 0)

  const trmPromedio =
    unidadesAcumuladas > 0 ? totalInvertidoCOP / unidadesAcumuladas : 0

  const valorActualCOP =
    unidadesAcumuladas > 0 && trmReferencia > 0
      ? unidadesAcumuladas * trmReferencia
      : totalInvertidoCOP

  const gananciaCambiaria = valorActualCOP - totalInvertidoCOP

  return {
    unidadesAcumuladas: Math.round(unidadesAcumuladas * 100) / 100,
    totalInvertidoCOP: Math.round(totalInvertidoCOP),
    trmPromedio: Math.round(trmPromedio),
    valorActualCOP: Math.round(valorActualCOP),
    gananciaCambiaria: Math.round(gananciaCambiaria),
  }
}

function deriveCdtInvestment(item) {
  const movimientos = item?.ejecucion?.movimientos || []
  const tasaPactada = Number(item?.configuracion?.tasaPactadaAnualPct || 0)

  const capitalInvertido = movimientos
    .filter((m) => m.tipo === 'compra' || m.tipo === 'aporte')
    .reduce((s, m) => s + Number(m.montoCOP || 0), 0)

  const fechaApertura = item?.configuracion?.fechaApertura
  const fechaVencimiento = item?.configuracion?.fechaVencimiento

  let years = 1
  if (fechaApertura && fechaVencimiento) {
    const start = new Date(fechaApertura)
    const end = new Date(fechaVencimiento)
    const ms = end.getTime() - start.getTime()
    if (!Number.isNaN(ms) && ms > 0) {
      years = ms / (1000 * 60 * 60 * 24 * 365)
    }
  }

  const interesesEstimados = capitalInvertido * (tasaPactada / 100) * years
  const valorActualCOP = capitalInvertido + interesesEstimados

  return {
    capitalInvertido: Math.round(capitalInvertido),
    interesesEstimados: Math.round(interesesEstimados),
    valorActualCOP: Math.round(valorActualCOP),
  }
}

function deriveGenericInvestment(item) {
  const movimientos = item?.ejecucion?.movimientos || []

  const aportes = movimientos
    .filter((m) => m.tipo === 'aporte' || m.tipo === 'compra')
    .reduce((s, m) => s + Number(m.montoCOP || 0), 0)

  const retiros = movimientos
    .filter((m) => m.tipo === 'retiro' || m.tipo === 'venta')
    .reduce((s, m) => s + Number(m.montoCOP || 0), 0)

  const intereses = movimientos
    .filter((m) => m.tipo === 'interes' || m.tipo === 'dividendo' || m.tipo === 'ajuste')
    .reduce((s, m) => s + Number(m.montoCOP || 0), 0)

  const capitalInvertido = aportes - retiros
  const valorActualCOP = capitalInvertido + intereses

  return {
    capitalInvertido: Math.round(capitalInvertido),
    valorActualCOP: Math.round(valorActualCOP),
  }
}

function deriveInvestment(item) {
  const ejecucion = item?.ejecucion || {}
  const plan = item?.plan || {}
  const movimientos = ejecucion.movimientos || []

  let typeDerived = {}

  if (item?.tipo === 'usd') {
    typeDerived = deriveUsdInvestment(item)
  } else if (item?.tipo === 'cdt') {
    typeDerived = deriveCdtInvestment(item)
  } else {
    typeDerived = deriveGenericInvestment(item)
  }

  const totalAportes = sumMovementsByType(movimientos, 'aporte')
  const totalCompras = sumMovementsByType(movimientos, 'compra')
  const totalRetiros = sumMovementsByType(movimientos, 'retiro')
  const totalVentas = sumMovementsByType(movimientos, 'venta')
  const totalIntereses = sumMovementsByType(movimientos, 'interes')
  const totalDividendos = sumMovementsByType(movimientos, 'dividendo')

  return {
    ...item,
    plan: {
      aporteMensual: Number(plan?.aporteMensual || 0),
      eventosPlanificados: plan?.eventosPlanificados || [],
    },
    ejecucion: {
      movimientos,
    },
    derived: {
      ...typeDerived,
      totalAportes: Math.round(totalAportes),
      totalCompras: Math.round(totalCompras),
      totalRetiros: Math.round(totalRetiros),
      totalVentas: Math.round(totalVentas),
      totalIntereses: Math.round(totalIntereses),
      totalDividendos: Math.round(totalDividendos),
      ultimoMovimiento: latestMovementDate(movimientos),
    },
  }
}

function deriveInvestmentsState(items = []) {
  const investments = (items || []).map(deriveInvestment)

  const metrics = investments.reduce(
    (acc, item) => {
      if (item.activo !== false) {
        acc.totalInversiones += 1
        acc.aporteMensualPlan += Number(item.plan?.aporteMensual || 0)
        acc.valorActualTotalCOP += Number(item.derived?.valorActualCOP || 0)
        acc.totalAportes += Number(item.derived?.totalAportes || 0)
        acc.totalCompras += Number(item.derived?.totalCompras || 0)
      }
      return acc
    },
    {
      totalInversiones: 0,
      aporteMensualPlan: 0,
      valorActualTotalCOP: 0,
      totalAportes: 0,
      totalCompras: 0,
    }
  )

  return {
    items: investments,
    metrics,
  }
}

export function useInversiones(uid) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeInvestments(uid, (nextItems) => {
      setItems(nextItems || [])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [uid])

  const state = useMemo(() => deriveInvestmentsState(items), [items])

  const createInversion = useCallback(async (payload) => {
    await createInvestmentDoc(uid, payload)
  }, [uid])

  const updateInversion = useCallback(async (investmentId, patch) => {
    await updateInvestmentDoc(uid, investmentId, patch)
  }, [uid])

  const deleteInversion = useCallback(async (investmentId) => {
    await deleteInvestmentDoc(uid, investmentId)
  }, [uid])

  const createEventoPlanificado = useCallback(async (investmentId, payload) => {
    await createInvestmentPlannedEventDoc(uid, investmentId, payload)
  }, [uid])

  const updateEventoPlanificado = useCallback(async (investmentId, eventId, patch) => {
    await updateInvestmentPlannedEventDoc(uid, investmentId, eventId, patch)
  }, [uid])

  const deleteEventoPlanificado = useCallback(async (investmentId, eventId) => {
    await deleteInvestmentPlannedEventDoc(uid, investmentId, eventId)
  }, [uid])

  const createMovimiento = useCallback(async (investmentId, payload) => {
    await createInvestmentMovementDoc(uid, investmentId, payload)
  }, [uid])

  const updateMovimiento = useCallback(async (investmentId, movementId, patch) => {
    await updateInvestmentMovementDoc(uid, investmentId, movementId, patch)
  }, [uid])

  const deleteMovimiento = useCallback(async (investmentId, movementId) => {
    await deleteInvestmentMovementDoc(uid, investmentId, movementId)
  }, [uid])

  return {
    loading,
    items: state.items,
    metrics: state.metrics,
    createInversion,
    updateInversion,
    deleteInversion,
    createEventoPlanificado,
    updateEventoPlanificado,
    deleteEventoPlanificado,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
  }
}