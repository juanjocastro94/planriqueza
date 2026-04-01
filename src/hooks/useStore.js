import { useState, useEffect, useMemo } from 'react'
import { calcularCuotaDeuda, calcularMesesPagadosDesdeFecha } from '../utils/calc'

const CURRENT_YEAR = 2026

export const DEFAULT_STATE = {
  ingresos: {
    crecimientoBaseAnualPct: 6,
    cambiosRealesPorAno: { 2026: 0 },
    registros: [
      {
        id: 1,
        periodo: '2026-03',
        salarioBruto: 32000000,
        salud: 1123975,
        pension: 1123975,
        solidaridad: 337400,
        retencion: 2799000,
        otrosDescuentos: 0,
        bonos: 0,
        nota: 'Desprendible base',
      },
    ],
  },
  gastos: [
    { id: 1, nombre: 'Colegio Mariana', valor: 3100000, categoria: 'fijo' },
    { id: 2, nombre: 'Club', valor: 2500000, categoria: 'fijo' },
    { id: 3, nombre: 'Medicina prepagada', valor: 1300000, categoria: 'fijo' },
    { id: 4, nombre: 'Gastos hogar', valor: 3000000, categoria: 'fijo' },
  ],
  deudas: [
    {
      id: 1,
      nombre: 'Santander 288M',
      categoria: 'libre-destino',
      saldo: 288000000,
      tasaTipo: 'ea',
      tasaValor: 5,
      plazoMeses: 60,
      fechaDesembolso: '2025-03-01',
      residualPct: 0,
      descontadoNomina: true,
      color: '#ff5c5c',
      abonoMensualPlan: 0,
      abonosPlanificados: [],
      abonosRealizados: [],
      pagosCuotaRealizados: [],
      otrosCargosRealizados: [],
    },
    {
      id: 2,
      nombre: 'Hipoteca Av Villas',
      categoria: 'hipotecario',
      saldo: 330000000,
      tasaTipo: 'ea',
      tasaValor: 11.6,
      plazoMeses: 230,
      fechaDesembolso: '2025-03-01',
      residualPct: 0,
      descontadoNomina: true,
      color: '#5ca8ff',
      abonoMensualPlan: 2000000,
      abonosPlanificados: [],
      abonosRealizados: [],
      pagosCuotaRealizados: [],
      otrosCargosRealizados: [],
    },
    {
      id: 3,
      nombre: 'Chery Tiggo 7',
      categoria: 'vehiculo',
      saldo: 127000000,
      tasaTipo: 'nmv',
      tasaValor: 0.75,
      plazoMeses: 72,
      fechaDesembolso: '2025-03-01',
      residualPct: 40,
      descontadoNomina: true,
      color: '#ffc266',
      abonoMensualPlan: 0,
      abonosPlanificados: [],
      abonosRealizados: [],
      pagosCuotaRealizados: [],
      otrosCargosRealizados: [],
    },
  ],
  inversion: {
    trmActual: 4100,
    aporteMensualCOP: 2000000,
    rendimientoAnual: 8,
    aportesPlanificados: [],
    aportesRealizados: [],
    transaccionesUSD: [
      {
        id: 1,
        fecha: '2025-03-31',
        cop: 2000000,
        trm: 3690,
        usd: parseFloat((2000000 / 3690).toFixed(4)),
        nota: 'Primera compra — Global66',
      },
    ],
  },
  estrategia: {
    aporteUSDMensual: 2000000,
    colchonMensual: 500000,
  },
  abonos: [],
  abonosHipoteca: [],
  meta: null,
  gastosExtraordinarios: [
    { id: 1, nombre: 'SOAT Tesla Model Y', valor: 1200000, frecuencia: 'anual', mesBase: 3 },
    { id: 2, nombre: 'SOAT Chery Tiggo 7', valor: 900000, frecuencia: 'anual', mesBase: 6 },
    { id: 3, nombre: 'Impuesto predial', valor: 0, frecuencia: 'anual', mesBase: 4 },
  ],
  activos: [
    { id: 1, nombre: 'Tesla Model Y', tipo: 'vehiculo', valorMercado: 220000000, anioCompra: 2023 },
    { id: 2, nombre: 'Chery Tiggo 7 Pro E+', tipo: 'vehiculo', valorMercado: 127000000, anioCompra: 2025 },
  ],
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base
  if (typeof base !== 'object' || base === null) return incoming ?? base
  const result = { ...base }
  for (const key of Object.keys(incoming || {})) {
    const value = incoming[key]
    if (key in base) result[key] = deepMerge(base[key], value)
    else result[key] = value
  }
  return result
}

function migrateLegacyState(raw) {
  const merged = deepMerge(DEFAULT_STATE, raw || {})

  if ((!raw?.ingresos || !raw.ingresos.registros?.length) && raw?.salarioBruto) {
    merged.ingresos.registros = [
      {
        id: 1,
        periodo: `${CURRENT_YEAR}-03`,
        salarioBruto: raw.salarioBruto,
        salud: raw.deducciones?.find(d => /salud/i.test(d.nombre))?.valor || 0,
        pension: raw.deducciones?.find(d => /pensi/i.test(d.nombre))?.valor || 0,
        solidaridad: raw.deducciones?.find(d => /solid/i.test(d.nombre))?.valor || 0,
        retencion: raw.deducciones?.find(d => /retenci/i.test(d.nombre))?.valor || 0,
        otrosDescuentos: 0,
        bonos: 0,
        nota: 'Migrado desde versión anterior',
      },
    ]
  }

  merged.deudas = (merged.deudas || []).map((deuda) => {
    const legacy = raw?.deudas?.find(d => d.id === deuda.id) || deuda
    const tasaTipo = legacy.tasaTipo || (legacy.tasaNMV != null ? 'nmv' : 'ea')
    const tasaValor = legacy.tasaValor ?? (tasaTipo === 'nmv' ? legacy.tasaNMV : legacy.tasaEA) ?? 0
    const residualPct = legacy.residualPct ?? legacy.residual ?? 0
    return {
      ...deuda,
      ...legacy,
      categoria: legacy.categoria || deuda.categoria || 'libre-destino',
      tasaTipo,
      tasaValor,
      residualPct,
      fechaDesembolso: legacy.fechaDesembolso || deuda.fechaDesembolso || '2025-03-01',
      abonoMensualPlan: legacy.abonoMensualPlan ?? (legacy.id === 2 ? raw?.estrategia?.abonoHipotecaMensual || deuda.abonoMensualPlan || 0 : 0),
      abonosPlanificados: legacy.abonosPlanificados || [],
      abonosRealizados: legacy.abonosRealizados || [],
      pagosCuotaRealizados: legacy.pagosCuotaRealizados || [],
      otrosCargosRealizados: legacy.otrosCargosRealizados || [],
    }
  })

  // Migrate legacy capitalInicialUSD into transaccionesUSD
  const legacyTxs = merged.inversion?.transaccionesUSD || []
  const hasLegacyCapital = merged.inversion?.capitalInicialUSD && !legacyTxs.length
  const migratedTx = hasLegacyCapital ? [{
    id: 1,
    fecha: '2025-03-31',
    cop: Math.round(merged.inversion.capitalInicialUSD * (merged.inversion.trmCompra || 3690)),
    trm: merged.inversion.trmCompra || 3690,
    usd: merged.inversion.capitalInicialUSD,
    nota: 'Primera compra (migrada)',
  }] : legacyTxs

  merged.inversion = {
    ...DEFAULT_STATE.inversion,
    ...(merged.inversion || {}),
    aportesPlanificados: merged.inversion?.aportesPlanificados || [],
    aportesRealizados: merged.inversion?.aportesRealizados || [],
    transaccionesUSD: migratedTx,
  }
  // Remove legacy fields
  delete merged.inversion.capitalInicialUSD
  delete merged.inversion.trmCompra

  if (!merged.abonosHipoteca) merged.abonosHipoteca = []
  if (!merged.activos) merged.activos = DEFAULT_STATE.activos
  if (merged.meta === undefined) merged.meta = null
  if (!merged.gastosExtraordinarios) merged.gastosExtraordinarios = []

  return merged
}

function sortPeriodDesc(a, b) {
  return (b.periodo || '').localeCompare(a.periodo || '')
}

function deriveState(raw) {
  const canonical = migrateLegacyState(raw)
  const latestIngreso = [...(canonical.ingresos.registros || [])].sort(sortPeriodDesc)[0] || DEFAULT_STATE.ingresos.registros[0]

  const deudas = canonical.deudas.map(deuda => {
    const mesesPagados = calcularMesesPagadosDesdeFecha(deuda.fechaDesembolso)
    const mesesRestantes = Math.max(1, (deuda.plazoMeses || 1) - mesesPagados)
    const cuotaMensual = calcularCuotaDeuda({
      saldo: deuda.saldo,
      tasaTipo: deuda.tasaTipo,
      tasaValor: deuda.tasaValor,
      mesesRestantes,
      residualPct: deuda.residualPct || 0,
    })
    return {
      ...deuda,
      mesesPagados,
      mesesRestantes,
      cuotaMensual,
      tasaEA: deuda.tasaTipo === 'ea' ? deuda.tasaValor : null,
      tasaNMV: deuda.tasaTipo === 'nmv' ? deuda.tasaValor : null,
      residual: deuda.residualPct,
      globo: Math.round((deuda.saldo || 0) * ((deuda.residualPct || 0) / 100)),
      globoMes: deuda.plazoMeses,
    }
  })

  const deduccionesBase = [
    { id: 'salud', nombre: 'Salud empleado', valor: Number(latestIngreso.salud || 0), origen: 'ingresos' },
    { id: 'pension', nombre: 'Pensión empleado', valor: Number(latestIngreso.pension || 0), origen: 'ingresos' },
    { id: 'solidaridad', nombre: 'Fondo solidaridad', valor: Number(latestIngreso.solidaridad || 0), origen: 'ingresos' },
    { id: 'retencion', nombre: 'Retención en la fuente', valor: Number(latestIngreso.retencion || 0), origen: 'ingresos' },
  ]

  if (latestIngreso.otrosDescuentos) {
    deduccionesBase.push({ id: 'otros', nombre: 'Otros descuentos desprendible', valor: Number(latestIngreso.otrosDescuentos || 0), origen: 'ingresos' })
  }

  const deduccionesDeuda = deudas
    .filter(d => d.descontadoNomina)
    .map(d => ({ id: `deuda-${d.id}`, nombre: d.nombre, valor: d.cuotaMensual, origen: 'deuda', deudaId: d.id }))

  const deducciones = [...deduccionesBase, ...deduccionesDeuda]
  const salarioBruto = Number(latestIngreso.salarioBruto || 0)

  const estrategia = {
    ...canonical.estrategia,
    aporteUSDMensual: canonical.inversion.aporteMensualCOP,
    abonoHipotecaMensual: deudas.find(d => d.categoria === 'hipotecario')?.abonoMensualPlan || 0,
  }

  // Derive capital USD real desde transacciones
  const transaccionesUSD = canonical.inversion?.transaccionesUSD || []
  const capitalRealUSD = transaccionesUSD.reduce((s, t) => s + Number(t.usd || 0), 0)
  const capitalRealCOP = transaccionesUSD.reduce((s, t) => s + Number(t.cop || 0), 0)
  const trmPromedioPonderado = capitalRealUSD > 0 ? capitalRealCOP / capitalRealUSD : canonical.inversion.trmActual

  return {
    ...canonical,
    latestIngreso,
    salarioBruto,
    deducciones,
    deudas,
    estrategia,
    capitalRealUSD,
    capitalRealCOP,
    trmPromedioPonderado,
  }
}

export function useLocalStorage(key, defaultValue) {
  const [rawState, setRawState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) return migrateLegacyState(JSON.parse(stored))
      return defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(rawState))
    } catch {}
  }, [key, rawState])

  const state = useMemo(() => deriveState(rawState), [rawState])

  const setState = (updater) => {
    setRawState(prev => {
      const base = migrateLegacyState(prev)
      const next = typeof updater === 'function' ? updater(base) : updater
      return migrateLegacyState(next)
    })
  }

  return [state, setState]
}
