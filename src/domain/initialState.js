export const EMPTY_PROFILE = {
  currency: 'COP',
  country: 'CO',
  planningStartPeriod: '',
}

export const EMPTY_SETTINGS = {
  defaultProjectionYears: 10,
  emergencyFundMonthsTarget: 6,
}

export const EMPTY_STATE_V2 = {
  schemaVersion: 2,
  profile: EMPTY_PROFILE,
  ingresos: {
    fuentes: [],
  },
  gastos: {
    fijos: [],
    variables: [],
    extraordinarios: [],
    suscripciones: [],
  },
  deudas: {
    items: [],
  },
  inversiones: {
    items: [],
  },
  activos: {
    items: [],
  },
  metas: {
    items: [],
  },
  settings: EMPTY_SETTINGS,
}