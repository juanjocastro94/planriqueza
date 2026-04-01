export const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(n))
}

export const fmtUSD = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n))
}

export const fmtM = (n) => {
  const m = Number(n || 0) / 1e6
  return `${m.toFixed(1)}M`
}

export const tasaMensual = (ea) => Math.pow(1 + Number(ea || 0) / 100, 1 / 12) - 1
export const tasaDesdeNMV = (nmv) => Number(nmv || 0) / 100

export function tasaEADesdeDeuda(deuda) {
  const tasaTipo = deuda?.tasaTipo || 'ea'
  const tasaValor = Number(deuda?.tasaValor || 0)

  if (tasaTipo === 'nmv') {
    return (Math.pow(1 + tasaValor / 100, 12) - 1) * 100
  }

  return tasaValor
}

export function tasaMensualDesdeDeuda(deuda) {
  return tasaMensual(tasaEADesdeDeuda(deuda))
}

export function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function currentPeriodLabel() {
  const d = new Date()
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}

export function calcularMesesPagadosDesdeFecha(fecha) {
  if (!fecha) return 0
  const hoy = new Date()
  const inicio = new Date(fecha)
  if (Number.isNaN(inicio.getTime())) return 0

  let meses = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth())
  if (hoy.getDate() < inicio.getDate()) meses -= 1

  return Math.max(0, meses)
}

export function calcularCuotaDeuda({
  saldo,
  tasaTipo,
  tasaValor,
  mesesRestantes,
  residualPct = 0,
  residualValor = 0,
}) {
  const pv = Number(saldo || 0)
  const n = Math.max(1, Number(mesesRestantes || 1))
  const r = tasaTipo === 'nmv' ? tasaDesdeNMV(tasaValor) : tasaMensual(tasaValor)

  const balloon =
    Number(residualValor || 0) > 0
      ? Number(residualValor || 0)
      : pv * (Number(residualPct || 0) / 100)

  if (!r) {
    return Math.max(0, Math.round((pv - balloon) / n))
  }

  const discount = Math.pow(1 + r, -n)
  const cuota = (pv - balloon * discount) * (r / (1 - discount))
  return Math.max(0, Math.round(cuota))
}

function avgAmount(items = []) {
  if (!items.length) return 0
  return Math.round(items.reduce((s, item) => s + Number(item.monto || 0), 0) / items.length)
}

function extraPlanForMonth(planificados = [], mes) {
  return planificados
    .filter((a) => Number(a.mesOffset || 0) === mes)
    .reduce((s, a) => s + Number(a.monto || 0), 0)
}

export function deudaPlanMensual(deuda) {
  const puntual = extraPlanForMonth(deuda.abonosPlanificados || [], 1)
  const pagoBase = Number(deuda.pagoTotalMensual || 0)
  return pagoBase + Number(deuda.abonoMensualPlan || 0) + puntual
}

export function sumByPeriod(items = [], period = currentPeriod()) {
  return items
    .filter((item) => item.periodo === period)
    .reduce((s, item) => s + Number(item.monto || 0), 0)
}

export function deudaRealMensual(deuda, period = currentPeriod()) {
  const cuota = sumByPeriod(deuda.pagosCuotaRealizados || [], period)
  const capital = sumByPeriod(deuda.abonosRealizados || [], period)
  const cargos = sumByPeriod(deuda.otrosCargosRealizados || [], period)
  return { cuota, capital, cargos, total: cuota + capital + cargos }
}

export function generarProyeccionDeuda(deuda, mode = 'base', horizonteMeses = 120) {
  const r = Number(deuda.tasaMensual || tasaMensualDesdeDeuda(deuda))
  const puntos = [{ mes: 0, saldo: Math.round(Number(deuda.saldo || 0)) }]

  let saldo = Number(deuda.saldo || 0)
  const mesesRestantes = Math.max(1, Number(deuda.mesesRestantes || deuda.plazoMeses || 1))
  const cuotaFinanciera = Number(deuda.cuotaFinanciera || deuda.cuotaCalculada || deuda.cuotaMensual || 0)
  const globo = Number(deuda.globo || deuda.residualValor || 0)
  const extraMensualPlan = Number(deuda.abonoMensualPlan || 0)
  const avgReal = avgAmount(deuda.abonosRealizados || [])
  const planificados = deuda.abonosPlanificados || []
  const horizonte = Math.max(1, Math.min(Number(horizonteMeses || 120), mesesRestantes + 24))

  for (let mes = 1; mes <= horizonte; mes++) {
    if (saldo <= 0) {
      puntos.push({ mes, saldo: 0 })
      continue
    }

    const interes = saldo * r
    const capitalBase = Math.max(0, cuotaFinanciera - interes)
    saldo = Math.max(globo > 0 ? globo : 0, saldo - capitalBase)

    if (mode === 'plan') {
      saldo = Math.max(0, saldo - extraMensualPlan)
      const extraPuntual = extraPlanForMonth(planificados, mes)
      saldo = Math.max(0, saldo - extraPuntual)
    }

    if (mode === 'real') {
      saldo = Math.max(0, saldo - avgReal)
    }

    if (mes === mesesRestantes && globo > 0) {
      saldo = Math.max(0, saldo - globo)
    }

    puntos.push({ mes, saldo: Math.round(saldo) })
  }

  return puntos
}

export function inversionPlanMensual(inversion) {
  const puntual = extraPlanForMonth(inversion.aportesPlanificados || [], 1)
  return Number(inversion.aporteMensualCOP || 0) + puntual
}

export function inversionRealMensual(inversion, period = currentPeriod()) {
  const deAportes = sumByPeriod(inversion.aportesRealizados || [], period)

  const deTransacciones = (inversion.transaccionesUSD || [])
    .filter((t) => t.fecha && t.fecha.slice(0, 7) === period)
    .reduce((s, t) => s + Number(t.cop || 0), 0)

  return deAportes + deTransacciones
}

export function proyectarUSDConLineas(inversion, horizonteAnos = 10) {
  const tm = Number(inversion.rendimientoAnual || 0) / 100 / 12
  const trm = Math.max(1, Number(inversion.trmActual || 1))

  const capitalTransacciones = (inversion.transaccionesUSD || []).reduce((s, t) => s + Number(t.usd || 0), 0)
  let base = capitalTransacciones
  let plan = capitalTransacciones
  let real = capitalTransacciones

  const aportePlanUSD = Number(inversion.aporteMensualCOP || 0) / trm
  const aporteRealUSD = avgAmount(inversion.aportesRealizados || []) / trm

  const puntos = [
    {
      ano: 0,
      Base: Math.round(base),
      Plan: Math.round(plan),
      Real: Math.round(real),
    },
  ]

  for (let m = 1; m <= horizonteAnos * 12; m++) {
    base = base * (1 + tm)
    plan = plan * (1 + tm) + aportePlanUSD
    real = real * (1 + tm) + aporteRealUSD

    const extraPlanUSD = extraPlanForMonth(inversion.aportesPlanificados || [], m) / trm
    plan += extraPlanUSD

    if (m % 12 === 0) {
      puntos.push({
        ano: m / 12,
        Base: Math.round(base),
        Plan: Math.round(plan),
        Real: Math.round(real),
      })
    }
  }

  return {
    puntos,
    saldoFinalPlan: Math.round(plan),
    saldoFinalReal: Math.round(real),
    saldoFinalBase: Math.round(base),
    avgRealCOP: avgAmount(inversion.aportesRealizados || []),
  }
}

export function amortizarHipoteca(
  saldoInicial,
  tasaEA,
  cuotaBase,
  abonoMensualFijo = 0,
  abonosExtraordinarios = {},
  residualValor = 0
) {
  const tm = tasaMensual(tasaEA)
  const cuotaTotal = Number(cuotaBase || 0) + Number(abonoMensualFijo || 0)
  const residual = Number(residualValor || 0)

  let saldo = Number(saldoInicial || 0)
  let meses = 0
  let interesesTotal = 0
  const tabla = []

  while (saldo > 0 && meses < 600) {
    meses++

    const interes = saldo * tm
    const amortCuota = Math.min(Math.max(0, cuotaTotal - interes), Math.max(0, saldo - residual))
    const extra = Number(abonosExtraordinarios[meses] || 0)

    interesesTotal += interes
    saldo = Math.max(residual, saldo - amortCuota - extra)

    if (saldo === residual && residual > 0) {
      saldo = 0
    }

    tabla.push({
      mes: meses,
      saldo: Math.round(saldo),
      interes: Math.round(interes),
      extra: Math.round(extra),
    })
  }

  return { meses, interesesTotal: Math.round(interesesTotal), tabla }
}

export function calcularCumplimiento(plan, real) {
  if (!plan) return real > 0 ? 100 : 0
  return Math.round((Number(real || 0) / Number(plan || 0)) * 100)
}

export function proyectarPatrimonioDesdeEstado(state, anos = 10) {
  const tmUsd = Number(state.inversion?.rendimientoAnual || 0) / 100 / 12
  const trmGrowth = 0.03 / 12

  const txs = state.inversion?.transaccionesUSD || []
  const capitalFromTx = txs.reduce((s, t) => s + Number(t.usd || 0), 0)

  let usdBase = capitalFromTx
  let usdPlan = capitalFromTx
  let trm = Number(state.inversion?.trmActual || 0)
  let aporteMensualPlan = Number(state.inversion?.aporteMensualCOP || 0)

  const crecAnual = Number(state.ingresos?.crecimientoBaseAnualPct || 0) / 100
  const crecMensual = Math.pow(1 + crecAnual, 1 / 12) - 1
  const activosIniciales = (state.activos || []).reduce((s, a) => s + Number(a.valorMercado || 0), 0)

  const deudaStates = (state.deudas || []).map((d) => ({
    ...d,
    saldoBase: Number(d.saldo || 0),
    saldoPlan: Number(d.saldo || 0),
  }))

  const puntos = []
  const hoy = new Date()
  const anioBase = hoy.getFullYear()

  const pushPoint = (m) => {
    const deudaBase = deudaStates.reduce((s, d) => s + Number(d.saldoBase || 0), 0)
    const deudaPlan = deudaStates.reduce((s, d) => s + Number(d.saldoPlan || 0), 0)
    const invBaseCop = usdBase * trm
    const invPlanCop = usdPlan * trm
    const activosAhora = activosIniciales * Math.pow(0.9, m / 12)

    puntos.push({
      label: String(anioBase + Math.floor(m / 12)),
      mes: m,
      Base: Math.round((invBaseCop - deudaBase) / 1e6),
      Plan: Math.round((invPlanCop - deudaPlan + activosAhora) / 1e6),
      Deuda: Math.round(deudaPlan / 1e6),
      Inversion: Math.round(invPlanCop / 1e6),
      Activos: Math.round(activosAhora / 1e6),
    })
  }

  pushPoint(0)

  for (let m = 1; m <= anos * 12; m++) {
    deudaStates.forEach((d) => {
      const r = Number(d.tasaMensual || tasaMensualDesdeDeuda(d))
      const globo = Number(d.globo || d.residualValor || 0)
      const cuotaFinanciera = Number(d.cuotaFinanciera || d.cuotaCalculada || 0)

      const interesBase = d.saldoBase * r
      const interesPlan = d.saldoPlan * r

      const capitalBase = Math.max(0, cuotaFinanciera - interesBase)
      const capitalPlan = Math.max(0, cuotaFinanciera - interesPlan)

      d.saldoBase = Math.max(globo > 0 ? globo : 0, d.saldoBase - capitalBase)
      d.saldoPlan = Math.max(globo > 0 ? globo : 0, d.saldoPlan - capitalPlan - Number(d.abonoMensualPlan || 0))

      const extraPlan = extraPlanForMonth(d.abonosPlanificados || [], m)
      d.saldoPlan = Math.max(0, d.saldoPlan - extraPlan)

      if (m === Number(d.mesesRestantes || d.plazoMeses || 0) && globo > 0) {
        d.saldoBase = Math.max(0, d.saldoBase - globo)
        d.saldoPlan = Math.max(0, d.saldoPlan - globo)
      }
    })

    aporteMensualPlan = aporteMensualPlan * (1 + crecMensual)

    usdBase = usdBase * (1 + tmUsd)
    usdPlan = usdPlan * (1 + tmUsd) + aporteMensualPlan / Math.max(1, trm)

    const extraPlanUsd = extraPlanForMonth(state.inversion?.aportesPlanificados || [], m) / Math.max(1, trm)
    usdPlan += extraPlanUsd

    trm *= 1 + trmGrowth

    if (m % 12 === 0) pushPoint(m)
  }

  return puntos
}

export function getMesAnio(mesesDesdeHoy) {
  const hoy = new Date()
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  d.setMonth(d.getMonth() + Math.round(Number(mesesDesdeHoy) || 0))
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}

export function proyectarPatrimonio(config) {
  const { saldo330, saldo288, capitalUSD, trmBase, aporteUSDmensual, abonoHipoteca } = config

  const tm330 = tasaMensual(11.6)
  const tm288 = tasaMensual(5)
  const tmUSD = 0.08 / 12
  const trmCrecimiento = 0.03 / 12

  let h = Number(saldo330 || 0)
  let d = Number(saldo288 || 0)
  let usd = Number(capitalUSD || 0)
  let trm = Number(trmBase || 0)

  const puntos = []

  const addPunto = (m) => {
    const deudaTotal = h + d
    const invCOP = usd * trm
    puntos.push({
      label: String(2026 + Math.floor(m / 12)),
      mes: m,
      deuda: Math.round(deudaTotal / 1e6),
      inversion: Math.round(invCOP / 1e6),
      patrimonio: Math.round((invCOP - deudaTotal) / 1e6),
    })
  }

  addPunto(0)

  for (let m = 1; m <= 240; m++) {
    if (h > 0) {
      const i = h * tm330
      h = Math.max(0, h - Math.max(0, 3700000 + Number(abonoHipoteca || 0) - i))
    }

    if (m <= 60 && d > 0) {
      const i = d * tm288
      d = Math.max(0, d - Math.max(0, 5440000 - i))
    } else {
      d = 0
    }

    const extraUSD = m > 60 ? 5440000 / Math.max(1, trm) : 0
    usd = usd * (1 + tmUSD) + Number(aporteUSDmensual || 0) / Math.max(1, trm) + extraUSD
    trm = trm * (1 + trmCrecimiento)

    if (m % 12 === 0) addPunto(m)
  }

  return puntos
}

export function proyectarSalario(salarioBrutoActual, crecimientoAnualPct, anos = 10) {
  const tasa = Number(crecimientoAnualPct || 0) / 100
  const hoy = new Date()
  const anioBase = hoy.getFullYear()

  return Array.from({ length: anos }, (_, i) => {
    const ano = anioBase + i + 1
    const bruto = Math.round(Number(salarioBrutoActual || 0) * Math.pow(1 + tasa, i + 1))
    const retencionExtra = Math.round((bruto - Number(salarioBrutoActual || 0)) * 0.28)
    return { ano, bruto, retencionExtra }
  })
}

export function simularCompra({
  precioTotal,
  financiado,
  plazoMeses,
  tasaEA,
  excedenteMensual,
  aporteUSDMensual,
}) {
  const precio = Number(precioTotal || 0)
  const exc = Number(excedenteMensual || 0)

  if (!financiado) {
    const mesesParaAhorrar = exc > 0 ? Math.ceil(precio / exc) : Infinity
    const perdidaInversionUSD = Number(aporteUSDMensual || 0) * mesesParaAhorrar

    return {
      modo: 'contado',
      cuotaMensual: 0,
      mesesImpacto: mesesParaAhorrar,
      totalPagado: precio,
      interesesPagados: 0,
      excedenteTrasCompra: exc - precio / Math.max(1, mesesParaAhorrar),
      perdidaInversionUSD,
      viable: exc > 0,
    }
  }

  const tm = tasaEA ? tasaMensual(tasaEA) : 0
  const n = Math.max(1, Number(plazoMeses || 12))
  const cuota =
    tm > 0
      ? Math.round((precio * tm) / (1 - Math.pow(1 + tm, -n)))
      : Math.round(precio / n)

  const totalPagado = cuota * n
  const intereses = totalPagado - precio
  const excedenteTras = exc - cuota
  const perdidaInversionUSD = Math.max(0, cuota) * n

  return {
    modo: 'financiado',
    cuotaMensual: cuota,
    mesesImpacto: n,
    totalPagado,
    interesesPagados: intereses,
    excedenteTrasCompra: excedenteTras,
    perdidaInversionUSD,
    viable: excedenteTras >= 0,
  }
}

export function detectarHitos(state) {
  const hitos = []
  const hoy = new Date()
  const anioHoy = hoy.getFullYear()

  state.deudas?.forEach((d) => {
    if (!d.mesesRestantes || Number(d.saldo || 0) <= 0) return

    const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + Number(d.mesesRestantes || 0), 1)
    const anioFin = fechaFin.getFullYear()
    const mesesRest = Number(d.mesesRestantes || 0)

    if (mesesRest <= 3) {
      hitos.push({
        tipo: 'deuda_proxima',
        urgencia: 'alta',
        icono: '🔴',
        titulo: `${d.nombre} se cancela en ${mesesRest} mes${mesesRest !== 1 ? 'es' : ''}`,
        detalle: `Se liberan ${fmt(d.pagoTotalMensual || d.cuotaFinanciera || 0)}/mes`,
        meses: mesesRest,
      })
    } else if (mesesRest <= 12) {
      hitos.push({
        tipo: 'deuda_proxima',
        urgencia: 'media',
        icono: '🟡',
        titulo: `${d.nombre} se cancela en ${anioFin}`,
        detalle: `Liberará ${fmt(d.pagoTotalMensual || d.cuotaFinanciera || 0)}/mes`,
        meses: mesesRest,
      })
    }

    if (Number(d.globo || 0) > 0 && mesesRest <= 24) {
      hitos.push({
        tipo: 'globo',
        urgencia: mesesRest <= 6 ? 'alta' : 'media',
        icono: '⚠',
        titulo: `Globo ${d.nombre}: ${fmt(d.globo)}`,
        detalle: `Vence en ${getMesAnio(mesesRest)} — ${mesesRest} meses`,
        meses: mesesRest,
      })
    }
  })

  const txs = state.inversion?.transaccionesUSD || []
  const capitalUSD = txs.reduce((s, t) => s + Number(t.usd || 0), 0)

  const milestones = [500, 1000, 5000, 10000, 25000, 50000]
  for (const m of milestones) {
    if (capitalUSD < m && capitalUSD > m * 0.8) {
      hitos.push({
        tipo: 'usd_milestone',
        urgencia: 'info',
        icono: '💵',
        titulo: `A ${Math.round(m - capitalUSD).toLocaleString()} USD de los $${m.toLocaleString()}`,
        detalle: `Capital actual: $${Math.round(capitalUSD).toLocaleString()} USD`,
        meses: 0,
      })
      break
    }
  }

  const meta = state.meta
  if (meta?.valorCOP > 0) {
    const puntos = proyectarPatrimonioDesdeEstado(state, 20)
    const anioMeta = meta.anio || anioHoy + 10
    const puntoMeta = puntos.find((p) => Number(p.label) >= anioMeta)

    if (puntoMeta) {
      const patrimonioEnMeta = Number(puntoMeta.Plan || 0) * 1e6
      const pct = Math.round((patrimonioEnMeta / Number(meta.valorCOP || 1)) * 100)

      if (pct < 80) {
        hitos.push({
          tipo: 'meta',
          urgencia: 'media',
          icono: '🎯',
          titulo: `Meta ${anioMeta}: vas en ${pct}% del camino`,
          detalle: `Proyección: ${fmtM(patrimonioEnMeta)} vs meta ${fmtM(meta.valorCOP)}`,
          meses: (anioMeta - anioHoy) * 12,
        })
      } else if (pct >= 100) {
        hitos.push({
          tipo: 'meta',
          urgencia: 'exito',
          icono: '✅',
          titulo: `Meta ${anioMeta} en camino`,
          detalle: `Proyección ${fmtM(patrimonioEnMeta)} supera la meta`,
          meses: (anioMeta - anioHoy) * 12,
        })
      }
    }
  }

  return hitos.sort((a, b) => Number(a.meses || 0) - Number(b.meses || 0))
}