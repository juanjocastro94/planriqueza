import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useGastos } from '../../hooks/useGastos'
import {
  createFixedExpense,
  createVariableExpense,
  createExtraordinaryExpense,
  createSubscription,
} from '../../domain/factories'
import { TIPOS_GASTO, FRECUENCIAS_GASTO_EXTRA } from '../../domain/types'
import { Card, SectionTitle, Btn, Field, EmptyState, MetricCard, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { Plus, Trash2, Receipt } from 'lucide-react'

function getCategoriaLabel(tipo) {
  const map = {
    educacion: 'Educación',
    hogar: 'Hogar',
    salud: 'Salud',
    transporte: 'Transporte',
    ocio: 'Ocio',
    financiero: 'Financiero',
    impuestos: 'Impuestos',
    seguros: 'Seguros',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

function monthlyProvision(item) {
  const valor = Number(item?.valor || 0)
  const frecuencia = item?.frecuencia || 'anual'

  const veces = {
    mensual: 12,
    bimestral: 6,
    trimestral: 4,
    semestral: 2,
    anual: 1,
    eventual: 1,
  }[frecuencia] || 1

  return Math.round((valor * veces) / 12)
}

function sortByName(items = []) {
  return [...items].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
}

function SectionHeader({ title, count, color = 'var(--text)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
      <SectionTitle>{title}</SectionTitle>
      <span
        style={{
          fontSize: 11,
          padding: '1px 7px',
          borderRadius: 4,
          background: 'var(--bg-4)',
          color,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {count}
      </span>
    </div>
  )
}

export default function GastosPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading,
    fijos,
    variables,
    extraordinarios,
    suscripciones,
    metrics,
    createFijo,
    updateFijo,
    deleteFijo,
    createVariable,
    updateVariable,
    deleteVariable,
    createExtraordinario,
    updateExtraordinario,
    deleteExtraordinario,
    createSuscripcion,
    updateSuscripcion,
    deleteSuscripcion,
  } = useGastos(uid)

  const [newFijo, setNewFijo] = useState({
    nombre: '',
    categoria: 'hogar',
    valorMensual: '',
  })

  const [newVariable, setNewVariable] = useState({
    nombre: '',
    categoria: 'hogar',
    presupuestoMensual: '',
  })

  const [newExtra, setNewExtra] = useState({
    nombre: '',
    categoria: 'otro',
    valor: '',
    frecuencia: 'anual',
    mesBase: 1,
  })

  const [newSub, setNewSub] = useState({
    nombre: '',
    categoria: 'ocio',
    valorMensual: '',
  })

  const allCount =
    (fijos?.length || 0) +
    (variables?.length || 0) +
    (extraordinarios?.length || 0) +
    (suscripciones?.length || 0)

  const fixedSorted = useMemo(() => sortByName(fijos), [fijos])
  const variableSorted = useMemo(() => sortByName(variables), [variables])
  const extraordinarySorted = useMemo(() => sortByName(extraordinarios), [extraordinarios])
  const subscriptionsSorted = useMemo(() => sortByName(suscripciones), [suscripciones])

  const addFijo = async () => {
    if (!newFijo.nombre.trim()) return
    await createFijo(
      createFixedExpense({
        nombre: newFijo.nombre,
        categoria: newFijo.categoria,
        valorMensual: Number(newFijo.valorMensual || 0),
      })
    )
    setNewFijo({ nombre: '', categoria: 'hogar', valorMensual: '' })
  }

  const addVariable = async () => {
    if (!newVariable.nombre.trim()) return
    await createVariable(
      createVariableExpense({
        nombre: newVariable.nombre,
        categoria: newVariable.categoria,
        presupuestoMensual: Number(newVariable.presupuestoMensual || 0),
      })
    )
    setNewVariable({ nombre: '', categoria: 'hogar', presupuestoMensual: '' })
  }

  const addExtra = async () => {
    if (!newExtra.nombre.trim()) return
    await createExtraordinario(
      createExtraordinaryExpense({
        nombre: newExtra.nombre,
        categoria: newExtra.categoria,
        valor: Number(newExtra.valor || 0),
        frecuencia: newExtra.frecuencia,
        mesBase: Number(newExtra.mesBase || 1),
      })
    )
    setNewExtra({ nombre: '', categoria: 'otro', valor: '', frecuencia: 'anual', mesBase: 1 })
  }

  const addSub = async () => {
    if (!newSub.nombre.trim()) return
    await createSuscripcion(
      createSubscription({
        nombre: newSub.nombre,
        categoria: newSub.categoria,
        valorMensual: Number(newSub.valorMensual || 0),
      })
    )
    setNewSub({ nombre: '', categoria: 'ocio', valorMensual: '' })
  }

  const askDelete = async (label, fn) => {
    const ok = window.confirm(`¿Eliminar "${label}"?`)
    if (!ok) return
    await fn()
  }

  if (!uid) return null

  if (loading) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando gastos…</div>
      </Card>
    )
  }

  if (!allCount) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
          <MetricCard label="Fijos mensuales" value={fmtM(metrics.totalFijos || 0)} />
          <MetricCard label="Variables mensuales" value={fmtM(metrics.totalVariables || 0)} />
          <MetricCard label="Provisión extraordinarios" value={fmtM(metrics.totalExtraordinariosProvision || 0)} />
          <MetricCard label="Total mensual" value={fmtM(metrics.totalMensual || 0)} color="var(--accent)" />
        </div>

        <Card style={{ marginBottom: '1rem' }}>
          <SectionTitle>Crear gasto fijo</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <Field label="Nombre">
              <input value={newFijo.nombre} onChange={(e) => setNewFijo((p) => ({ ...p, nombre: e.target.value }))} />
            </Field>
            <Field label="Categoría">
              <select value={newFijo.categoria} onChange={(e) => setNewFijo((p) => ({ ...p, categoria: e.target.value }))}>
                {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
              </select>
            </Field>
            <Field label="Valor mensual">
              <input type="number" value={newFijo.valorMensual} onChange={(e) => setNewFijo((p) => ({ ...p, valorMensual: e.target.value }))} />
            </Field>
            <Btn onClick={addFijo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} /> Agregar
            </Btn>
          </div>
        </Card>

        <EmptyState
          icon={Receipt}
          title="Todavía no tienes gastos"
          subtitle="Empieza creando gastos fijos, variables, extraordinarios o suscripciones."
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Fijos mensuales" value={fmtM(metrics.totalFijos || 0)} />
        <MetricCard label="Variables mensuales" value={fmtM(metrics.totalVariables || 0)} />
        <MetricCard label="Provisión extraordinarios" value={fmtM(metrics.totalExtraordinariosProvision || 0)} />
        <MetricCard label="Suscripciones" value={fmtM(metrics.totalSuscripciones || 0)} />
        <MetricCard label="Total mensual" value={fmtM(metrics.totalMensual || 0)} color="var(--accent)" />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionHeader title="Gastos fijos" count={fixedSorted.length} color="var(--accent)" />

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
          <Field label="Nombre">
            <input value={newFijo.nombre} onChange={(e) => setNewFijo((p) => ({ ...p, nombre: e.target.value }))} />
          </Field>
          <Field label="Categoría">
            <select value={newFijo.categoria} onChange={(e) => setNewFijo((p) => ({ ...p, categoria: e.target.value }))}>
              {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Valor mensual">
            <input type="number" value={newFijo.valorMensual} onChange={(e) => setNewFijo((p) => ({ ...p, valorMensual: e.target.value }))} />
          </Field>
          <Btn onClick={addFijo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Agregar
          </Btn>
        </div>

        {!fixedSorted.length ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin gastos fijos.</div>
        ) : (
          fixedSorted.map((item) => (
            <RowEditable
              key={item.id}
              title={item.nombre}
              subtitle={getCategoriaLabel(item.categoria)}
              amount={fmt(item.valorMensual || 0)}
              active={item.activo !== false}
              onToggle={() => updateFijo(item.id, { activo: item.activo === false })}
              onDelete={() => askDelete(item.nombre, () => deleteFijo(item.id))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                <Field label="Nombre">
                  <input value={item.nombre || ''} onChange={(e) => updateFijo(item.id, { nombre: e.target.value })} />
                </Field>
                <Field label="Categoría">
                  <select value={item.categoria || 'otro'} onChange={(e) => updateFijo(item.id, { categoria: e.target.value })}>
                    {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
                  </select>
                </Field>
                <Field label="Valor mensual">
                  <input type="number" value={item.valorMensual || 0} onChange={(e) => updateFijo(item.id, { valorMensual: Number(e.target.value || 0) })} />
                </Field>
              </div>
            </RowEditable>
          ))
        )}
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionHeader title="Gastos variables" count={variableSorted.length} color="#ffc266" />

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
          <Field label="Nombre">
            <input value={newVariable.nombre} onChange={(e) => setNewVariable((p) => ({ ...p, nombre: e.target.value }))} />
          </Field>
          <Field label="Categoría">
            <select value={newVariable.categoria} onChange={(e) => setNewVariable((p) => ({ ...p, categoria: e.target.value }))}>
              {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Presupuesto mensual">
            <input type="number" value={newVariable.presupuestoMensual} onChange={(e) => setNewVariable((p) => ({ ...p, presupuestoMensual: e.target.value }))} />
          </Field>
          <Btn onClick={addVariable} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Agregar
          </Btn>
        </div>

        {!variableSorted.length ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin gastos variables.</div>
        ) : (
          variableSorted.map((item) => (
            <RowEditable
              key={item.id}
              title={item.nombre}
              subtitle={getCategoriaLabel(item.categoria)}
              amount={fmt(item.presupuestoMensual || 0)}
              active={item.activo !== false}
              onToggle={() => updateVariable(item.id, { activo: item.activo === false })}
              onDelete={() => askDelete(item.nombre, () => deleteVariable(item.id))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                <Field label="Nombre">
                  <input value={item.nombre || ''} onChange={(e) => updateVariable(item.id, { nombre: e.target.value })} />
                </Field>
                <Field label="Categoría">
                  <select value={item.categoria || 'otro'} onChange={(e) => updateVariable(item.id, { categoria: e.target.value })}>
                    {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
                  </select>
                </Field>
                <Field label="Presupuesto mensual">
                  <input type="number" value={item.presupuestoMensual || 0} onChange={(e) => updateVariable(item.id, { presupuestoMensual: Number(e.target.value || 0) })} />
                </Field>
              </div>
            </RowEditable>
          ))
        )}
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionHeader title="Gastos extraordinarios" count={extraordinarySorted.length} color="#5ca8ff" />

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 90px auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
          <Field label="Nombre">
            <input value={newExtra.nombre} onChange={(e) => setNewExtra((p) => ({ ...p, nombre: e.target.value }))} />
          </Field>
          <Field label="Categoría">
            <select value={newExtra.categoria} onChange={(e) => setNewExtra((p) => ({ ...p, categoria: e.target.value }))}>
              {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Valor">
            <input type="number" value={newExtra.valor} onChange={(e) => setNewExtra((p) => ({ ...p, valor: e.target.value }))} />
          </Field>
          <Field label="Frecuencia">
            <select value={newExtra.frecuencia} onChange={(e) => setNewExtra((p) => ({ ...p, frecuencia: e.target.value }))}>
              {FRECUENCIAS_GASTO_EXTRA.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Mes">
            <input type="number" min="1" max="12" value={newExtra.mesBase} onChange={(e) => setNewExtra((p) => ({ ...p, mesBase: e.target.value }))} />
          </Field>
          <Btn onClick={addExtra} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Agregar
          </Btn>
        </div>

        {!extraordinarySorted.length ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin gastos extraordinarios.</div>
        ) : (
          extraordinarySorted.map((item) => (
            <RowEditable
              key={item.id}
              title={item.nombre}
              subtitle={`${getCategoriaLabel(item.categoria)} · ${item.frecuencia}`}
              amount={fmt(item.valor || 0)}
              active={item.activo !== false}
              onToggle={() => updateExtraordinario(item.id, { activo: item.activo === false })}
              onDelete={() => askDelete(item.nombre, () => deleteExtraordinario(item.id))}
              trailing={
                <Badge color="blue">Prov. {fmt(monthlyProvision(item))}</Badge>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 100px', gap: 8, marginTop: 10 }}>
                <Field label="Nombre">
                  <input value={item.nombre || ''} onChange={(e) => updateExtraordinario(item.id, { nombre: e.target.value })} />
                </Field>
                <Field label="Categoría">
                  <select value={item.categoria || 'otro'} onChange={(e) => updateExtraordinario(item.id, { categoria: e.target.value })}>
                    {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
                  </select>
                </Field>
                <Field label="Valor">
                  <input type="number" value={item.valor || 0} onChange={(e) => updateExtraordinario(item.id, { valor: Number(e.target.value || 0) })} />
                </Field>
                <Field label="Frecuencia">
                  <select value={item.frecuencia || 'anual'} onChange={(e) => updateExtraordinario(item.id, { frecuencia: e.target.value })}>
                    {FRECUENCIAS_GASTO_EXTRA.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Mes base">
                  <input type="number" min="1" max="12" value={item.mesBase || 1} onChange={(e) => updateExtraordinario(item.id, { mesBase: Number(e.target.value || 1) })} />
                </Field>
              </div>
            </RowEditable>
          ))
        )}
      </Card>

      <Card>
        <SectionHeader title="Suscripciones" count={subscriptionsSorted.length} color="var(--accent)" />

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: '1rem' }}>
          <Field label="Nombre">
            <input value={newSub.nombre} onChange={(e) => setNewSub((p) => ({ ...p, nombre: e.target.value }))} />
          </Field>
          <Field label="Categoría">
            <select value={newSub.categoria} onChange={(e) => setNewSub((p) => ({ ...p, categoria: e.target.value }))}>
              {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Valor mensual">
            <input type="number" value={newSub.valorMensual} onChange={(e) => setNewSub((p) => ({ ...p, valorMensual: e.target.value }))} />
          </Field>
          <Btn onClick={addSub} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Agregar
          </Btn>
        </div>

        {!subscriptionsSorted.length ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin suscripciones.</div>
        ) : (
          subscriptionsSorted.map((item) => (
            <RowEditable
              key={item.id}
              title={item.nombre}
              subtitle={getCategoriaLabel(item.categoria)}
              amount={fmt(item.valorMensual || 0)}
              active={item.activo !== false}
              onToggle={() => updateSuscripcion(item.id, { activo: item.activo === false })}
              onDelete={() => askDelete(item.nombre, () => deleteSuscripcion(item.id))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                <Field label="Nombre">
                  <input value={item.nombre || ''} onChange={(e) => updateSuscripcion(item.id, { nombre: e.target.value })} />
                </Field>
                <Field label="Categoría">
                  <select value={item.categoria || 'otro'} onChange={(e) => updateSuscripcion(item.id, { categoria: e.target.value })}>
                    {TIPOS_GASTO.map((t) => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
                  </select>
                </Field>
                <Field label="Valor mensual">
                  <input type="number" value={item.valorMensual || 0} onChange={(e) => updateSuscripcion(item.id, { valorMensual: Number(e.target.value || 0) })} />
                </Field>
              </div>
            </RowEditable>
          ))
        )}
      </Card>
    </div>
  )
}

function RowEditable({ title, subtitle, amount, active, onToggle, onDelete, trailing, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{title}</span>
            {!active && <Badge color="default">inactivo</Badge>}
            {trailing}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{amount}</span>
          <Btn onClick={() => setOpen((v) => !v)}>{open ? 'Cerrar' : 'Editar'}</Btn>
          <Btn onClick={onToggle}>{active ? 'Desactivar' : 'Activar'}</Btn>
          <button
            onClick={onDelete}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.5 }}
          >
            <Trash2 size={13} color="var(--red)" />
          </button>
        </div>
      </div>

      {open && <div>{children}</div>}
    </div>
  )
}