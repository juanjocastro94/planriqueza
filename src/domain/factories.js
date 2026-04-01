import { EMPTY_PROFILE, EMPTY_SETTINGS, EMPTY_STATE_V2 } from './initialState'

export function createId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyState() {
  return {
    ...EMPTY_STATE_V2,
    profile: { ...EMPTY_PROFILE },
    settings: { ...EMPTY_SETTINGS },
    ingresos: { fuentes: [] },
    gastos: {
      fijos: [],
      variables: [],
      extraordinarios: [],
      suscripciones: [],
    },
    deudas: { items: [] },
    inversiones: { items: [] },
    activos: { items: [] },
    metas: { items: [] },
  }
}



export function createFixedExpense({
  nombre = '',
  categoria = 'otro',
  valorMensual = 0,
} = {}) {
  return {
    id: createId('gfix'),
    nombre,
    categoria,
    valorMensual,
    activo: true,
  }
}

export function createVariableExpense({
  nombre = '',
  categoria = 'otro',
  presupuestoMensual = 0,
} = {}) {
  return {
    id: createId('gvar'),
    nombre,
    categoria,
    presupuestoMensual,
    activo: true,
  }
}

export function createIncomeComponent({
  clase = 'earning',
  subtipo = 'otro',
  monto = 0,
  linkedEntityType = null,
  linkedEntityId = null,
  autoSuggested = false,
  nota = '',
} = {}) {
  return {
    id: createId('inc_cmp'),
    clase, // earning | deduction | allocation
    subtipo,
    monto,
    linkedEntityType,
    linkedEntityId,
    autoSuggested,
    nota,
  }
}

export function createIncomeRecord({
  tipoIngreso = 'otro',
  subtipoIngreso = '',
  periodo = '',
  fecha = '',
} = {}) {
  return {
    id: createId('inc_reg'),
    tipoIngreso,
    subtipoIngreso,
    periodo,
    fecha,

    estado: 'confirmado',

    // montos resumen
    montoPrincipal: 0,
    bruto: 0,
    neto: 0,

    // cruce principal opcional del registro
    linkedEntityType: null,
    linkedEntityId: null,

    // para formularios completos tipo nómina
    components: [],

    // metadatos de UX / trazabilidad
    origen: '',
    soporteNombre: '',
    nota: '',
  }
}

export function createIncomeSource({
  nombre = '',
  tipo = 'nomina',
  moneda = 'COP',
  periodicidad = 'mensual',
} = {}) {
  const requiresLinkedAsset = tipo === 'arriendo' || tipo === 'venta-activo'
  const requiresPayrollBreakdown = tipo === 'nomina'

  return {
    id: createId('inc'),
    nombre,
    tipo,
    activo: true,
    moneda,
    periodicidad,

    crecimientoEsperadoAnualPct: 0,
    cambiosRealesPorAno: {},

    // para cruces estructurales de la fuente
    linkedEntityType: requiresLinkedAsset ? 'asset' : null,
    linkedEntityId: null,

    configuracion: {
      formMode: requiresPayrollBreakdown ? 'payroll' : 'standard',
      usaDesprendible: requiresPayrollBreakdown,
      requiresLinkedAsset,
      requiresPayrollBreakdown,

      vacanciaPct: 0,
      administracionMensual: 0,

      // útil para dividendos / intereses / etc
      reinversionAutomatica: false,
    },

    registros: [],
  }
}

export function createExtraordinaryExpense({
  nombre = '',
  categoria = 'otro',
  valor = 0,
  frecuencia = 'anual',
  mesBase = 1,
} = {}) {
  return {
    id: createId('gext'),
    nombre,
    categoria,
    valor,
    frecuencia,
    mesBase,
    activo: true,
  }
}

export function createSubscription({
  nombre = '',
  categoria = 'otro',
  valorMensual = 0,
} = {}) {
  return {
    id: createId('sub'),
    nombre,
    categoria,
    valorMensual,
    activo: true,
  }
}

export function createDebtPlannedEvent({
  mesOffset = 1,
  monto = 0,
  nota = '',
} = {}) {
  return {
    id: createId('debt_plan'),
    mesOffset,
    monto,
    nota,
  }
}

export function createDebtMovement({
  periodo = '',
  cuotaPagada = 0,
  abonoCapital = 0,
  cargos = 0,
  nota = '',
} = {}) {
  return {
    id: createId('debt_mov'),
    periodo,
    cuotaPagada,
    abonoCapital,
    cargos,
    nota,
  }
}

export function createDebt({
  nombre = '',
  tipo = 'libre-destino',
  moneda = 'COP',
} = {}) {
  return {
    id: createId('debt'),
    nombre,
    tipo,
    activo: true,
    moneda,
    condiciones: {
      saldoActual: 0,
      montoOriginal: 0,
      fechaDesembolso: '',
      plazoMeses: 0,
      tasaTipo: 'ea',
      tasaValor: 0,
      cuotaManual: null,
      residualPct: 0,
      residualValor: 0,
      sistemaAmortizacion: 'frances',
      modoAbonoCapital: 'reducir-plazo',
      descontadoNomina: false,
    },
    costos: {
      seguroModo: 'separado',
      seguroVidaMensual: 0,
      seguroDesempleoMensual: 0,
      seguroHogarMensual: 0,
      seguroTodoRiesgoMensual: 0,
      otrosSegurosMensuales: 0,
      otrosCargosMensuales: 0,
    },
    plan: {
      abonoMensualCapital: 0,
      eventosPlanificados: [],
    },
    ejecucion: {
      movimientos: [],
    },
    visual: {
      color: '#5ca8ff',
    },
  }
}

export function createInvestmentPlannedEvent({
  mesOffset = 1,
  monto = 0,
  nota = '',
} = {}) {
  return {
    id: createId('inv_plan'),
    mesOffset,
    monto,
    nota,
  }
}

export function createInvestmentMovement({
  fecha = '',
  periodo = '',
  tipo = 'aporte',
  montoCOP = 0,
  montoUnidad = 0,
  tasaReferencia = 0,
  nota = '',
} = {}) {
  return {
    id: createId('inv_mov'),
    fecha,
    periodo,
    tipo,
    montoCOP,
    montoUnidad,
    tasaReferencia,
    nota,
  }
}

export function createInvestment({
  nombre = '',
  tipo = 'usd',
  monedaBase = 'USD',
} = {}) {
  return {
    id: createId('inv'),
    nombre,
    tipo,
    activo: true,
    monedaBase,
    configuracion: {
      rentabilidadEsperadaAnualPct: 0,
      trmReferencia: 0,
      fechaApertura: '',
      fechaVencimiento: '',
      tasaPactadaAnualPct: 0,
      ticker: '',
      plataforma: '',
    },
    plan: {
      aporteMensual: 0,
      eventosPlanificados: [],
    },
    ejecucion: {
      movimientos: [],
    },
  }
}

export function createAsset({
  nombre = '',
  tipo = 'otro',
  moneda = 'COP',
} = {}) {
  return {
    id: createId('asset'),
    nombre,
    tipo,
    activo: true,
    moneda,
    valorActual: 0,
    crecimientoEsperadoAnualPct: 0,
    notas: '',
  }
}

export function createGoal({
  nombre = '',
  tipo = 'otro',
  moneda = 'COP',
} = {}) {
  return {
    id: createId('goal'),
    nombre,
    tipo,
    valorObjetivo: 0,
    moneda,
    fechaObjetivo: '',
    activo: true,
    notas: '',
  }
}