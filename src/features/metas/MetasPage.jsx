import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useMetas } from '../../hooks/useMetas'
import { createGoal } from '../../domain/factories'
import { TIPOS_META } from '../../domain/types'
import { Card, SectionTitle, Btn, Field, EmptyState, MetricCard, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { Plus, Trash2, Target } from 'lucide-react'

function getTipoLabel(tipo) {
  const map = {
    patrimonio: 'Patrimonio',
    liquidez: 'Liquidez',
    deuda: 'Deuda',
    inversion: 'Inversión',
    compra: 'Compra',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

export default function MetasPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading,
    items,
    metrics,
    createMeta,
    updateMeta,
    deleteMeta,
  } = useMetas(uid)

  const [newGoal, setNewGoal] = useState({
    nombre: '',
    tipo: 'otro',
    moneda: 'COP',
    valorObjetivo: '',
    fechaObjetivo: '',
    notas: '',
  })

  const metas = useMemo(() => items || [], [items])

  const addMeta = async () => {
    if (!newGoal.nombre.trim()) return

    await createMeta(
      createGoal({
        nombre: newGoal.nombre,
        tipo: newGoal.tipo,
        moneda: newGoal.moneda,
        valorObjetivo: Number(newGoal.valorObjetivo || 0),
        fechaObjetivo: newGoal.fechaObjetivo || '',
        notas: newGoal.notas || '',
      })
    )

    setNewGoal({
      nombre: '',
      tipo: 'otro',
      moneda: 'COP',
      valorObjetivo: '',
      fechaObjetivo: '',
      notas: '',
    })
  }

  const askDelete = async (id, nombre) => {
    const ok = window.confirm(`¿Eliminar la meta "${nombre}"?`)
    if (!ok) return
    await deleteMeta(id)
  }

  if (!uid) return null

  if (loading) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando metas…</div>
      </Card>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Metas activas" value={String(metrics.totalMetas || 0)} />
        <MetricCard label="Valor objetivo total" value={fmtM(metrics.valorObjetivoTotal || 0)} color="var(--accent)" />
        <MetricCard
          label="Promedio por meta"
          value={fmtM(metrics.totalMetas ? metrics.valorObjetivoTotal / metrics.totalMetas : 0)}
        />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Nueva meta</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Field label="Nombre">
            <input
              value={newGoal.nombre}
              onChange={(e) => setNewGoal((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Fondo de emergencia, patrimonio 2030"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={newGoal.tipo}
              onChange={(e) => setNewGoal((p) => ({ ...p, tipo: e.target.value }))}
            >
              {TIPOS_META.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda">
            <input
              value={newGoal.moneda}
              onChange={(e) => setNewGoal((p) => ({ ...p, moneda: e.target.value }))}
            />
          </Field>

          <Field label="Valor objetivo">
            <input
              type="number"
              value={newGoal.valorObjetivo}
              onChange={(e) => setNewGoal((p) => ({ ...p, valorObjetivo: e.target.value }))}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'end' }}>
          <Field label="Fecha objetivo">
            <input
              type="date"
              value={newGoal.fechaObjetivo}
              onChange={(e) => setNewGoal((p) => ({ ...p, fechaObjetivo: e.target.value }))}
            />
          </Field>

          <Field label="Notas">
            <input
              value={newGoal.notas}
              onChange={(e) => setNewGoal((p) => ({ ...p, notas: e.target.value }))}
              placeholder="Comentario opcional"
            />
          </Field>

          <Btn onClick={addMeta} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} />
            Agregar
          </Btn>
        </div>
      </Card>

      {!metas.length ? (
        <EmptyState
          icon={Target}
          title="Sin metas"
          subtitle="Crea una primera meta para orientar el plan financiero."
        />
      ) : (
        <Card>
          <SectionTitle>Metas registradas</SectionTitle>

          {metas.map((item) => (
            <GoalRow
              key={item.id}
              item={item}
              onUpdate={updateMeta}
              onDelete={() => askDelete(item.id, item.nombre)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}

function GoalRow({ item, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.nombre}</span>
            {!item.activo && <Badge color="default">inactiva</Badge>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {getTipoLabel(item.tipo)} · {item.moneda || 'COP'} · {item.fechaObjetivo || 'sin fecha'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(item.valorObjetivo || 0)}</span>
          <Btn onClick={() => setOpen((v) => !v)}>{open ? 'Cerrar' : 'Editar'}</Btn>
          <Btn onClick={() => onUpdate(item.id, { activo: item.activo === false })}>
            {item.activo === false ? 'Activar' : 'Desactivar'}
          </Btn>
          <button
            onClick={onDelete}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.5 }}
          >
            <Trash2 size={13} color="var(--red)" />
          </button>
        </div>
      </div>

      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.5fr', gap: 8, marginTop: 10 }}>
          <Field label="Nombre">
            <input value={item.nombre || ''} onChange={(e) => onUpdate(item.id, { nombre: e.target.value })} />
          </Field>

          <Field label="Tipo">
            <select value={item.tipo || 'otro'} onChange={(e) => onUpdate(item.id, { tipo: e.target.value })}>
              {TIPOS_META.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda">
            <input value={item.moneda || 'COP'} onChange={(e) => onUpdate(item.id, { moneda: e.target.value })} />
          </Field>

          <Field label="Valor objetivo">
            <input
              type="number"
              value={item.valorObjetivo || 0}
              onChange={(e) => onUpdate(item.id, { valorObjetivo: Number(e.target.value || 0) })}
            />
          </Field>

          <Field label="Fecha objetivo">
            <input
              type="date"
              value={item.fechaObjetivo || ''}
              onChange={(e) => onUpdate(item.id, { fechaObjetivo: e.target.value })}
            />
          </Field>

          <Field label="Notas">
            <input value={item.notas || ''} onChange={(e) => onUpdate(item.id, { notas: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  )
}