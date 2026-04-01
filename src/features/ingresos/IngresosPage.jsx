import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useIngresos } from '../../hooks/useIngresos'
import { useActivos } from '../../hooks/useActivos'
import { useDeudas } from '../../hooks/useDeudas'
import {
  createIncomeSource,
  createIncomeRecord,
  createIncomeComponent,
} from '../../domain/factories'
import {
  TIPOS_INGRESO,
  PERIODICIDADES,
} from '../../domain/types'
import {
  Card,
  SectionTitle,
  Btn,
  Field,
  EmptyState,
  MetricCard,
  Badge,
} from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import {
  Plus,
  Trash2,
  Wallet,
  Receipt,
  Landmark,
  Building2,
  BadgeDollarSign,
} from 'lucide-react'
import Modal from '../../components/Modal'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function getTipoLabel(tipo) {
  const map = {
    nomina: 'Nómina',
    prima: 'Prima',
    bono: 'Bono',
    cesantias: 'Cesantías',
    'intereses-cesantias': 'Intereses de cesantías',
    arriendo: 'Arriendo',
    honorarios: 'Honorarios',
    comisiones: 'Comisiones',
    dividendos: 'Dividendos',
    intereses: 'Intereses',
    rendimientos: 'Rendimientos',
    'devolucion-impuestos': 'Devolución de impuestos',
    reintegro: 'Reintegro',
    'venta-activo': 'Venta de activo',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

function sortRecordsDesc(registros = []) {
  return [...registros].sort((a, b) => {
    const aKey = `${a.periodo || ''}_${a.fecha || ''}`
    const bKey = `${b.periodo || ''}_${b.fecha || ''}`
    return bKey.localeCompare(aKey)
  })
}

function sumComponents(components = [], clase) {
  return (components || [])
    .filter((c) => c?.clase === clase)
    .reduce((acc, c) => acc + Number(c.monto || 0), 0)
}

function deriveRecordAmounts(record = {}) {
  const components = record?.components || []

  const totalEarnings = sumComponents(components, 'earning')
  const totalDeductions = sumComponents(components, 'deduction')
  const totalAllocations = sumComponents(components, 'allocation')

  const bruto =
    Number(record.bruto || 0) > 0
      ? Number(record.bruto || 0)
      : totalEarnings > 0
        ? totalEarnings
        : Number(record.montoPrincipal || 0)

  const neto =
    Number(record.neto || 0) > 0
      ? Number(record.neto || 0)
      : totalEarnings > 0 || totalDeductions > 0 || totalAllocations > 0
        ? totalEarnings - totalDeductions - totalAllocations
        : Number(record.montoPrincipal || 0)

  return {
    bruto,
    neto,
    totalEarnings,
    totalDeductions,
    totalAllocations,
  }
}

function buildEmptySource() {
  return {
    nombre: '',
    tipo: 'nomina',
    moneda: 'COP',
    periodicidad: 'mensual',
  }
}

function buildEmptyRecord(tipo = 'nomina') {
  return {
    tipoIngreso: tipo,
    subtipoIngreso: '',
    periodo: currentPeriod(),
    fecha: todayIso(),
    montoPrincipal: '',
    bruto: '',
    neto: '',
    nota: '',
    linkedEntityId: '',
    payrollDebtLinks: [],

    payroll: {
      salarioBase: '',
      auxilioTransporte: '',
      horasExtra: '',
      recargos: '',
      comision: '',
      bonificacion: '',
      viaticos: '',
      vacaciones: '',
      otroDevengado: '',

      salud: '',
      pension: '',
      solidaridad: '',
      retencion: '',
      libranza: '',
      embargo: '',
      descuentoEmpresa: '',
      otroDescuento: '',

      afc: '',
      fpv: '',
      abonoHipoteca: '',
      aporteInversion: '',
      ahorroMeta: '',
      cajaReserva: '',
      otroDestino: '',
    },

    rental: {
      canon: '',
      administracion: '',
      otrosCostos: '',
    },
  }
}

function FuenteCard({ item, selected, onSelect, onRegister }) {
  return (
    <Card
      style={{
        padding: '1rem',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'var(--accent-dim2)' : 'var(--bg-2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div
          onClick={() => onSelect(item.id)}
          style={{ cursor: 'pointer', flex: 1 }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{item.nombre || 'Sin nombre'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            {getTipoLabel(item.tipo)} · {item.periodicidad || '—'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {!item.activo && <Badge color="default">inactiva</Badge>}
          {!!item.derived?.latestNeto && <Badge color="green">{fmt(item.derived.latestNeto)}</Badge>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <MetricCard label="Último neto" value={fmt(item.derived?.latestNeto || 0)} small />
        <MetricCard label="Moneda" value={item.moneda || 'COP'} small />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => onSelect(item.id)} variant={selected ? 'accent' : 'subtle'}>
          Ver detalle
        </Btn>
        <Btn onClick={() => onRegister(item)} variant="ghost">
          Registrar ingreso
        </Btn>
      </div>
    </Card>
  )
}

function SimpleIncomeForm({ record, setRecord }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      <Field label="Período">
        <input
          type="month"
          value={record.periodo}
          onChange={(e) => setRecord((p) => ({ ...p, periodo: e.target.value }))}
        />
      </Field>

      <Field label="Fecha">
        <input
          type="date"
          value={record.fecha}
          onChange={(e) => setRecord((p) => ({ ...p, fecha: e.target.value }))}
        />
      </Field>

      <Field label="Monto principal">
        <input
          type="number"
          value={record.montoPrincipal}
          onChange={(e) => setRecord((p) => ({ ...p, montoPrincipal: e.target.value }))}
        />
      </Field>

      <Field label="Neto opcional">
        <input
          type="number"
          value={record.neto}
          onChange={(e) => setRecord((p) => ({ ...p, neto: e.target.value }))}
        />
      </Field>

      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="Nota">
          <input
            type="text"
            value={record.nota}
            onChange={(e) => setRecord((p) => ({ ...p, nota: e.target.value }))}
            placeholder="Ej. bono trimestral, prima junio, dividendo abril"
          />
        </Field>
      </div>
    </div>
  )
}

function RentalIncomeForm({ record, setRecord, inmuebleOptions }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      <Field label="Inmueble vinculado">
        <select
          value={record.linkedEntityId}
          onChange={(e) => setRecord((p) => ({ ...p, linkedEntityId: e.target.value }))}
        >
          <option value="">Selecciona inmueble</option>
          {inmuebleOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Período">
        <input
          type="month"
          value={record.periodo}
          onChange={(e) => setRecord((p) => ({ ...p, periodo: e.target.value }))}
        />
      </Field>

      <Field label="Fecha">
        <input
          type="date"
          value={record.fecha}
          onChange={(e) => setRecord((p) => ({ ...p, fecha: e.target.value }))}
        />
      </Field>

      <Field label="Canon">
        <input
          type="number"
          value={record.rental.canon}
          onChange={(e) =>
            setRecord((p) => ({
              ...p,
              rental: { ...p.rental, canon: e.target.value },
            }))
          }
        />
      </Field>

      <Field label="Administración">
        <input
          type="number"
          value={record.rental.administracion}
          onChange={(e) =>
            setRecord((p) => ({
              ...p,
              rental: { ...p.rental, administracion: e.target.value },
            }))
          }
        />
      </Field>

      <Field label="Otros costos">
        <input
          type="number"
          value={record.rental.otrosCostos}
          onChange={(e) =>
            setRecord((p) => ({
              ...p,
              rental: { ...p.rental, otrosCostos: e.target.value },
            }))
          }
        />
      </Field>

      <Field label="Neto opcional">
        <input
          type="number"
          value={record.neto}
          onChange={(e) => setRecord((p) => ({ ...p, neto: e.target.value }))}
        />
      </Field>

      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="Nota">
          <input
            type="text"
            value={record.nota}
            onChange={(e) => setRecord((p) => ({ ...p, nota: e.target.value }))}
            placeholder="Ej. canon abril apto 409"
          />
        </Field>
      </div>
    </div>
  )
}

function PayrollIncomeForm({ record, setRecord, payrollLinkedDebts = [] }) {
  const p = record.payroll || {}

  const setPayroll = (field, value) =>
    setRecord((prev) => ({
      ...prev,
      payroll: {
        ...prev.payroll,
        [field]: value,
      },
    }))

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Card style={{ padding: '1rem' }}>
        <SectionTitle>Encabezado</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Field label="Período">
            <input
              type="month"
              value={record.periodo}
              onChange={(e) => setRecord((prev) => ({ ...prev, periodo: e.target.value }))}
            />
          </Field>

          <Field label="Fecha pago">
            <input
              type="date"
              value={record.fecha}
              onChange={(e) => setRecord((prev) => ({ ...prev, fecha: e.target.value }))}
            />
          </Field>

          <Field label="Bruto opcional">
            <input
              type="number"
              value={record.bruto}
              onChange={(e) => setRecord((prev) => ({ ...prev, bruto: e.target.value }))}
            />
          </Field>

          <Field label="Neto opcional">
            <input
              type="number"
              value={record.neto}
              onChange={(e) => setRecord((prev) => ({ ...prev, neto: e.target.value }))}
            />
          </Field>
        </div>
      </Card>

      <Card style={{ padding: '1rem' }}>
        <SectionTitle>Devengados</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Field label="Salario base"><input type="number" value={p.salarioBase} onChange={(e) => setPayroll('salarioBase', e.target.value)} /></Field>
          <Field label="Auxilio transporte"><input type="number" value={p.auxilioTransporte} onChange={(e) => setPayroll('auxilioTransporte', e.target.value)} /></Field>
          <Field label="Horas extra"><input type="number" value={p.horasExtra} onChange={(e) => setPayroll('horasExtra', e.target.value)} /></Field>
          <Field label="Recargos"><input type="number" value={p.recargos} onChange={(e) => setPayroll('recargos', e.target.value)} /></Field>
          <Field label="Comisión"><input type="number" value={p.comision} onChange={(e) => setPayroll('comision', e.target.value)} /></Field>
          <Field label="Bonificación"><input type="number" value={p.bonificacion} onChange={(e) => setPayroll('bonificacion', e.target.value)} /></Field>
          <Field label="Viáticos"><input type="number" value={p.viaticos} onChange={(e) => setPayroll('viaticos', e.target.value)} /></Field>
          <Field label="Vacaciones"><input type="number" value={p.vacaciones} onChange={(e) => setPayroll('vacaciones', e.target.value)} /></Field>
          <Field label="Otro devengado"><input type="number" value={p.otroDevengado} onChange={(e) => setPayroll('otroDevengado', e.target.value)} /></Field>
        </div>
      </Card>

      <Card style={{ padding: '1rem' }}>
        <SectionTitle>Deducciones</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Field label="Salud"><input type="number" value={p.salud} onChange={(e) => setPayroll('salud', e.target.value)} /></Field>
          <Field label="Pensión"><input type="number" value={p.pension} onChange={(e) => setPayroll('pension', e.target.value)} /></Field>
          <Field label="Solidaridad"><input type="number" value={p.solidaridad} onChange={(e) => setPayroll('solidaridad', e.target.value)} /></Field>
          <Field label="Retención"><input type="number" value={p.retencion} onChange={(e) => setPayroll('retencion', e.target.value)} /></Field>
          <Field label="Libranza"><input type="number" value={p.libranza} onChange={(e) => setPayroll('libranza', e.target.value)} /></Field>
          <Field label="Embargo"><input type="number" value={p.embargo} onChange={(e) => setPayroll('embargo', e.target.value)} /></Field>
          <Field label="Descuento empresa"><input type="number" value={p.descuentoEmpresa} onChange={(e) => setPayroll('descuentoEmpresa', e.target.value)} /></Field>
          <Field label="Otro descuento"><input type="number" value={p.otroDescuento} onChange={(e) => setPayroll('otroDescuento', e.target.value)} /></Field>
        </div>
      </Card>

      <Card style={{ padding: '1rem' }}>
        <SectionTitle>Destinaciones</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Field label="AFC"><input type="number" value={p.afc} onChange={(e) => setPayroll('afc', e.target.value)} /></Field>
          <Field label="FPV"><input type="number" value={p.fpv} onChange={(e) => setPayroll('fpv', e.target.value)} /></Field>
          <Field label="Abono hipoteca"><input type="number" value={p.abonoHipoteca} onChange={(e) => setPayroll('abonoHipoteca', e.target.value)} /></Field>
          <Field label="Aporte inversión"><input type="number" value={p.aporteInversion} onChange={(e) => setPayroll('aporteInversion', e.target.value)} /></Field>
          <Field label="Ahorro meta"><input type="number" value={p.ahorroMeta} onChange={(e) => setPayroll('ahorroMeta', e.target.value)} /></Field>
          <Field label="Caja reserva"><input type="number" value={p.cajaReserva} onChange={(e) => setPayroll('cajaReserva', e.target.value)} /></Field>
          <Field label="Otro destino"><input type="number" value={p.otroDestino} onChange={(e) => setPayroll('otroDestino', e.target.value)} /></Field>
        </div>
      </Card>

      <Card style={{ padding: '1rem' }}>
        <SectionTitle>Deudas descontadas por nómina</SectionTitle>

        {!payrollLinkedDebts.length ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            No hay deudas marcadas como descontadas por nómina.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {payrollLinkedDebts.map((item, index) => (
              <div
                key={item.debtId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr 160px',
                  gap: 10,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!item.enabled}
                  onChange={(e) =>
                    setRecord((prev) => {
                      const next = [...(prev.payrollDebtLinks || [])]
                      next[index] = { ...next[index], enabled: e.target.checked }
                      return { ...prev, payrollDebtLinks: next }
                    })
                  }
                />

                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{item.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    Sugerido desde pago mensual total de la deuda
                  </div>
                </div>

                <Field label="Monto">
                  <input
                    type="number"
                    value={item.monto}
                    onChange={(e) =>
                      setRecord((prev) => {
                        const next = [...(prev.payrollDebtLinks || [])]
                        next[index] = { ...next[index], monto: e.target.value }
                        return { ...prev, payrollDebtLinks: next }
                      })
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Field label="Nota">
        <input
          type="text"
          value={record.nota}
          onChange={(e) => setRecord((prev) => ({ ...prev, nota: e.target.value }))}
          placeholder="Ej. desprendible abril"
        />
      </Field>
    </div>
  )
}

export default function IngresosPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading,
    fuentes,
    metrics,
    createFuente,
    updateFuente,
    deleteFuente,
    createRegistro,
    deleteRegistro,
  } = useIngresos(uid, { selectedPeriod: currentPeriod() })

  const { items: activos } = useActivos(uid)
  const { items: deudas } = useDeudas(uid)

  const inmuebleOptions = useMemo(
    () => (activos || []).filter((a) => a.tipo === 'inmueble' && a.activo !== false),
    [activos]
  )

  const payrollLinkedDebts = useMemo(() => {
    return (deudas || []).filter((d) => d?.condiciones?.descontadoNomina)
  }, [deudas])

  const [selectedId, setSelectedId] = useState(null)
  const [newSource, setNewSource] = useState(buildEmptySource())
  const [newRecord, setNewRecord] = useState(buildEmptyRecord('nomina'))

  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)

  const selected = useMemo(
    () => fuentes.find((f) => f.id === selectedId) || fuentes[0] || null,
    [fuentes, selectedId]
  )

  React.useEffect(() => {
    const next = buildEmptyRecord(selected?.tipo || 'nomina')

    if ((selected?.tipo || 'nomina') === 'nomina') {
      next.payrollDebtLinks = payrollLinkedDebts.map((d) => ({
        debtId: d.id,
        nombre: d.nombre,
        enabled: true,
        monto: Math.round(Number(d.derived?.pagoTotalMensual || 0)),
      }))
    }

    setNewRecord(next)
  }, [selected?.id, selected?.tipo, payrollLinkedDebts])

  const latestRecord = useMemo(() => {
    if (!selected?.registros?.length) return null
    return sortRecordsDesc(selected.registros)[0]
  }, [selected])

  const latestAmounts = useMemo(() => deriveRecordAmounts(latestRecord || {}), [latestRecord])

  const openRecordModal = (fuente) => {
    setSelectedId(fuente.id)

    const next = buildEmptyRecord(fuente.tipo || 'nomina')

    if ((fuente.tipo || 'nomina') === 'nomina') {
      next.payrollDebtLinks = payrollLinkedDebts.map((d) => ({
        debtId: d.id,
        nombre: d.nombre,
        enabled: true,
        monto: Math.round(Number(d.derived?.pagoTotalMensual || 0)),
      }))
    }

    setNewRecord(next)
    setIsRecordModalOpen(true)
  }

  const closeRecordModal = () => {
    setIsRecordModalOpen(false)
    setNewRecord(buildEmptyRecord(selected?.tipo || 'nomina'))
  }

  const addFuente = async () => {
    if (!newSource.nombre.trim()) return

    if (newSource.tipo === 'arriendo' && !inmuebleOptions.length) {
      window.alert('Para crear una fuente de arriendo primero debes tener al menos un activo tipo inmueble.')
      return
    }

    const payload = createIncomeSource(newSource)
    await createFuente(payload)
    setNewSource(buildEmptySource())
    setIsSourceModalOpen(false)
  }

  const removeFuente = async (sourceId, nombre) => {
    const ok = window.confirm(`¿Eliminar la fuente "${nombre}" y todos sus registros?`)
    if (!ok) return
    await deleteFuente(sourceId)
    if (selectedId === sourceId) setSelectedId(null)
  }

  const buildPayloadForSelectedType = () => {
    const tipo = selected?.tipo || 'otro'

    if (tipo === 'nomina') {
      const p = newRecord.payroll || {}

      const debtLinkedComponents = (newRecord.payrollDebtLinks || [])
        .filter((d) => d.enabled && Number(d.monto || 0) > 0)
        .map((d) =>
          createIncomeComponent({
            clase: 'deduction',
            subtipo: 'libranza',
            monto: Number(d.monto || 0),
            linkedEntityType: 'debt',
            linkedEntityId: d.debtId,
            autoSuggested: true,
            nota: `Descuento nómina asociado a deuda: ${d.nombre}`,
          })
        )

      const components = [
        createIncomeComponent({ clase: 'earning', subtipo: 'salario-base', monto: Number(p.salarioBase || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'auxilio-transporte', monto: Number(p.auxilioTransporte || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'horas-extra', monto: Number(p.horasExtra || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'recargos', monto: Number(p.recargos || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'comision', monto: Number(p.comision || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'bonificacion', monto: Number(p.bonificacion || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'viaticos', monto: Number(p.viaticos || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'vacaciones', monto: Number(p.vacaciones || 0) }),
        createIncomeComponent({ clase: 'earning', subtipo: 'otro-devengado', monto: Number(p.otroDevengado || 0) }),

        createIncomeComponent({ clase: 'deduction', subtipo: 'salud', monto: Number(p.salud || 0) }),
        createIncomeComponent({ clase: 'deduction', subtipo: 'pension', monto: Number(p.pension || 0) }),
        createIncomeComponent({ clase: 'deduction', subtipo: 'solidaridad', monto: Number(p.solidaridad || 0) }),
        createIncomeComponent({ clase: 'deduction', subtipo: 'retencion', monto: Number(p.retencion || 0) }),
        createIncomeComponent({ clase: 'deduction', subtipo: 'libranza', monto: Number(p.libranza || 0) }),
        createIncomeComponent({ clase: 'deduction', subtipo: 'embargo', monto: Number(p.embargo || 0) }),
        createIncomeComponent({ clase: 'deduction', subtipo: 'descuento-empresa', monto: Number(p.descuentoEmpresa || 0) }),
        createIncomeComponent({ clase: 'deduction', subtipo: 'otro-descuento', monto: Number(p.otroDescuento || 0) }),

        createIncomeComponent({ clase: 'allocation', subtipo: 'afc', monto: Number(p.afc || 0) }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'fpv', monto: Number(p.fpv || 0) }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'abono-hipoteca', monto: Number(p.abonoHipoteca || 0) }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'aporte-inversion', monto: Number(p.aporteInversion || 0) }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'ahorro-meta', monto: Number(p.ahorroMeta || 0) }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'caja-reserva', monto: Number(p.cajaReserva || 0) }),
        createIncomeComponent({ clase: 'allocation', subtipo: 'otro-destino', monto: Number(p.otroDestino || 0) }),

        ...debtLinkedComponents,
      ].filter((c) => Number(c.monto || 0) > 0)

      const payload = createIncomeRecord({
        tipoIngreso: 'nomina',
        periodo: newRecord.periodo,
        fecha: newRecord.fecha,
      })

      return {
        ...payload,
        tipoIngreso: 'nomina',
        periodo: newRecord.periodo,
        fecha: newRecord.fecha,
        bruto: Number(newRecord.bruto || 0),
        neto: Number(newRecord.neto || 0),
        montoPrincipal: Number(newRecord.neto || 0),
        components,
        nota: newRecord.nota || '',
      }
    }

    if (tipo === 'arriendo') {
      if (!newRecord.linkedEntityId) {
        window.alert('Para registrar un arriendo debes vincularlo a un inmueble.')
        return null
      }

      const canon = Number(newRecord.rental.canon || 0)
      const administracion = Number(newRecord.rental.administracion || 0)
      const otrosCostos = Number(newRecord.rental.otrosCostos || 0)

      const payload = createIncomeRecord({
        tipoIngreso: 'arriendo',
        periodo: newRecord.periodo,
        fecha: newRecord.fecha,
      })

      return {
        ...payload,
        tipoIngreso: 'arriendo',
        periodo: newRecord.periodo,
        fecha: newRecord.fecha,
        linkedEntityType: 'asset',
        linkedEntityId: newRecord.linkedEntityId,
        montoPrincipal: canon,
        bruto: canon,
        neto: Number(newRecord.neto || 0) || canon - administracion - otrosCostos,
        components: [
          createIncomeComponent({
            clase: 'earning',
            subtipo: 'canon-arriendo',
            monto: canon,
            linkedEntityType: 'asset',
            linkedEntityId: newRecord.linkedEntityId,
          }),
          createIncomeComponent({
            clase: 'deduction',
            subtipo: 'administracion',
            monto: administracion,
            linkedEntityType: 'asset',
            linkedEntityId: newRecord.linkedEntityId,
          }),
          createIncomeComponent({
            clase: 'deduction',
            subtipo: 'otro-descuento',
            monto: otrosCostos,
            linkedEntityType: 'asset',
            linkedEntityId: newRecord.linkedEntityId,
          }),
        ].filter((c) => Number(c.monto || 0) > 0),
        nota: newRecord.nota || '',
      }
    }

    const payload = createIncomeRecord({
      tipoIngreso: tipo,
      periodo: newRecord.periodo,
      fecha: newRecord.fecha,
    })

    return {
      ...payload,
      tipoIngreso: tipo,
      periodo: newRecord.periodo,
      fecha: newRecord.fecha,
      montoPrincipal: Number(newRecord.montoPrincipal || 0),
      bruto: Number(newRecord.bruto || 0) || Number(newRecord.montoPrincipal || 0),
      neto: Number(newRecord.neto || 0) || Number(newRecord.montoPrincipal || 0),
      nota: newRecord.nota || '',
      linkedEntityId: newRecord.linkedEntityId || null,
    }
  }

  const addRegistro = async () => {
    if (!selected) return
    if (!newRecord.periodo) return

    const payload = buildPayloadForSelectedType()
    if (!payload) return

    await createRegistro(selected.id, payload)
    closeRecordModal()
  }

  const removeRegistro = async (recordId) => {
    if (!selected) return
    const ok = window.confirm('¿Eliminar este registro?')
    if (!ok) return
    await deleteRegistro(selected.id, recordId)
  }

  const toggleActivo = async (source) => {
    await updateFuente(source.id, { activo: !source.activo })
  }

  if (!uid) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Fuentes y registros de ingreso</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Registra nómina, arriendos, primas, bonos y otras entradas con mejor trazabilidad.
          </div>
        </div>

        <Btn onClick={() => setIsSourceModalOpen(true)} variant="accent" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} />
          Nueva fuente
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Fuentes activas" value={String(metrics.totalFuentes || 0)} />
        <MetricCard label="Ingreso bruto mensual" value={fmtM(metrics.ingresoBrutoMensual || 0)} />
        <MetricCard label="Ingreso neto mensual" value={fmtM(metrics.ingresoNetoMensual || 0)} color="var(--accent)" />
        <MetricCard label="Destinaciones mes" value={fmtM(metrics.totalDestinacionesMensual || 0)} color="var(--blue)" />
      </div>

      {loading ? (
        <Card>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando fuentes de ingreso…</div>
        </Card>
      ) : !fuentes.length ? (
        <EmptyState
          icon={Wallet}
          title="Sin fuentes de ingreso"
          subtitle="Crea una primera fuente para empezar a registrar ingresos reales."
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: '1rem' }}>
            {fuentes.map((f) => (
              <FuenteCard
                key={f.id}
                item={f}
                selected={selected?.id === f.id}
                onSelect={setSelectedId}
                onRegister={openRecordModal}
              />
            ))}
          </div>

          {selected && (
            <>
              <Card style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: 12, flexWrap: 'wrap' }}>
                  <SectionTitle>{selected.nombre}</SectionTitle>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Btn onClick={() => openRecordModal(selected)} variant="accent">
                      <Plus size={13} />
                      Registrar ingreso
                    </Btn>

                    <Btn onClick={() => toggleActivo(selected)}>
                      {selected.activo ? 'Desactivar' : 'Activar'}
                    </Btn>

                    <Btn
                      variant="danger"
                      onClick={() => removeFuente(selected.id, selected.nombre)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </Btn>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <MetricCard label="Tipo" value={getTipoLabel(selected.tipo)} />
                  <MetricCard label="Periodicidad" value={selected.periodicidad || '—'} />
                  <MetricCard label="Moneda" value={selected.moneda || 'COP'} />
                  <MetricCard label="Estado" value={selected.activo ? 'Activa' : 'Inactiva'} color={selected.activo ? 'var(--accent)' : 'var(--text-3)'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                  <MetricCard label="Último período" value={latestRecord?.periodo || '—'} />
                  <MetricCard label="Último bruto" value={fmt(latestAmounts.bruto || 0)} />
                  <MetricCard label="Último neto" value={fmt(latestAmounts.neto || 0)} color="var(--accent)" />
                  <MetricCard label="Deducciones + destinaciones" value={fmt((latestAmounts.totalDeductions || 0) + (latestAmounts.totalAllocations || 0))} />
                </div>
              </Card>

              <Card>
                <SectionTitle>Histórico de registros</SectionTitle>

                {!selected.registros?.length ? (
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin registros todavía.</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 140px 140px 120px 1fr auto', gap: 8, marginBottom: 6 }}>
                      {['Período', 'Bruto', 'Neto', 'Tipo', 'Nota', ''].map((h, i) => (
                        <span key={i} style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {h}
                        </span>
                      ))}
                    </div>

                    {sortRecordsDesc(selected.registros).map((r) => {
                      const amounts = deriveRecordAmounts(r)

                      return (
                        <div
                          key={r.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '110px 140px 140px 120px 1fr auto',
                            gap: 8,
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.periodo || '—'}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(amounts.bruto)}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{fmt(amounts.neto)}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{getTipoLabel(r.tipoIngreso || selected.tipo)}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.nota || '—'}</span>
                          <button
                            onClick={() => removeRegistro(r.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.5,
                            }}
                          >
                            <Trash2 size={13} color="var(--red)" />
                          </button>
                        </div>
                      )
                    })}
                  </>
                )}
              </Card>
            </>
          )}
        </>
      )}

      <Modal
        open={isSourceModalOpen}
        onClose={() => {
          setIsSourceModalOpen(false)
          setNewSource(buildEmptySource())
        }}
        title="Nueva fuente de ingreso"
        width={760}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 10 }}>
          <Field label="Nombre">
            <input
              type="text"
              value={newSource.nombre}
              onChange={(e) => setNewSource((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Nómina Santander, Arriendo apto 409, Dividendos broker"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={newSource.tipo}
              onChange={(e) => setNewSource((p) => ({ ...p, tipo: e.target.value }))}
            >
              {TIPOS_INGRESO.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Periodicidad">
            <select
              value={newSource.periodicidad}
              onChange={(e) => setNewSource((p) => ({ ...p, periodicidad: e.target.value }))}
            >
              {PERIODICIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {newSource.tipo === 'arriendo' && (
          <Card style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Building2 size={14} color="var(--blue)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Cruce obligatorio con inmueble</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Las fuentes de arriendo solo deberían crearse si ya existe al menos un activo tipo inmueble.
            </div>
          </Card>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn
            variant="subtle"
            onClick={() => {
              setIsSourceModalOpen(false)
              setNewSource(buildEmptySource())
            }}
          >
            Cancelar
          </Btn>
          <Btn variant="accent" onClick={addFuente}>
            <Plus size={13} />
            Crear fuente
          </Btn>
        </div>
      </Modal>

      <Modal
        open={isRecordModalOpen}
        onClose={closeRecordModal}
        title={selected?.tipo === 'nomina' ? `Registrar nómina · ${selected?.nombre || ''}` : `Registrar ingreso · ${selected?.nombre || ''}`}
        width={820}
        variant={selected?.tipo === 'nomina' ? 'drawer' : 'center'}
      >
        {!selected ? null : selected.tipo === 'nomina' ? (
          <PayrollIncomeForm
            record={newRecord}
            setRecord={setNewRecord}
            payrollLinkedDebts={newRecord.payrollDebtLinks || []}
          />
        ) : selected.tipo === 'arriendo' ? (
          <RentalIncomeForm
            record={newRecord}
            setRecord={setNewRecord}
            inmuebleOptions={inmuebleOptions}
          />
        ) : (
          <SimpleIncomeForm record={newRecord} setRecord={setNewRecord} />
        )}

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="subtle" onClick={closeRecordModal}>
            Cancelar
          </Btn>
          <Btn variant="accent" onClick={addRegistro}>
            <Receipt size={13} />
            Guardar registro
          </Btn>
        </div>
      </Modal>
    </div>
  )
}