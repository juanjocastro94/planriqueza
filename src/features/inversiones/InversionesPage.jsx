import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useInversiones } from '../../hooks/useInversiones'
import {
  createInvestment,
  createInvestmentMovement,
  createInvestmentPlannedEvent,
} from '../../domain/factories'
import { TIPOS_INVERSION, TIPOS_MOVIMIENTO_INVERSION } from '../../domain/types'
import { Card, SectionTitle, Btn, Field, EmptyState, MetricCard, Badge } from '../../components/UI'
import { fmt, fmtM, fmtUSD } from '../../utils/calc'
import { Plus, Trash2, DollarSign } from 'lucide-react'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTipoLabel(tipo) {
  const map = {
    usd: 'USD',
    cdt: 'CDT',
    crypto: 'Crypto',
    fondo: 'Fondo',
    acciones: 'Acciones',
    'cuenta-remunerada': 'Cuenta remunerada',
    bonos: 'Bonos',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

function getMovimientoLabel(tipo) {
  const map = {
    aporte: 'Aporte',
    retiro: 'Retiro',
    compra: 'Compra',
    venta: 'Venta',
    interes: 'Interés',
    dividendo: 'Dividendo',
    ajuste: 'Ajuste',
  }
  return map[tipo] || tipo
}

function sortMovementsDesc(items = []) {
  return [...items].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
}

function sortEventsAsc(items = []) {
  return [...items].sort((a, b) => Number(a.mesOffset || 0) - Number(b.mesOffset || 0))
}

function formatValueByType(item) {
  if (!item) return '—'

  if (item.tipo === 'usd') {
    return fmtUSD(Math.round(item.derived?.unidadesAcumuladas || 0))
  }

  return fmt(item.derived?.valorActualCOP || 0)
}

export default function InversionesPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading,
    items,
    metrics,
    createInversion,
    updateInversion,
    deleteInversion,
    createEventoPlanificado,
    deleteEventoPlanificado,
    createMovimiento,
    deleteMovimiento,
  } = useInversiones(uid)

  const [selectedId, setSelectedId] = useState(null)

  const [newInvestment, setNewInvestment] = useState({
    nombre: '',
    tipo: 'usd',
    monedaBase: 'USD',
  })

  const [newPlannedEvent, setNewPlannedEvent] = useState({
    mesOffset: 1,
    monto: '',
    nota: '',
  })

  const [newMovement, setNewMovement] = useState({
    fecha: currentDate(),
    periodo: currentPeriod(),
    tipo: 'aporte',
    montoCOP: '',
    montoUnidad: '',
    tasaReferencia: '',
    nota: '',
  })

  const selected = useMemo(() => {
    return items.find((i) => i.id === selectedId) || items[0] || null
  }, [items, selectedId])

  const addInversion = async () => {
    if (!newInvestment.nombre.trim()) return
    const payload = createInvestment(newInvestment)
    await createInversion(payload)
    setNewInvestment({
      nombre: '',
      tipo: 'usd',
      monedaBase: 'USD',
    })
  }

  const removeInversion = async (investmentId, nombre) => {
    const ok = window.confirm(`¿Eliminar la inversión "${nombre}" y todo su histórico?`)
    if (!ok) return
    await deleteInversion(investmentId)
    if (selectedId === investmentId) setSelectedId(null)
  }

  const addPlannedEvent = async () => {
    if (!selected) return
    if (!newPlannedEvent.monto) return

    const payload = createInvestmentPlannedEvent({
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
    if (!newMovement.fecha || !newMovement.tipo) return

    const payload = createInvestmentMovement({
      fecha: newMovement.fecha,
      periodo: newMovement.periodo || newMovement.fecha.slice(0, 7),
      tipo: newMovement.tipo,
      montoCOP: Number(newMovement.montoCOP || 0),
      montoUnidad: Number(newMovement.montoUnidad || 0),
      tasaReferencia: Number(newMovement.tasaReferencia || 0),
      nota: newMovement.nota || '',
    })

    await createMovimiento(selected.id, payload)

    setNewMovement({
      fecha: currentDate(),
      periodo: currentPeriod(),
      tipo: 'aporte',
      montoCOP: '',
      montoUnidad: '',
      tasaReferencia: '',
      nota: '',
    })
  }

  const removeMovement = async (movementId) => {
    if (!selected) return
    const ok = window.confirm('¿Eliminar este movimiento?')
    if (!ok) return
    await deleteMovimiento(selected.id, movementId)
  }

  const patchConfig = async (field, value) => {
    if (!selected) return
    await updateInversion(selected.id, {
      configuracion: {
        ...(selected.configuracion || {}),
        [field]: value,
      },
    })
  }

  const patchPlan = async (field, value) => {
    if (!selected) return
    await updateInversion(selected.id, {
      plan: {
        ...(selected.plan || {}),
        [field]: value,
      },
    })
  }

  const patchRoot = async (field, value) => {
    if (!selected) return
    await updateInversion(selected.id, { [field]: value })
  }

  if (!uid) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Inversiones activas" value={String(metrics.totalInversiones || 0)} />
        <MetricCard label="Aporte mensual plan" value={fmtM(metrics.aporteMensualPlan || 0)} color="var(--accent)" />
        <MetricCard label="Valor actual total" value={fmtM(metrics.valorActualTotalCOP || 0)} />
        <MetricCard label="Total aportes / compras" value={fmtM((metrics.totalAportes || 0) + (metrics.totalCompras || 0))} />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Nueva inversión</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <Field label="Nombre">
            <input
              type="text"
              value={newInvestment.nombre}
              onChange={(e) => setNewInvestment((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Caja USD, CDT Bancolombia, BTC"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={newInvestment.tipo}
              onChange={(e) => setNewInvestment((p) => ({ ...p, tipo: e.target.value }))}
            >
              {TIPOS_INVERSION.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda base">
            <input
              type="text"
              value={newInvestment.monedaBase}
              onChange={(e) => setNewInvestment((p) => ({ ...p, monedaBase: e.target.value }))}
            />
          </Field>

          <Btn onClick={addInversion} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} />
            Agregar
          </Btn>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando inversiones…</div>
        </Card>
      ) : !items.length ? (
        <EmptyState
          icon={DollarSign}
          title="Sin inversiones"
          subtitle="Crea una primera inversión para empezar a registrar aportes, compras y rendimientos."
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {items.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${selected?.id === i.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected?.id === i.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                  color: selected?.id === i.id ? 'var(--accent)' : 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{i.nombre}</span>
                {!i.activo && <Badge color="default">inactiva</Badge>}
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
                      onClick={() => removeInversion(selected.id, selected.nombre)}
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
                      value={selected.tipo || 'usd'}
                      onChange={(e) => patchRoot('tipo', e.target.value)}
                    >
                      {TIPOS_INVERSION.map((t) => (
                        <option key={t} value={t}>
                          {getTipoLabel(t)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Moneda base">
                    <input
                      type="text"
                      value={selected.monedaBase || 'COP'}
                      onChange={(e) => patchRoot('monedaBase', e.target.value)}
                    />
                  </Field>

                  <Field label="Aporte mensual plan">
                    <input
                      type="number"
                      value={selected.plan?.aporteMensual || 0}
                      onChange={(e) => patchPlan('aporteMensual', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Rentabilidad esperada %">
                    <input
                      type="number"
                      value={selected.configuracion?.rentabilidadEsperadaAnualPct || 0}
                      onChange={(e) => patchConfig('rentabilidadEsperadaAnualPct', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="TRM referencia">
                    <input
                      type="number"
                      value={selected.configuracion?.trmReferencia || 0}
                      onChange={(e) => patchConfig('trmReferencia', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Fecha apertura">
                    <input
                      type="date"
                      value={selected.configuracion?.fechaApertura || ''}
                      onChange={(e) => patchConfig('fechaApertura', e.target.value)}
                    />
                  </Field>

                  <Field label="Fecha vencimiento">
                    <input
                      type="date"
                      value={selected.configuracion?.fechaVencimiento || ''}
                      onChange={(e) => patchConfig('fechaVencimiento', e.target.value)}
                    />
                  </Field>

                  <Field label="Tasa pactada %">
                    <input
                      type="number"
                      value={selected.configuracion?.tasaPactadaAnualPct || 0}
                      onChange={(e) => patchConfig('tasaPactadaAnualPct', Number(e.target.value || 0))}
                    />
                  </Field>

                  <Field label="Ticker">
                    <input
                      type="text"
                      value={selected.configuracion?.ticker || ''}
                      onChange={(e) => patchConfig('ticker', e.target.value)}
                    />
                  </Field>

                  <Field label="Plataforma">
                    <input
                      type="text"
                      value={selected.configuracion?.plataforma || ''}
                      onChange={(e) => patchConfig('plataforma', e.target.value)}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                  <MetricCard label="Valor actual" value={fmt(selected.derived?.valorActualCOP || 0)} color="var(--accent)" />
                  <MetricCard label="Aportes" value={fmt((selected.derived?.totalAportes || 0) + (selected.derived?.totalCompras || 0))} />
                  <MetricCard label="Último movimiento" value={selected.derived?.ultimoMovimiento || '—'} />
                  <MetricCard label="Indicador clave" value={formatValueByType(selected)} />
                </div>

                {selected.tipo === 'usd' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                    <MetricCard label="USD acumulados" value={fmtUSD(Math.round(selected.derived?.unidadesAcumuladas || 0))} />
                    <MetricCard label="TRM promedio" value={fmt(Number(selected.derived?.trmPromedio || 0))} />
                    <MetricCard label="Invertido COP" value={fmt(selected.derived?.totalInvertidoCOP || 0)} />
                    <MetricCard label="Ganancia cambiaria" value={fmt(selected.derived?.gananciaCambiaria || 0)} color={selected.derived?.gananciaCambiaria >= 0 ? 'var(--accent)' : 'var(--red)'} />
                  </div>
                )}

                {selected.tipo === 'cdt' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                    <MetricCard label="Capital invertido" value={fmt(selected.derived?.capitalInvertido || 0)} />
                    <MetricCard label="Intereses estimados" value={fmt(selected.derived?.interesesEstimados || 0)} color="var(--accent)" />
                    <MetricCard label="Valor proyectado" value={fmt(selected.derived?.valorActualCOP || 0)} />
                  </div>
                )}
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
                        placeholder="Bono, prima, aporte extra"
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

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 110px 120px 120px 120px 1fr auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
                    <Field label="Fecha">
                      <input
                        type="date"
                        value={newMovement.fecha}
                        onChange={(e) =>
                          setNewMovement((p) => ({
                            ...p,
                            fecha: e.target.value,
                            periodo: e.target.value ? e.target.value.slice(0, 7) : p.periodo,
                          }))
                        }
                      />
                    </Field>

                    <Field label="Tipo">
                      <select
                        value={newMovement.tipo}
                        onChange={(e) => setNewMovement((p) => ({ ...p, tipo: e.target.value }))}
                      >
                        {TIPOS_MOVIMIENTO_INVERSION.map((t) => (
                          <option key={t} value={t}>
                            {getMovimientoLabel(t)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Monto COP">
                      <input
                        type="number"
                        value={newMovement.montoCOP}
                        onChange={(e) => setNewMovement((p) => ({ ...p, montoCOP: e.target.value }))}
                      />
                    </Field>

                    <Field label="Monto unidad">
                      <input
                        type="number"
                        value={newMovement.montoUnidad}
                        onChange={(e) => setNewMovement((p) => ({ ...p, montoUnidad: e.target.value }))}
                      />
                    </Field>

                    <Field label="Tasa ref.">
                      <input
                        type="number"
                        value={newMovement.tasaReferencia}
                        onChange={(e) => setNewMovement((p) => ({ ...p, tasaReferencia: e.target.value }))}
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
                          gridTemplateColumns: '100px 90px 120px 120px 120px 1fr auto',
                          gap: 8,
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{mov.fecha || '—'}</span>
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>{getMovimientoLabel(mov.tipo)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(mov.montoCOP || 0)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                          {Number(mov.montoUnidad || 0) > 0 ? Number(mov.montoUnidad || 0).toLocaleString() : '—'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {Number(mov.tasaReferencia || 0) > 0 ? fmt(mov.tasaReferencia || 0) : '—'}
                        </span>
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
                  <MetricCard label="Aportes" value={fmt(selected.derived?.totalAportes || 0)} />
                  <MetricCard label="Compras" value={fmt(selected.derived?.totalCompras || 0)} />
                  <MetricCard label="Retiros / ventas" value={fmt((selected.derived?.totalRetiros || 0) + (selected.derived?.totalVentas || 0))} />
                  <MetricCard label="Intereses / dividendos" value={fmt((selected.derived?.totalIntereses || 0) + (selected.derived?.totalDividendos || 0))} color="var(--accent)" />
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}