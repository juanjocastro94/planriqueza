import { useState, useEffect, useMemo } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { calcularCuotaDeuda, calcularMesesPagadosDesdeFecha } from '../utils/calc'

export const EMPTY_STATE = {
  schemaVersion: 1,
  ingresos: {
    crecimientoBaseAnualPct: 0,
    cambiosRealesPorAno: {},
    registros: [],
  },
  gastos: [],
  suscripciones: [],
  deudas: [],
  inversion: {
    trmActual: 0,
    aporteMensualCOP: 0,
    rendimientoAnual: 0,
    aportesPlanificados: [],
    aportesRealizados: [],
    transaccionesUSD: [],
  },
  estrategia: {
    aporteUSDMensual: 0,
    colchonMensual: 0,
  },
  activos: [],
  gastosExtraordinarios: [],
}

const EMPTY_DEBT = {
  id: null,
  nombre: '',
  categoria: 'libre-destino',
  saldo: 0,
  montoOriginal: 0,
  tasaTipo: 'ea',
  tasaValor: 0,
  plazoMeses: 0,
  fechaDesembolso: '',
  residualPct: 0,
  residualValor: 0,
  cuotaManual: null,
  descontadoNomina: false,
  color: '#a78bfa',
  modoAbonoCapital: 'reducir-plazo',
  seguro: {
    modo: 'separado',
    vida: 0,
    desempleo: 0,
    hogar: 0,
    todoRiesgo: 0,
    otro: 0,
  },
  otrosCargosMensuales: 0,
  abonoMensualPlan: 0,
  abonosPlanificados: [],
  abonosRealizados: [],
  pagosCuotaRealizados: [],
  otrosCargosRealizados: [],
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base
  if (typeof base !== 'object' || base === null) return incoming ?? base

  const result = { ...base }
  const source = incoming || {}

  for (const key of Object.keys(source)) {
    result[key] = deepMerge(base[key], source[key])
  }

  return result
}

function tasaEAFromDebt(deuda) {
  const tasaTipo = deuda?.tasaTipo || 'ea'
  const tasaValor = Number(deuda?.tasaValor || 0)

  if (tasaTipo === 'nmv') {
    return (Math.pow(1 + tasaValor / 100, 12) - 1) * 100
  }

  return tasaValor
}

function tasaMensualFromEA(tasaEA) {
  return Math.pow(1 + Number(tasaEA || 0) / 100, 1 / 12) - 1
}

function migrateState(raw) {
  const merged = deepMerge(EMPTY_STATE, raw || {})

  return {
    ...merged,
    schemaVersion: 1,
    deudas: (merged.deudas || []).map((deuda) => ({
      ...deepMerge(EMPTY_DEBT, deuda),
      seguro: deepMerge(EMPTY_DEBT.seguro, deuda.seguro || {}),
    })),
  }
}

function deriveState(raw) {
  const canonical = migrateState(raw)

  const latestIngreso =
    [...(canonical.ingresos.registros || [])].sort((a, b) => b.periodo.localeCompare(a.periodo))[0] || null

  const deudas = (canonical.deudas || []).map((deuda) => {
    const mesesPagados = calcularMesesPagadosDesdeFecha(deuda.fechaDesembolso)
    const mesesRestantes = Math.max(1, Number(deuda.plazoMeses || 1) - mesesPagados)
    const tasaEA = tasaEAFromDebt(deuda)
    const tasaMensual = tasaMensualFromEA(tasaEA)

    const residualValor =
      Number(deuda.residualValor || 0) > 0
        ? Number(deuda.residualValor || 0)
        : Math.round(Number(deuda.montoOriginal || deuda.saldo || 0) * (Number(deuda.residualPct || 0) / 100))

    const cuotaCalculada = calcularCuotaDeuda({
      saldo: Number(deuda.saldo || 0),
      tasaTipo: deuda.tasaTipo,
      tasaValor: Number(deuda.tasaValor || 0),
      mesesRestantes,
      residualPct: 0,
      residualValor,
    })

    const cuotaFinanciera =
      Number(deuda.cuotaManual || 0) > 0 ? Number(deuda.cuotaManual || 0) : cuotaCalculada

    const segurosMensuales =
      Number(deuda.seguro?.vida || 0) +
      Number(deuda.seguro?.desempleo || 0) +
      Number(deuda.seguro?.hogar || 0) +
      Number(deuda.seguro?.todoRiesgo || 0) +
      Number(deuda.seguro?.otro || 0)

    const pagoTotalMensual = cuotaFinanciera + segurosMensuales + Number(deuda.otrosCargosMensuales || 0)

    return {
      ...deuda,
      mesesPagados,
      mesesRestantes,
      tasaEA,
      tasaMensual,
      cuotaCalculada,
      cuotaFinanciera,
      segurosMensuales,
      pagoTotalMensual,
      globo: residualValor,
      residualValor,
    }
  })

  const totalSuscripciones = (canonical.suscripciones || []).reduce((s, g) => s + Number(g.valor || 0), 0)
  const totalGastosFijos = (canonical.gastos || []).reduce((s, g) => s + Number(g.valor || 0), 0)

  const deduccionesBase = latestIngreso
    ? [
        { id: 'salud', nombre: 'Salud', valor: Number(latestIngreso.salud || 0) },
        { id: 'pension', nombre: 'Pensión', valor: Number(latestIngreso.pension || 0) },
        { id: 'solidaridad', nombre: 'Solidaridad', valor: Number(latestIngreso.solidaridad || 0) },
        { id: 'retencion', nombre: 'Retención', valor: Number(latestIngreso.retencion || 0) },
        { id: 'otros-descuentos', nombre: 'Otros descuentos', valor: Number(latestIngreso.otrosDescuentos || 0) },
      ]
    : []

  const deduccionesDeuda = deudas
    .filter((d) => d.descontadoNomina)
    .map((d) => ({
      id: `deuda-${d.id}`,
      nombre: d.nombre,
      valor: d.pagoTotalMensual,
    }))

  const transaccionesUSD = canonical.inversion?.transaccionesUSD || []
  const capitalRealUSD = transaccionesUSD.reduce((s, t) => s + Number(t.usd || 0), 0)

  const salarioNetoEstimado = latestIngreso
    ? Number(latestIngreso.salarioBruto || 0) +
      Number(latestIngreso.bonos || 0) -
      Number(latestIngreso.salud || 0) -
      Number(latestIngreso.pension || 0) -
      Number(latestIngreso.solidaridad || 0) -
      Number(latestIngreso.retencion || 0) -
      Number(latestIngreso.otrosDescuentos || 0)
    : 0

  return {
    ...canonical,
    latestIngreso,
    deudas,
    totalSuscripciones,
    totalGastosFijos,
    deducciones: [...deduccionesBase, ...deduccionesDeuda].filter((d) => Number(d.valor || 0) > 0),
    capitalRealUSD,
    salarioNetoEstimado,
  }
}

export function useCompasStore(uid) {
  const [rawState, setRawState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setRawState(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const docRef = doc(db, 'plans', uid)

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        setRawState(migrateState(docSnap.data()))
      } else {
        const initialState = migrateState(EMPTY_STATE)
        await setDoc(docRef, {
          ...initialState,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        setRawState(initialState)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [uid])

  const state = useMemo(() => (rawState ? deriveState(rawState) : migrateState(EMPTY_STATE)), [rawState])

  const setState = async (updater) => {
    if (!uid) return

    const base = rawState || EMPTY_STATE
    const next = typeof updater === 'function' ? updater(base) : updater
    const migrated = migrateState(next)

    await setDoc(
      doc(db, 'plans', uid),
      {
        ...migrated,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }

  return [state, setState, loading]
}