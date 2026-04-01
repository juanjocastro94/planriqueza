import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useIngresos } from '../../hooks/useIngresos'
import { createIncomeSource, createIncomeRecord } from '../../domain/factories'
import { TIPOS_INGRESO, PERIODICIDADES } from '../../domain/types'
import { Card, SectionTitle, Btn, Field, EmptyState, MetricCard, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { Plus, Trash2, Wallet } from 'lucide-react'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getTipoLabel(tipo) {
  const map = {
    nomina: 'Nómina',
    arriendo: 'Arriendo',
    honorarios: 'Honorarios',
    comisiones: 'Comisiones',
    bono: 'Bono',
    dividendos: 'Dividendos',
    intereses: 'Intereses',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

function sortRecordsDesc(registros = []) {
  return [...registros].sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))
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
  } = useIngresos(uid)

  const [selectedId, setSelectedId] = useState(null)

  const [newSource, setNewSource] = useState({
    nombre: '',
    tipo: 'nomina',
    moneda: 'COP',
    periodicidad: 'mensual',
  })

  const [newRecord, setNewRecord] = useState({
    periodo: currentPeriod(),
    bruto: '',
    neto: '',
    salud: '',
    pension: '',
    solidaridad: '',
    retencion: '',
    otrosDescuentos: '',
    variable: '',
    nota: '',
  })

  const selected = useMemo(() => {
    return fuentes.find((f) => f.id === selectedId) || fuentes[0] || null
  }, [fuentes, selectedId])

  const latestRecord = useMemo(() => {
    if (!selected?.registros?.length) return null
    return sortRecordsDesc(selected.registros)[0]
  }, [selected])

  const latestNeto = useMemo(() => {
    if (!latestRecord) return 0
    const netoDirecto = Number(latestRecord.neto || 0)
    if (netoDirecto > 0) return netoDirecto

    return (
      Number(latestRecord.bruto || 0) +
      Number(latestRecord.variable || 0) -
      Number(latestRecord.salud || 0) -
      Number(latestRecord.pension || 0) -
      Number(latestRecord.solidaridad || 0) -
      Number(latestRecord.retencion || 0) -
      Number(latestRecord.otrosDescuentos || 0)
    )
  }, [latestRecord])

  const addFuente = async () => {
    if (!newSource.nombre.trim()) return
    const payload = createIncomeSource(newSource)
    await createFuente(payload)
    setNewSource({
      nombre: '',
      tipo: 'nomina',
      moneda: 'COP',
      periodicidad: 'mensual',
    })
  }

  const removeFuente = async (sourceId, nombre) => {
    const ok = window.confirm(`¿Eliminar la fuente "${nombre}" y todos sus registros?`)
    if (!ok) return
    await deleteFuente(sourceId)
    if (selectedId === sourceId) setSelectedId(null)
  }

  const addRegistro = async () => {
    if (!selected) return
    if (!newRecord.periodo) return

    const payload = createIncomeRecord(newRecord.periodo)
    await createRegistro(selected.id, {
      ...payload,
      periodo: newRecord.periodo,
      bruto: Number(newRecord.bruto || 0),
      neto: Number(newRecord.neto || 0),
      salud: Number(newRecord.salud || 0),
      pension: Number(newRecord.pension || 0),
      solidaridad: Number(newRecord.solidaridad || 0),
      retencion: Number(newRecord.retencion || 0),
      otrosDescuentos: Number(newRecord.otrosDescuentos || 0),
      variable: Number(newRecord.variable || 0),
      nota: newRecord.nota || '',
    })

    setNewRecord({
      periodo: currentPeriod(),
      bruto: '',
      neto: '',
      salud: '',
      pension: '',
      solidaridad: '',
      retencion: '',
      otrosDescuentos: '',
      variable: '',
      nota: '',
    })
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

  const updateField = async (sourceId, field, value) => {
    await updateFuente(sourceId, { [field]: value })
  }

  if (!uid) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Fuentes activas" value={String(metrics.totalFuentes || 0)} />
        <MetricCard label="Ingreso bruto mensual" value={fmtM(metrics.ingresoBrutoMensual || 0)} />
        <MetricCard label="Ingreso neto mensual" value={fmtM(metrics.ingresoNetoMensual || 0)} color="var(--accent)" />
        <MetricCard label="Fuente seleccionada" value={selected?.nombre || '—'} />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Nueva fuente de ingreso</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <Field label="Nombre">
            <input
              type="text"
              value={newSource.nombre}
              onChange={(e) => setNewSource((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Santander nómina, Arriendo apto 409"
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

          <Btn onClick={addFuente} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} />
            Agregar
          </Btn>
        </div>
      </Card>

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
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {fuentes.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${selected?.id === f.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected?.id === f.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                  color: selected?.id === f.id ? 'var(--accent)' : 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{f.nombre}</span>
                {!f.activo && <Badge color="default">inactiva</Badge>}
              </button>
            ))}
          </div>

          {selected && (
            <>
              <Card style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <SectionTitle>{selected.nombre}</SectionTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Btn onClick={() => toggleActivo(selected)}>{selected.activo ? 'Desactivar' : 'Activar'}</Btn>
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
                  <Field label="Nombre">
                    <input
                      type="text"
                      value={selected.nombre || ''}
                      onChange={(e) => updateField(selected.id, 'nombre', e.target.value)}
                    />
                  </Field>

                  <Field label="Tipo">
                    <select
                      value={selected.tipo || 'nomina'}
                      onChange={(e) => updateField(selected.id, 'tipo', e.target.value)}
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
                      value={selected.periodicidad || 'mensual'}
                      onChange={(e) => updateField(selected.id, 'periodicidad', e.target.value)}
                    >
                      {PERIODICIDADES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Moneda">
                    <input
                      type="text"
                      value={selected.moneda || 'COP'}
                      onChange={(e) => updateField(selected.id, 'moneda', e.target.value)}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                  <MetricCard label="Último período" value={latestRecord?.periodo || '—'} />
                  <MetricCard label="Último bruto" value={fmt(Number(latestRecord?.bruto || 0))} />
                  <MetricCard label="Último neto" value={fmt(latestNeto)} color="var(--accent)" />
                </div>
              </Card>

              <Card style={{ marginBottom: '1rem' }}>
                <SectionTitle>Nuevo registro mensual</SectionTitle>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <Field label="Período">
                    <input
                      type="month"
                      value={newRecord.periodo}
                      onChange={(e) => setNewRecord((p) => ({ ...p, periodo: e.target.value }))}
                    />
                  </Field>

                  <Field label="Bruto">
                    <input
                      type="number"
                      value={newRecord.bruto}
                      onChange={(e) => setNewRecord((p) => ({ ...p, bruto: e.target.value }))}
                    />
                  </Field>

                  <Field label="Neto directo">
                    <input
                      type="number"
                      value={newRecord.neto}
                      onChange={(e) => setNewRecord((p) => ({ ...p, neto: e.target.value }))}
                    />
                  </Field>

                  <Field label="Variable / bono">
                    <input
                      type="number"
                      value={newRecord.variable}
                      onChange={(e) => setNewRecord((p) => ({ ...p, variable: e.target.value }))}
                    />
                  </Field>

                  <Field label="Salud">
                    <input
                      type="number"
                      value={newRecord.salud}
                      onChange={(e) => setNewRecord((p) => ({ ...p, salud: e.target.value }))}
                    />
                  </Field>

                  <Field label="Pensión">
                    <input
                      type="number"
                      value={newRecord.pension}
                      onChange={(e) => setNewRecord((p) => ({ ...p, pension: e.target.value }))}
                    />
                  </Field>

                  <Field label="Solidaridad">
                    <input
                      type="number"
                      value={newRecord.solidaridad}
                      onChange={(e) => setNewRecord((p) => ({ ...p, solidaridad: e.target.value }))}
                    />
                  </Field>

                  <Field label="Retención">
                    <input
                      type="number"
                      value={newRecord.retencion}
                      onChange={(e) => setNewRecord((p) => ({ ...p, retencion: e.target.value }))}
                    />
                  </Field>

                  <Field label="Otros descuentos">
                    <input
                      type="number"
                      value={newRecord.otrosDescuentos}
                      onChange={(e) => setNewRecord((p) => ({ ...p, otrosDescuentos: e.target.value }))}
                    />
                  </Field>

                  <Field label="Nota">
                    <input
                      type="text"
                      value={newRecord.nota}
                      onChange={(e) => setNewRecord((p) => ({ ...p, nota: e.target.value }))}
                      placeholder="Desprendible abril, canon mayo, etc."
                    />
                  </Field>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <Btn onClick={addRegistro} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} />
                    Agregar registro
                  </Btn>
                </div>
              </Card>

              <Card>
                <SectionTitle>Histórico de registros</SectionTitle>

                {!selected.registros?.length ? (
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin registros todavía.</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 140px 140px 1fr auto', gap: 8, marginBottom: 6 }}>
                      {['Período', 'Bruto', 'Neto', 'Nota', ''].map((h, i) => (
                        <span key={i} style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {h}
                        </span>
                      ))}
                    </div>

                    {sortRecordsDesc(selected.registros).map((r) => {
                      const neto =
                        Number(r.neto || 0) > 0
                          ? Number(r.neto || 0)
                          : Number(r.bruto || 0) +
                            Number(r.variable || 0) -
                            Number(r.salud || 0) -
                            Number(r.pension || 0) -
                            Number(r.solidaridad || 0) -
                            Number(r.retencion || 0) -
                            Number(r.otrosDescuentos || 0)

                      return (
                        <div
                          key={r.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '110px 140px 140px 1fr auto',
                            gap: 8,
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.periodo || '—'}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(Number(r.bruto || 0))}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{fmt(neto)}</span>
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
    </div>
  )
}