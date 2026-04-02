import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useActivos } from '../../hooks/useActivos'
import { useDeudas } from '../../hooks/useDeudas'
import { useIngresos } from '../../hooks/useIngresos'
import { createAsset } from '../../domain/factories'
import { TIPOS_ACTIVO } from '../../domain/types'
import {
  Card, Btn, Field, EmptyState, MetricCard, CurrencyInput,
} from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import {
  Plus, Trash2, Package, AlertTriangle, Landmark, Wallet,
} from 'lucide-react'
import Modal from '../../components/Modal'

function getTipoLabel(tipo) {
  const map = {
    vehiculo: 'Vehículo', inmueble: 'Inmueble',
    negocio: 'Negocio', cuenta: 'Cuenta', otro: 'Otro',
  }
  return map[tipo] || tipo
}

function getTipoColor(tipo) {
  const map = {
    inmueble: '#5ca8ff', vehiculo: '#f5a623',
    negocio: '#b7de4a', cuenta: '#a78bfa', otro: '#9ca3af',
  }
  return map[tipo] || 'var(--text-3)'
}

function getTipoCrecimientoLabel(tipo) {
  const map = {
    inmueble: '+5% anual estimado',
    vehiculo: '−10% anual estimado',
    negocio:  '+8% anual estimado',
    cuenta:   'Sin variación estimada',
    otro:     '+3% anual estimado',
  }
  return map[tipo] || ''
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
// ActivoCard
// ─────────────────────────────────────────────────────────────────────────────

function ActivoCard({ activo, deudaVinculada, fuenteIngreso, onClick }) {
  const color    = getTipoColor(activo.tipo)
  const valor    = Number(activo.valorActual || 0)
  const isActivo = activo.activo !== false
  const crecLabel = getTipoCrecimientoLabel(activo.tipo)

  return (
    <button onClick={onClick} style={{
      all: 'unset', display: 'block', cursor: 'pointer', width: '100%',
      background: 'var(--bg-2)', border: '1px solid var(--border-2)',
      borderRadius: 'var(--radius-xl)', padding: '1rem 1.1rem',
      boxShadow: 'var(--shadow-sm)', opacity: isActivo ? 1 : 0.5,
      transition: 'border-color .15s, box-shadow .15s, transform .12s',
      boxSizing: 'border-box', textAlign: 'left', position: 'relative',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 4px 16px rgba(28,35,24,0.08), 0 0 0 3px ${color}22`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-2)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ position: 'absolute', top: 14, right: 14, width: 10, height: 10, borderRadius: '50%', background: color }} />

      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
        {getTipoLabel(activo.tipo)} · {activo.moneda || 'COP'}
      </div>

      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 14, paddingRight: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {activo.nombre}
      </div>

      <div style={{ marginBottom: deudaVinculada || fuenteIngreso ? 12 : 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Valor actual</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
          {valor > 0 ? fmtM(valor) : '—'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{crecLabel}</div>
      </div>

      {(deudaVinculada || fuenteIngreso) && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {deudaVinculada && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Landmark size={11} color="var(--red)" />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Financiado por</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#b54545',
                background: 'rgba(217,92,92,.08)', padding: '1px 7px',
                borderRadius: 999, border: '1px solid rgba(217,92,92,.2)',
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {deudaVinculada.nombre}
              </span>
            </div>
          )}
          {fuenteIngreso && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wallet size={11} color="#4a6b10" />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Genera ingreso</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#4a6b10',
                background: 'rgba(183,222,74,.12)', padding: '1px 7px',
                borderRadius: 999, border: '1px solid rgba(183,222,74,.25)',
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {fuenteIngreso.nombre}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivoForm — formulario puro sin manejo de open/close
// El padre lo monta/desmonta condicionalmente con key único
// ─────────────────────────────────────────────────────────────────────────────

function ActivoForm({ onClose, onSave, initial, deudas, fuentes, title }) {
  const [draft, setDraft] = useState(initial)
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  return (
    <Modal open onClose={onClose} title={title} width={520} variant="center">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Nombre">
            <input
              type="text"
              value={draft.nombre || ''}
              placeholder="Ej. Apto Bogotá, Carro Tesla"
              onChange={e => set('nombre', e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Tipo">
            <select value={draft.tipo || 'otro'} onChange={e => set('tipo', e.target.value)}>
              {TIPOS_ACTIVO.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
            </select>
          </Field>
          <Field label="Valor actual">
            <CurrencyInput
              value={Number(draft.valorActual || 0)}
              onChange={v => set('valorActual', v)}
            />
          </Field>
          <Field label="Moneda">
            <input
              type="text"
              value={draft.moneda || 'COP'}
              onChange={e => set('moneda', e.target.value)}
            />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Notas (opcional)">
              <input
                type="text"
                value={draft.notas || ''}
                placeholder="Comentario"
                onChange={e => set('notas', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Valorización automática */}
        <div style={{
          background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px',
          fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6,
        }}>
          💡 Valorización estimada automática —{' '}
          <strong style={{ color: 'var(--text-2)' }}>
            {getTipoCrecimientoLabel(draft.tipo || 'otro')}
          </strong>
        </div>

        {/* Vínculos */}
        <div style={{ background: 'var(--bg-3)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Vínculos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Financiado por (deuda)">
              <select
                value={draft.deudaVinculadaId || ''}
                onChange={e => set('deudaVinculadaId', e.target.value || null)}
              >
                <option value="">Sin deuda vinculada</option>
                {deudas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </Field>
            <Field label="Genera ingreso (fuente)">
              <select
                value={draft.fuenteIngresoId || ''}
                onChange={e => set('fuenteIngresoId', e.target.value || null)}
              >
                <option value="">Sin fuente de ingreso vinculada</option>
                {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="subtle" onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="accent"
          onClick={() => onSave(draft)}
          disabled={!draft.nombre?.trim()}
        >
          Guardar
        </Btn>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY state
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY = {
  nombre: '', tipo: 'otro', moneda: 'COP',
  valorActual: 0, notas: '',
  deudaVinculadaId: null, fuenteIngresoId: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ActivosPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const { loading, items, metrics, createActivo, updateActivo, deleteActivo } = useActivos(uid)
  const { items: deudas } = useDeudas(uid)
  const { fuentes } = useIngresos(uid)

  const activos = useMemo(() => sortByName(items), [items])

  const [isNewOpen, setIsNewOpen] = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [confirm,   setConfirm]   = useState(null)
  const [saving,    setSaving]    = useState(false)

  const handleCreate = async (draft) => {
    if (!draft.nombre?.trim() || saving) return
    setSaving(true)
    try {
      await createActivo(createAsset({
        nombre:           draft.nombre,
        tipo:             draft.tipo,
        moneda:           draft.moneda,
        valorActual:      Number(draft.valorActual || 0),
        notas:            draft.notas || '',
        deudaVinculadaId: draft.deudaVinculadaId || null,
        fuenteIngresoId:  draft.fuenteIngresoId   || null,
      }))
      setIsNewOpen(false)
    } finally { setSaving(false) }
  }

  const handleEdit = async (draft) => {
    if (!draft.nombre?.trim() || saving || !editItem) return
    setSaving(true)
    try {
      await updateActivo(editItem.id, {
        nombre:           draft.nombre,
        tipo:             draft.tipo,
        moneda:           draft.moneda,
        valorActual:      Number(draft.valorActual || 0),
        notas:            draft.notas || '',
        deudaVinculadaId: draft.deudaVinculadaId || null,
        fuenteIngresoId:  draft.fuenteIngresoId   || null,
      })
      setEditItem(null)
    } finally { setSaving(false) }
  }

  const askDelete = (item) => setConfirm({
    message: `¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`,
    onConfirm: async () => { await deleteActivo(item.id); setConfirm(null) },
  })

  const getDeuda  = (id) => (deudas  || []).find(d => d.id === id) || null
  const getFuente = (id) => (fuentes || []).find(f => f.id === id) || null

  if (!uid) return null

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1rem' }}>
        <MetricCard label="Activos registrados" value={String(metrics.totalActivos || 0)} />
        <MetricCard label="Valor total"         value={fmtM(metrics.valorTotal || 0)} color="var(--accent)" />
      </div>

      {/* Botón nuevo */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Btn variant="accent" onClick={() => setIsNewOpen(true)} style={{ padding: '7px 14px' }}>
          <Plus size={13} /> Nuevo activo
        </Btn>
      </div>

      {/* Grid de cards */}
      {loading ? (
        <Card><div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando activos…</div></Card>
      ) : !activos.length ? (
        <EmptyState icon={Package} title="Sin activos registrados"
          subtitle="Registra inmuebles, vehículos o negocios y vincúlalos con tus deudas e ingresos."
          action={
            <Btn variant="accent" onClick={() => setIsNewOpen(true)}>
              <Plus size={13} /> Nuevo activo
            </Btn>
          }
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: activos.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}>
          {activos.map(a => (
            <div key={a.id} style={{ position: 'relative' }}>
              <ActivoCard
                activo={a}
                deudaVinculada={a.deudaVinculadaId ? getDeuda(a.deudaVinculadaId) : null}
                fuenteIngreso={a.fuenteIngresoId   ? getFuente(a.fuenteIngresoId)  : null}
                onClick={() => setEditItem(a)}
              />
              <button
                onClick={e => { e.stopPropagation(); askDelete(a) }}
                title="Eliminar"
                style={{
                  position: 'absolute', top: 10, right: 28,
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, opacity: 0, transition: 'opacity .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0'}
              >
                <Trash2 size={12} color="var(--red)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── CLAVE: montaje condicional con key único ── */}
      {/* Esto garantiza que useState(initial) se inicializa correctamente */}

      {isNewOpen && (
        <ActivoForm
          key="new"
          onClose={() => setIsNewOpen(false)}
          onSave={handleCreate}
          initial={EMPTY}
          deudas={deudas || []}
          fuentes={fuentes || []}
          title="Nuevo activo"
        />
      )}

      {editItem && (
        <ActivoForm
          key={editItem.id}
          onClose={() => setEditItem(null)}
          onSave={handleEdit}
          initial={editItem}
          deudas={deudas || []}
          fuentes={fuentes || []}
          title={`Editar · ${editItem.nombre}`}
        />
      )}

      {/* Confirm */}
      {confirm && (
        <ConfirmModal open title="Eliminar activo" message={confirm.message}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}