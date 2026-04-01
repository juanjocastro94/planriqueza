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

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function safeNum(v) {
  return Number(v || 0)
}

function sortSources(sources = []) {
  return [...sources].sort((a, b) => {
    const aName = (a.nombre || '').toLowerCase()
    const bName = (b.nombre || '').toLowerCase()
    return aName.localeCompare(bName)
  })
}

function sortRecordsDesc(records = []) {
  return [...records].sort((a, b) => {
    const aKey = `${b.periodo || ''}_${b.fecha || ''}`
    const bKey = `${a.periodo || ''}_${a.fecha || ''}`
    return aKey.localeCompare(bKey)
  })
}

function latestRecord(source) {
  const registros = source?.registros || []
  if (!registros.length) return null

  return [...registros].sort((a, b) => {
    const aKey = `${a.periodo || ''}_${a.fecha || ''}`
    const bKey = `${b.periodo || ''}_${b.fecha || ''}`
    return bKey.localeCompare(aKey)
  })[0]
}

function sumComponentsByClass(components = [], clase) {
  return (components || [])
    .filter((c) => c?.clase === clase)
    .reduce((acc, c) => acc + safeNum(c.monto), 0)
}

function deriveRecordAmounts(record = {}) {
  const components = record?.components || []

  const totalEarnings = sumComponentsByClass(components, 'earning')
  const totalDeductions = sumComponentsByClass(components, 'deduction')
  const totalAllocations = sumComponentsByClass(components, 'allocation')

  const bruto =
    safeNum(record.bruto) > 0
      ? safeNum(record.bruto)
      : totalEarnings > 0
        ? totalEarnings
        : safeNum(record.montoPrincipal)

  const neto =
    safeNum(record.neto) > 0
      ? safeNum(record.neto)
      : totalEarnings > 0 || totalDeductions > 0 || totalAllocations > 0
        ? totalEarnings - totalDeductions - totalAllocations
        : safeNum(record.montoPrincipal)

  return {
    bruto,
    neto,
    totalEarnings,
    totalDeductions,
    totalAllocations,
  }
}

function isExtraordinaryIncomeType(tipo) {
  return [
    'prima',
    'bono',
    'cesantias',
    'intereses-cesantias',
    'devolucion-impuestos',
    'reintegro',
    'venta-activo',
  ].includes(tipo)
}

function deriveSource(source = {}) {
  const registros = sortRecordsDesc(source.registros || [])
  const lastRecord = latestRecord(source)
  const lastAmounts = lastRecord ? deriveRecordAmounts(lastRecord) : null

  return {
    ...source,
    registros,
    latestRecord: lastRecord,
    derived: {
      latestBruto: lastAmounts?.bruto || 0,
      latestNeto: lastAmounts?.neto || 0,
      latestDeductions: lastAmounts?.totalDeductions || 0,
      latestAllocations: lastAmounts?.totalAllocations || 0,
    },
  }
}

function deriveIngresosState(fuentes = [], selectedPeriod = currentPeriod()) {
  const normalizedSources = sortSources(fuentes).map(deriveSource)

  const latestRecords = normalizedSources
    .map((f) => f.latestRecord)
    .filter(Boolean)

  const currentPeriodRecords = normalizedSources.flatMap((f) =>
    (f.registros || [])
      .filter((r) => r?.periodo === selectedPeriod)
      .map((r) => ({
        ...r,
        sourceId: f.id,
        sourceName: f.nombre,
        sourceTipo: f.tipo,
      }))
  )

  const latestTotals = latestRecords.reduce(
    (acc, record) => {
      const amounts = deriveRecordAmounts(record)
      acc.ingresoBrutoMensual += amounts.bruto
      acc.ingresoNetoMensual += amounts.neto
      acc.totalDeduccionesMensual += amounts.totalDeductions
      acc.totalDestinacionesMensual += amounts.totalAllocations
      return acc
    },
    {
      ingresoBrutoMensual: 0,
      ingresoNetoMensual: 0,
      totalDeduccionesMensual: 0,
      totalDestinacionesMensual: 0,
    }
  )

  const periodTotals = currentPeriodRecords.reduce(
    (acc, record) => {
      const amounts = deriveRecordAmounts(record)
      acc.brutoPeriodo += amounts.bruto
      acc.netoPeriodo += amounts.neto
      acc.deduccionesPeriodo += amounts.totalDeductions
      acc.destinacionesPeriodo += amounts.totalAllocations

      if (isExtraordinaryIncomeType(record.tipoIngreso || record.sourceTipo)) {
        acc.extraordinariosPeriodo += amounts.neto
      }

      return acc
    },
    {
      brutoPeriodo: 0,
      netoPeriodo: 0,
      deduccionesPeriodo: 0,
      destinacionesPeriodo: 0,
      extraordinariosPeriodo: 0,
    }
  )

  return {
    fuentes: normalizedSources,
    recordsForPeriod: currentPeriodRecords,
    metrics: {
      totalFuentes: normalizedSources.length,

      // snapshot usando el último registro de cada fuente
      ingresoBrutoMensual: latestTotals.ingresoBrutoMensual,
      ingresoNetoMensual: latestTotals.ingresoNetoMensual,
      totalDeduccionesMensual: latestTotals.totalDeduccionesMensual,
      totalDestinacionesMensual: latestTotals.totalDestinacionesMensual,

      // lectura estricta del período elegido
      brutoPeriodo: periodTotals.brutoPeriodo,
      netoPeriodo: periodTotals.netoPeriodo,
      deduccionesPeriodo: periodTotals.deduccionesPeriodo,
      destinacionesPeriodo: periodTotals.destinacionesPeriodo,
      extraordinariosPeriodo: periodTotals.extraordinariosPeriodo,
    },
  }
}

export function useIngresos(uid, options = {}) {
  const { selectedPeriod = currentPeriod() } = options

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

  const state = useMemo(
    () => deriveIngresosState(fuentes, selectedPeriod),
    [fuentes, selectedPeriod]
  )

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
    recordsForPeriod: state.recordsForPeriod,
    metrics: state.metrics,
    createFuente,
    updateFuente,
    deleteFuente,
    createRegistro,
    updateRegistro,
    deleteRegistro,
  }
}