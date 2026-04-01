import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  subscribeIncomeSources,
  createIncomeSourceDoc,
  updateIncomeSourceDoc,
  deleteIncomeSourceDoc,
  createIncomeRecordDoc,
  updateIncomeRecordDoc,
  deleteIncomeRecordDoc,
} from '../services/firestore/ingresos'

function sortSources(sources = []) {
  return [...sources].sort((a, b) => {
    const aName = (a.nombre || '').toLowerCase()
    const bName = (b.nombre || '').toLowerCase()
    return aName.localeCompare(bName)
  })
}

function latestRecord(source) {
  const registros = source?.registros || []
  if (!registros.length) return null
  return [...registros].sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))[0]
}

function deriveIngresosState(fuentes = []) {
  const latestRecords = fuentes
    .map((f) => latestRecord(f))
    .filter(Boolean)

  const ingresoBrutoMensual = latestRecords.reduce((s, r) => s + Number(r.bruto || 0), 0)
  const ingresoNetoMensual = latestRecords.reduce((s, r) => {
    const netoDirecto = Number(r.neto || 0)
    if (netoDirecto > 0) return s + netoDirecto

    return (
      s +
      Number(r.bruto || 0) +
      Number(r.variable || 0) -
      Number(r.salud || 0) -
      Number(r.pension || 0) -
      Number(r.solidaridad || 0) -
      Number(r.retencion || 0) -
      Number(r.otrosDescuentos || 0)
    )
  }, 0)

  return {
    fuentes: sortSources(fuentes),
    metrics: {
      totalFuentes: fuentes.length,
      ingresoBrutoMensual,
      ingresoNetoMensual,
    },
  }
}

export function useIngresos(uid) {
  const [fuentes, setFuentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setFuentes([])
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeIncomeSources(uid, (nextSources) => {
      setFuentes(nextSources || [])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [uid])

  const state = useMemo(() => deriveIngresosState(fuentes), [fuentes])

  const createFuente = useCallback(
    async (payload) => {
      await createIncomeSourceDoc(uid, payload)
    },
    [uid]
  )

  const updateFuente = useCallback(
    async (sourceId, patch) => {
      await updateIncomeSourceDoc(uid, sourceId, patch)
    },
    [uid]
  )

  const deleteFuente = useCallback(
    async (sourceId) => {
      await deleteIncomeSourceDoc(uid, sourceId)
    },
    [uid]
  )

  const createRegistro = useCallback(
    async (sourceId, payload) => {
      await createIncomeRecordDoc(uid, sourceId, payload)
    },
    [uid]
  )

  const updateRegistro = useCallback(
    async (sourceId, recordId, patch) => {
      await updateIncomeRecordDoc(uid, sourceId, recordId, patch)
    },
    [uid]
  )

  const deleteRegistro = useCallback(
    async (sourceId, recordId) => {
      await deleteIncomeRecordDoc(uid, sourceId, recordId)
    },
    [uid]
  )

  return {
    loading,
    fuentes: state.fuentes,
    metrics: state.metrics,
    createFuente,
    updateFuente,
    deleteFuente,
    createRegistro,
    updateRegistro,
    deleteRegistro,
  }
}