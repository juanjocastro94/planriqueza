import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDeudas } from '../../hooks/useDeudas'
import { createDebt, createDebtMovement, createDebtPlannedEvent } from '../../domain/factories'
import { TIPOS_DEUDA, TIPOS_TASA, MODOS_ABONO_CAPITAL, MODOS_SEGURO } from '../../domain/types'
import { Card, SectionTitle, Btn, Field, EmptyState, MetricCard, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { Plus, Trash2, Landmark } from 'lucide-react'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getTipoLabel(tipo) {
  const map = {
    hipotecario: 'Hipotecario',
    vehiculo: 'Vehículo',
    'libre-destino': 'Libre destino',
    tarjeta: 'Tarjeta',
    educativo: 'Educativo',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

function sortMovementsDesc(items = []) {
  return [...items].sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))
}

function sortEventsAsc(items = []) {
  return [...items].sort((a, b) => Number(a.mesOffset || 0) - Number(b.mesOffset || 0))
}

export default function DeudasPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading,
    items,
    metrics,
    createDeuda,
    updateDeuda,
    deleteDeuda,
    createEventoPlanificado,
    deleteEventoPlanificado,
    createMovimiento,
    deleteMovimiento,
  } = useDeudas(uid)

  const [selectedId, setSelectedId] = useState(null)

  const [newDebt, setNewDebt] = useState({
    nombre: '',
    tipo: 'libre-destino',
    moneda: 'COP',
  })

  const [newPlannedEvent, setNewPlannedEvent] = useState({
    mesOffset: 1,
    monto: '',
    nota: '',
  })

  const [newMovement, setNewMovement] = useState({
    periodo: currentPeriod(),
    cuotaPagada: '',
    abonoCapital: '',
    cargos: '',
    nota: '',
  })

  const selected = useMemo(() => {
    return items.find((d) => d.id === selectedId) || items[0] || null
  }, [items, selectedId])

  const addDeuda = async () => {
    if (!newDebt.nombre.trim()) return
    const payload = createDebt(newDebt)
    await createDeuda(payload)
    setNewDebt({
      nombre: '',
      tipo: 'libre-destino',
      moneda: 'COP',
    })
  }

  const removeDeuda = async (debtId, nombre) => {
    const ok = window.confirm(`¿Eliminar la deuda "${nombre}" y todo su histórico?`)
    if (!ok) return
    await deleteDeuda(debtId)
    if (selectedId === debtId) setSelectedId(null)
  }

  const addPlannedEvent = async () => {
    if (!selected) return
    if (!newPlannedEvent.monto) return

    const payload = createDebtPlannedEvent({
      mesOffset: Number(newPlannedEvent.mesOffset || 1),
      monto: Number(newPlannedEvent.monto || 0),
      nota: newPlannedEvent.nota || '',
    })

    await createEventoPlanificado(selected.id, payload)

    setNewPlannedEvent({
      mesOffset: 1,
      monto: '',
      nota: '',
    })
  }

  const removePlannedEvent = async (eventId) => {
    if (!selected) return
    const ok = window.confirm('¿Eliminar este evento planificado?')
    if (!ok) return
    await deleteEventoPlanificado(selected.id, eventId)
  }

  const addMovement = async () => {
    if (!selected) return
    if (!newMovement.periodo) return

    const payload = createDebtMovement({
      periodo: newMovement.periodo,
      cuotaPagada: Number(newMovement.cuotaPagada || 0),
      abonoCapital: Number(newMovement.abonoCapital || 0),
      cargos: Number(newMovement.cargos || 0),
      nota: newMovement.nota || '',
    })

    await createMovimiento(selected.id, payload)

    setNewMovement({
      periodo: currentPeriod(),
      cuotaPagada: '',
      abonoCapital: '',
      cargos: '',
      nota: '',
    })
  }

  const removeMovement = async (movementId) => {
    if (!selected) return
    const ok = window.confirm('¿Eliminar este movimiento?')
    if (!ok) return
    await deleteMovimiento(selected.id, movementId)
  }

  const patchCondiciones = async (field, value) => {
    if (!selected) return
    await updateDeuda(selected.id, {
      condiciones: {
        ...(selected.condiciones || {}),
        [field]: value,
      },
    })
  }

  const patchCostos = async (field, value) => {
    if (!selected) return
    await updateDeuda(selected.id, {
      costos: {
        ...(selected.costos || {}),
        [field]: value,
      },
    })
  }

  const patchPlan = async (field, value) => {
    if (!selected) return
    await updateDeuda(selected.id, {
      plan: {
        ...(selected.plan || {}),
        [field]: value,
      },
    })
  }

  const patchVisual = async (field, value) => {
    if (!selected) return
    await updateDeuda(selected.id, {
      visual: {
        ...(selected.visual || {}),
        [field]: value,
      },
    })
  }

  const patchRoot = async (field, value) => {
    if (!selected) return
    await updateDeuda(selected.id, { [field]: value })
  }

  if (!uid) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Deudas activas" value={String(metrics.totalDeudas || 0)} />
        <MetricCard label="Saldo total" value={fmtM(metrics.saldoTotal || 0)} color="var(--red)" />
        <MetricCard label="Pago mensual total" value={fmtM(metrics.pagoMensualTotal || 0)} />
        <MetricCard label="Abono mensual plan" value={fmtM(metrics.abonoMensualPlan || 0)} color="var(--accent)" />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Nueva deuda</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <Field label="Nombre">
            <input
              type="text"
              value={newDebt.nombre}
              onChange={(e) => setNewDebt((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Hipoteca AV Villas"
            />
          </Field>

          <Field label="Tipo">
            <select value={newDebt.tipo} onChange={(e) => setNewDebt((p) => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_DEUDA.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda">
            <input
              type="text"
              value={newDebt.moneda}
              onChange={(e) => setNewDebt((p) => ({ ...p, moneda: e.target.value }))}
            />
          </Field>

          <Btn onClick={addDeuda} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} />
            Agregar
          </Btn>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando deudas…</div>
        </Card>
      ) : !items.length ? (
        <EmptyState
          icon={Landmark}
          title="Sin deudas"
          subtitle="Crea una primera deuda y empieza a registrar condiciones, plan y movimientos."
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {items.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${selected?.id === d.id ? d.visual?.color || 'var(--accent)' : 'var(--border)'}`,
                  background: selected?.id === d.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                  color: selected?.id === d.id ? 'var(--accent)' : 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{d.nombre}</span>
                {!d.activo && <Badge color="default">inactiva</Badge>}
              </button>
            ))}
          </div>

          {selected && (
            <>
              <Card style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <SectionTitle>{selected.nombre}</SectionTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Btn onClick={() => patchRoot('activo', !selected.activo)}>
                      {selected.activo ? 'Desactivar' : 'Activar'}
                    </Btn>
                    <Btn
                      variant="danger"
                      onClick={() => removeDeuda(selected.id, selected.nombre)}
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
                      onChange={(e) => patchRoot('nombre', e.target.value)}
                    />
                  </Field>

                  <Field label="Tipo">
                    <select
                      value={selected.tipo || 'libre-destino'}
                      onChange={(e) => patchRoot('tipo', e.target.value)}
                    >
                      {TIPOS_DEUDA.map((t) => (
                        <option key={t} value={t}>
                          {getTipoLabel(t)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Moneda">
                    <input
                      type="text"
                      value={selected.moneda || 'COP'}
                      onChange={(e) => patchRoot('moneda', e.target.value)}
                    />
                  </Field>

                  <Field label="Color visual">
                    <input
                      type="color"
                      value={selected.visual?.color || '#5ca8ff'}
                      onChange={(e) => patchVisual('color', e.target.value)}
                    />
                  </Field>

                  <Field label="Saldo actual">
                    <input
                      type="number"
                      value={selected.condiciones?.saldoActual || 0}
                      onChange={(e) => patchCondiciones('saldoActual', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Monto original">
                    <input
                      type="number"
                      value={selected.condiciones?.montoOriginal || 0}
                      onChange={(e) => patchCondiciones('montoOriginal', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Fecha desembolso">
                    <input
                      type="date"
                      value={selected.condiciones?.fechaDesembolso || ''}
                      onChange={(e) => patchCondiciones('fechaDesembolso', e.target.value)}
                    />
                  </Field>

                  <Field label="Plazo meses">
                    <input
                      type="number"
                      value={selected.condiciones?.plazoMeses || 0}
                      onChange={(e) => patchCondiciones('plazoMeses', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Tipo tasa">
                    <select
                      value={selected.condiciones?.tasaTipo || 'ea'}
                      onChange={(e) => patchCondiciones('tasaTipo', e.target.value)}
                    >
                      {TIPOS_TASA.map((t) => (
                        <option key={t} value={t}>
                          {t.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Tasa valor">
                    <input
                      type="number"
                      value={selected.condiciones?.tasaValor || 0}
                      onChange={(e) => patchCondiciones('tasaValor', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Cuota manual">
                    <input
                      type="number"
                      value={selected.condiciones?.cuotaManual || ''}
                      onChange={(e) =>
                        patchCondiciones('cuotaManual', e.target.value === '' ? null : Number(e.target.value))
                      }
                    />
                  </Field>

                  <Field label="Modo abono">
                    <select
                      value={selected.condiciones?.modoAbonoCapital || 'reducir-plazo'}
                      onChange={(e) => patchCondiciones('modoAbonoCapital', e.target.value)}
                    >
                      {MODOS_ABONO_CAPITAL.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Residual %">
                    <input
                      type="number"
                      value={selected.condiciones?.residualPct || 0}
                      onChange={(e) => patchCondiciones('residualPct', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Residual valor">
                    <input
                      type="number"
                      value={selected.condiciones?.residualValor || 0}
                      onChange={(e) => patchCondiciones('residualValor', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Seguro modo">
                    <select
                      value={selected.costos?.seguroModo || 'separado'}
                      onChange={(e) => patchCostos('seguroModo', e.target.value)}
                    >
                      {MODOS_SEGURO.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Descontado nómina">
                    <select
                      value={selected.condiciones?.descontadoNomina ? 'si' : 'no'}
                      onChange={(e) => patchCondiciones('descontadoNomina', e.target.value === 'si')}
                    >
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                  <Field label="Seguro vida">
                    <input
                      type="number"
                      value={selected.costos?.seguroVidaMensual || 0}
                      onChange={(e) => patchCostos('seguroVidaMensual', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Seguro desempleo">
                    <input
                      type="number"
                      value={selected.costos?.seguroDesempleoMensual || 0}
                      onChange={(e) => patchCostos('seguroDesempleoMensual', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Seguro hogar">
                    <input
                      type="number"
                      value={selected.costos?.seguroHogarMensual || 0}
                      onChange={(e) => patchCostos('seguroHogarMensual', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Todo riesgo">
                    <input
                      type="number"
                      value={selected.costos?.seguroTodoRiesgoMensual || 0}
                      onChange={(e) => patchCostos('seguroTodoRiesgoMensual', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Otros seguros">
                    <input
                      type="number"
                      value={selected.costos?.otrosSegurosMensuales || 0}
                      onChange={(e) => patchCostos('otrosSegurosMensuales', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Otros cargos mensuales">
                    <input
                      type="number"
                      value={selected.costos?.otrosCargosMensuales || 0}
                      onChange={(e) => patchCostos('otrosCargosMensuales', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Abono mensual plan">
                    <input
                      type="number"
                      value={selected.plan?.abonoMensualCapital || 0}
                      onChange={(e) => patchPlan('abonoMensualCapital', Number(e.target.value || 0))}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 14 }}>
                  <MetricCard label="Meses restantes" value={String(selected.derived?.mesesRestantes || 0)} />
                  <MetricCard label="Cuota calculada" value={fmt(selected.derived?.cuotaCalculada || 0)} />
                  <MetricCard label="Cuota financiera" value={fmt(selected.derived?.cuotaFinanciera || 0)} />
                  <MetricCard
                    label="Pago mensual total"
                    value={fmt(selected.derived?.pagoTotalMensual || 0)}
                    color="var(--accent)"
                  />
                  <MetricCard label="Globo / residual" value={fmt(selected.derived?.globo || 0)} />
                </div>
              </Card>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
                <Card>
                  <SectionTitle>Eventos planificados</SectionTitle>

                  <div style={{ display: 'grid', gridTemplateColumns: '100px 140px 1fr auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
                    <Field label="Mes +n">
                      <input
                        type="number"
                        value={newPlannedEvent.mesOffset}
                        onChange={(e) => setNewPlannedEvent((p) => ({ ...p, mesOffset: e.target.value }))}
                      />
                    </Field>

                    <Field label="Monto">
                      <input
                        type="number"
                        value={newPlannedEvent.monto}
                        onChange={(e) => setNewPlannedEvent((p) => ({ ...p, monto: e.target.value }))}
                      />
                    </Field>

                    <Field label="Nota">
                      <input
                        type="text"
                        value={newPlannedEvent.nota}
                        onChange={(e) => setNewPlannedEvent((p) => ({ ...p, nota: e.target.value }))}
                        placeholder="Bono, prima, extra"
                      />
                    </Field>

                    <Btn onClick={addPlannedEvent} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={13} />
                      Agregar
                    </Btn>
                  </div>

                  {!selected.plan?.eventosPlanificados?.length ? (
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin eventos planificados.</div>
                  ) : (
                    sortEventsAsc(selected.plan.eventosPlanificados).map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text)' }}>Mes +{ev.mesOffset}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ev.nota || '—'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(ev.monto)}</span>
                          <button
                            onClick={() => removePlannedEvent(ev.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.5 }}
                          >
                            <Trash2 size={13} color="var(--red)" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </Card>

                <Card>
                  <SectionTitle>Movimientos reales</SectionTitle>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 120px 120px 1fr auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
                    <Field label="Período">
                      <input
                        type="month"
                        value={newMovement.periodo}
                        onChange={(e) => setNewMovement((p) => ({ ...p, periodo: e.target.value }))}
                      />
                    </Field>

                    <Field label="Cuota pagada">
                      <input
                        type="number"
                        value={newMovement.cuotaPagada}
                        onChange={(e) => setNewMovement((p) => ({ ...p, cuotaPagada: e.target.value }))}
                      />
                    </Field>

                    <Field label="Abono capital">
                      <input
                        type="number"
                        value={newMovement.abonoCapital}
                        onChange={(e) => setNewMovement((p) => ({ ...p, abonoCapital: e.target.value }))}
                      />
                    </Field>

                    <Field label="Cargos">
                      <input
                        type="number"
                        value={newMovement.cargos}
                        onChange={(e) => setNewMovement((p) => ({ ...p, cargos: e.target.value }))}
                      />
                    </Field>

                    <Field label="Nota">
                      <input
                        type="text"
                        value={newMovement.nota}
                        onChange={(e) => setNewMovement((p) => ({ ...p, nota: e.target.value }))}
                      />
                    </Field>

                    <Btn onClick={addMovement} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={13} />
                      Agregar
                    </Btn>
                  </div>

                  {!selected.ejecucion?.movimientos?.length ? (
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin movimientos registrados.</div>
                  ) : (
                    sortMovementsDesc(selected.ejecucion.movimientos).map((mov) => (
                      <div
                        key={mov.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 120px 120px 120px 1fr auto',
                          gap: 8,
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{mov.periodo || '—'}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(mov.cuotaPagada || 0)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                          {fmt(mov.abonoCapital || 0)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(mov.cargos || 0)}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{mov.nota || '—'}</span>
                        <button
                          onClick={() => removeMovement(mov.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.5 }}
                        >
                          <Trash2 size={13} color="var(--red)" />
                        </button>
                      </div>
                    ))
                  )}
                </Card>
              </div>

              <Card>
                <SectionTitle>Resumen de ejecución</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <MetricCard label="Cuotas registradas" value={fmt(selected.derived?.totalMovimientos?.cuotaPagada || 0)} />
                  <MetricCard
                    label="Abonos a capital"
                    value={fmt(selected.derived?.totalMovimientos?.abonoCapital || 0)}
                    color="var(--accent)"
                  />
                  <MetricCard label="Cargos registrados" value={fmt(selected.derived?.totalMovimientos?.cargos || 0)} />
                  <MetricCard label="Plan extra total" value={fmt(selected.derived?.totalEventosPlanificados || 0)} />
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}