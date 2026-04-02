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
import {
  Card, Btn, Field, MetricCard, CurrencyInput,
} from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import {
  Plus, Trash2, Edit3, AlertTriangle,
  Home, TrendingUp, Zap, RefreshCw,
} from 'lucide-react'
import Modal from '../../components/Modal'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getCategoriaLabel(tipo) {
  const map = {
    educacion: 'Educación', hogar: 'Hogar', salud: 'Salud',
    transporte: 'Transporte', ocio: 'Ocio', financiero: 'Financiero',
    impuestos: 'Impuestos', seguros: 'Seguros', otro: 'Otro',
  }
  return map[tipo] || tipo
}

function monthlyProvision(item) {
  const valor = Number(item?.valor || 0)
  const veces = {
    mensual: 12, bimestral: 6, trimestral: 4,
    semestral: 2, anual: 1, eventual: 1,
  }[item?.frecuencia || 'anual'] || 1
  return Math.round((valor * veces) / 12)
}

function sortByName(items = []) {
  return [...items].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onCancel} title={title} width={420} variant="center">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{message}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="subtle" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="danger" onClick={onConfirm}>Eliminar</Btn>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GastoCard
// ─────────────────────────────────────────────────────────────────────────────

function GastoCard({ item, amount, subtitle, trailing, onEdit, onDelete, onToggle }) {
  const active = item.activo !== false
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        opacity: active ? 1 : 0.45,
        position: 'relative',
        transition: 'border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-3)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.querySelector('.card-actions').style.opacity = '1'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-2)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.querySelector('.card-actions').style.opacity = '0'
      }}
    >
      {/* Acciones top-right en hover */}
      <div className="card-actions" style={{
        position: 'absolute', top: 10, right: 10,
        display: 'flex', gap: 4, opacity: 0, transition: 'opacity .15s',
      }}>
        <button onClick={onEdit} title="Editar" style={{
          background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: 6, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
        }}>
          <Edit3 size={12} color="var(--text-2)" />
        </button>
        <button onClick={onToggle} title={active ? 'Desactivar' : 'Activar'} style={{
          background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: 6, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, fontSize: 14, color: 'var(--text-3)',
        }}>
          {active ? '○' : '●'}
        </button>
        <button onClick={onDelete} title="Eliminar" style={{
          background: 'var(--bg-3)', border: '1px solid transparent',
          borderRadius: 6, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
        }}>
          <Trash2 size={12} color="var(--red)" />
        </button>
      </div>

      {/* Categoría */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6,
      }}>
        {subtitle}
      </div>

      {/* Nombre */}
      <div style={{
        fontSize: 14, fontWeight: 500, color: 'var(--text)',
        marginBottom: 12, paddingRight: 90,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.nombre}
      </div>

      {/* Monto */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 18,
        fontWeight: 700, color: 'var(--text)',
      }}>
        {amount}
      </div>

      {trailing && <div style={{ marginTop: 6 }}>{trailing}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, count, total, accentColor = 'var(--text-3)', onAdd, children }) {
  return (
    <Card style={{ marginBottom: '1rem' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: count > 0 ? '1rem' : '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} color={accentColor} />
          <span style={{
            fontSize: 12, fontWeight: 700, color: 'var(--text-2)',
            textTransform: 'uppercase', letterSpacing: '.07em',
          }}>
            {title}
          </span>
          <span style={{
            fontSize: 11, padding: '1px 7px', borderRadius: 4,
            background: 'var(--bg-4)', color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
          }}>
            {count}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {total > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>
              {fmtM(total)}
            </span>
          )}
          <Btn variant="ghost" onClick={onAdd} style={{ padding: '5px 10px' }}>
            <Plus size={13} /> Agregar
          </Btn>
        </div>
      </div>
      {children}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FIJO  = { nombre: '', categoria: 'hogar',  valorMensual: '' }
const EMPTY_VAR   = { nombre: '', categoria: 'hogar',  presupuestoMensual: '' }
const EMPTY_EXTRA = { nombre: '', categoria: 'otro',   valor: '', frecuencia: 'anual', mesBase: 1 }
const EMPTY_SUB   = { nombre: '', categoria: 'ocio',   valorMensual: '' }

// ─────────────────────────────────────────────────────────────────────────────
// Page principal
// ─────────────────────────────────────────────────────────────────────────────

export default function GastosPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading, fijos, variables, extraordinarios, suscripciones, metrics,
    createFijo, updateFijo, deleteFijo,
    createVariable, updateVariable, deleteVariable,
    createExtraordinario, updateExtraordinario, deleteExtraordinario,
    createSuscripcion, updateSuscripcion, deleteSuscripcion,
  } = useGastos(uid)

  const [modal,   setModal]   = useState(null)
  const [draft,   setDraft]   = useState({})
  const [confirm, setConfirm] = useState(null)
  const [saving,  setSaving]  = useState(false)

  const openAdd  = (type) => {
    setDraft({ ...{ fijo: EMPTY_FIJO, variable: EMPTY_VAR, extra: EMPTY_EXTRA, sub: EMPTY_SUB }[type] })
    setModal({ type, item: null })
  }
  const openEdit   = (type, item) => { setDraft({ ...item }); setModal({ type, item }) }
  const closeModal = () => { setModal(null); setDraft({}) }
  const set        = (key, val) => setDraft(p => ({ ...p, [key]: val }))

  const askDelete = (label, fn) => setConfirm({
    message: `¿Eliminar "${label}"? Esta acción no se puede deshacer.`,
    onConfirm: async () => { await fn(); setConfirm(null) },
  })

  const handleSave = async () => {
    if (!modal || saving) return
    setSaving(true)
    try {
      const { type, item } = modal
      const isEdit = !!item
      if (type === 'fijo') {
        const p = { nombre: draft.nombre, categoria: draft.categoria, valorMensual: Number(draft.valorMensual || 0) }
        isEdit ? await updateFijo(item.id, p) : await createFijo(createFixedExpense(p))
      } else if (type === 'variable') {
        const p = { nombre: draft.nombre, categoria: draft.categoria, presupuestoMensual: Number(draft.presupuestoMensual || 0) }
        isEdit ? await updateVariable(item.id, p) : await createVariable(createVariableExpense(p))
      } else if (type === 'extra') {
        const p = { nombre: draft.nombre, categoria: draft.categoria, valor: Number(draft.valor || 0), frecuencia: draft.frecuencia, mesBase: Number(draft.mesBase || 1) }
        isEdit ? await updateExtraordinario(item.id, p) : await createExtraordinario(createExtraordinaryExpense(p))
      } else if (type === 'sub') {
        const p = { nombre: draft.nombre, categoria: draft.categoria, valorMensual: Number(draft.valorMensual || 0) }
        isEdit ? await updateSuscripcion(item.id, p) : await createSuscripcion(createSubscription(p))
      }
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const fijosSorted  = useMemo(() => sortByName(fijos),           [fijos])
  const varSorted    = useMemo(() => sortByName(variables),       [variables])
  const extraSorted  = useMemo(() => sortByName(extraordinarios), [extraordinarios])
  const subsSorted   = useMemo(() => sortByName(suscripciones),   [suscripciones])

  if (!uid) return null
  if (loading) return <Card><div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando gastos…</div></Card>

  // ── Grid adaptivo según cantidad de ítems ─────────────────────────────────
  const gridCols = (count) => count === 1
    ? '1fr'
    : 'repeat(2, minmax(0, 1fr))'

  // ── Modal content ─────────────────────────────────────────────────────────
  const categoriaField = (
    <Field label="Categoría">
      <select value={draft.categoria || 'otro'} onChange={e => set('categoria', e.target.value)}>
        {TIPOS_GASTO.map(t => <option key={t} value={t}>{getCategoriaLabel(t)}</option>)}
      </select>
    </Field>
  )

  const renderModalContent = () => {
    if (!modal) return null
    const { type } = modal

    if (type === 'fijo') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nombre">
          <input value={draft.nombre || ''} placeholder="Ej. Arriendo, cuota gym…"
            onChange={e => set('nombre', e.target.value)} autoFocus />
        </Field>
        {categoriaField}
        <Field label="Valor mensual">
          <CurrencyInput value={Number(draft.valorMensual || 0)} onChange={v => set('valorMensual', v)} />
        </Field>
      </div>
    )

    if (type === 'variable') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nombre">
          <input value={draft.nombre || ''} placeholder="Ej. Mercado, restaurantes…"
            onChange={e => set('nombre', e.target.value)} autoFocus />
        </Field>
        {categoriaField}
        <Field label="Presupuesto mensual">
          <CurrencyInput value={Number(draft.presupuestoMensual || 0)} onChange={v => set('presupuestoMensual', v)} />
        </Field>
      </div>
    )

    if (type === 'extra') return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Nombre">
            <input value={draft.nombre || ''} placeholder="Ej. Matrícula, viaje…"
              onChange={e => set('nombre', e.target.value)} autoFocus />
          </Field>
        </div>
        {categoriaField}
        <Field label="Frecuencia">
          <select value={draft.frecuencia || 'anual'} onChange={e => set('frecuencia', e.target.value)}>
            {FRECUENCIAS_GASTO_EXTRA.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Valor total del gasto">
          <CurrencyInput value={Number(draft.valor || 0)} onChange={v => set('valor', v)} />
        </Field>
        <Field label="Mes en que ocurre (1–12)">
          <input type="number" min="1" max="12" value={draft.mesBase || 1}
            onChange={e => set('mesBase', e.target.value)} />
        </Field>
        {Number(draft.valor) > 0 && (
          <div style={{
            gridColumn: '1 / -1', background: 'var(--bg-3)',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)',
          }}>
            Provisión mensual:{' '}
            <strong style={{ fontFamily: 'var(--font-mono)' }}>
              {fmt(monthlyProvision(draft))}
            </strong>
          </div>
        )}
      </div>
    )

    if (type === 'sub') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nombre">
          <input value={draft.nombre || ''} placeholder="Ej. Netflix, Spotify…"
            onChange={e => set('nombre', e.target.value)} autoFocus />
        </Field>
        {categoriaField}
        <Field label="Valor mensual">
          <CurrencyInput value={Number(draft.valorMensual || 0)} onChange={v => set('valorMensual', v)} />
        </Field>
      </div>
    )
  }

  const modalTitle = modal ? ({
    fijo:     modal.item ? 'Editar gasto fijo'           : 'Nuevo gasto fijo',
    variable: modal.item ? 'Editar gasto variable'       : 'Nuevo gasto variable',
    extra:    modal.item ? 'Editar gasto extraordinario' : 'Nuevo gasto extraordinario',
    sub:      modal.item ? 'Editar suscripción'          : 'Nueva suscripción',
  })[modal.type] : ''

  return (
    <div>
      {/* ── KPIs 2×2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1rem' }}>
        <MetricCard label="Fijos mensuales"           value={fmtM(metrics.totalFijos || 0)} />
        <MetricCard label="Variables mensuales"       value={fmtM(metrics.totalVariables || 0)} />
        <MetricCard label="Provisión extraordinarios" value={fmtM(metrics.totalExtraordinariosProvision || 0)} />
        <MetricCard label="Suscripciones"             value={fmtM(metrics.totalSuscripciones || 0)} />
      </div>

      {/* ── Total mensual ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '12px 16px',
        marginBottom: '1.5rem',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '.07em',
        }}>
          Total mensual estimado
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 22,
          fontWeight: 700, color: 'var(--text)',
        }}>
          {fmtM(metrics.totalMensual || 0)}
        </span>
      </div>

      {/* ── Gastos fijos ── */}
      <SectionCard
        icon={Home} title="Gastos fijos" count={fijosSorted.length}
        total={metrics.totalFijos} accentColor="var(--accent)"
        onAdd={() => openAdd('fijo')}
      >
        {!fijosSorted.length
          ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, padding: '2px 0' }}>Sin gastos fijos todavía.</p>
          : <div style={{ display: 'grid', gridTemplateColumns: gridCols(fijosSorted.length), gap: 10 }}>
              {fijosSorted.map(item => (
                <GastoCard key={item.id} item={item}
                  amount={fmt(item.valorMensual || 0)}
                  subtitle={getCategoriaLabel(item.categoria)}
                  onEdit={() => openEdit('fijo', item)}
                  onDelete={() => askDelete(item.nombre, () => deleteFijo(item.id))}
                  onToggle={() => updateFijo(item.id, { activo: item.activo === false })}
                />
              ))}
            </div>
        }
      </SectionCard>

      {/* ── Gastos variables ── */}
      <SectionCard
        icon={TrendingUp} title="Gastos variables" count={varSorted.length}
        total={metrics.totalVariables} accentColor="#f5a623"
        onAdd={() => openAdd('variable')}
      >
        {!varSorted.length
          ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, padding: '2px 0' }}>Sin gastos variables todavía.</p>
          : <div style={{ display: 'grid', gridTemplateColumns: gridCols(varSorted.length), gap: 10 }}>
              {varSorted.map(item => (
                <GastoCard key={item.id} item={item}
                  amount={fmt(item.presupuestoMensual || 0)}
                  subtitle={getCategoriaLabel(item.categoria)}
                  onEdit={() => openEdit('variable', item)}
                  onDelete={() => askDelete(item.nombre, () => deleteVariable(item.id))}
                  onToggle={() => updateVariable(item.id, { activo: item.activo === false })}
                />
              ))}
            </div>
        }
      </SectionCard>

      {/* ── Gastos extraordinarios ── */}
      <SectionCard
        icon={Zap} title="Gastos extraordinarios" count={extraSorted.length}
        total={metrics.totalExtraordinariosProvision} accentColor="var(--blue)"
        onAdd={() => openAdd('extra')}
      >
        {!extraSorted.length
          ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, padding: '2px 0' }}>Sin gastos extraordinarios todavía.</p>
          : <div style={{ display: 'grid', gridTemplateColumns: gridCols(extraSorted.length), gap: 10 }}>
              {extraSorted.map(item => (
                <GastoCard key={item.id} item={item}
                  amount={fmt(item.valor || 0)}
                  subtitle={`${getCategoriaLabel(item.categoria)} · ${item.frecuencia}`}
                  trailing={
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 999,
                      background: 'var(--blue-dim)', color: 'var(--blue)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      Prov. {fmt(monthlyProvision(item))}
                    </span>
                  }
                  onEdit={() => openEdit('extra', item)}
                  onDelete={() => askDelete(item.nombre, () => deleteExtraordinario(item.id))}
                  onToggle={() => updateExtraordinario(item.id, { activo: item.activo === false })}
                />
              ))}
            </div>
        }
      </SectionCard>

      {/* ── Suscripciones ── */}
      <SectionCard
        icon={RefreshCw} title="Suscripciones" count={subsSorted.length}
        total={metrics.totalSuscripciones} accentColor="var(--text-3)"
        onAdd={() => openAdd('sub')}
      >
        {!subsSorted.length
          ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, padding: '2px 0' }}>Sin suscripciones todavía.</p>
          : <div style={{ display: 'grid', gridTemplateColumns: gridCols(subsSorted.length), gap: 10 }}>
              {subsSorted.map(item => (
                <GastoCard key={item.id} item={item}
                  amount={fmt(item.valorMensual || 0)}
                  subtitle={getCategoriaLabel(item.categoria)}
                  onEdit={() => openEdit('sub', item)}
                  onDelete={() => askDelete(item.nombre, () => deleteSuscripcion(item.id))}
                  onToggle={() => updateSuscripcion(item.id, { activo: item.activo === false })}
                />
              ))}
            </div>
        }
      </SectionCard>

      {/* ── Modal agregar / editar ── */}
      <Modal open={!!modal} onClose={closeModal} title={modalTitle} width={480} variant="center">
        {renderModalContent()}
        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="subtle" onClick={closeModal}>Cancelar</Btn>
          <Btn variant="accent" onClick={handleSave} disabled={saving || !draft.nombre?.trim()}>
            {saving ? 'Guardando…' : modal?.item ? 'Guardar cambios' : 'Agregar'}
          </Btn>
        </div>
      </Modal>

      {/* ── Confirm eliminar ── */}
      {confirm && (
        <ConfirmModal
          open
          title="Eliminar gasto"
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}