import React, { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useActivos } from '../../hooks/useActivos'
import { createAsset } from '../../domain/factories'
import { TIPOS_ACTIVO } from '../../domain/types'
import { Card, SectionTitle, Btn, Field, EmptyState, MetricCard, Badge } from '../../components/UI'
import { fmt, fmtM } from '../../utils/calc'
import { Plus, Trash2, Package } from 'lucide-react'

function getTipoLabel(tipo) {
  const map = {
    vehiculo: 'Vehículo',
    inmueble: 'Inmueble',
    negocio: 'Negocio',
    cuenta: 'Cuenta',
    otro: 'Otro',
  }
  return map[tipo] || tipo
}

function sortByName(items = []) {
  return [...items].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
}

export default function ActivosPage() {
  const { user } = useAuth()
  const uid = user?.uid || null

  const {
    loading,
    items,
    metrics,
    createActivo,
    updateActivo,
    deleteActivo,
  } = useActivos(uid)

  const [newAsset, setNewAsset] = useState({
    nombre: '',
    tipo: 'otro',
    moneda: 'COP',
    valorActual: '',
    crecimientoEsperadoAnualPct: '',
    notas: '',
  })

  const activos = useMemo(() => sortByName(items), [items])

  const addActivo = async () => {
    if (!newAsset.nombre.trim()) return

    await createActivo(
      createAsset({
        nombre: newAsset.nombre,
        tipo: newAsset.tipo,
        moneda: newAsset.moneda,
        valorActual: Number(newAsset.valorActual || 0),
        crecimientoEsperadoAnualPct: Number(newAsset.crecimientoEsperadoAnualPct || 0),
        notas: newAsset.notas || '',
      })
    )

    setNewAsset({
      nombre: '',
      tipo: 'otro',
      moneda: 'COP',
      valorActual: '',
      crecimientoEsperadoAnualPct: '',
      notas: '',
    })
  }

  const askDelete = async (id, nombre) => {
    const ok = window.confirm(`¿Eliminar el activo "${nombre}"?`)
    if (!ok) return
    await deleteActivo(id)
  }

  if (!uid) return null

  if (loading) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cargando activos…</div>
      </Card>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Activos activos" value={String(metrics.totalActivos || 0)} />
        <MetricCard label="Valor total" value={fmtM(metrics.valorTotal || 0)} color="var(--accent)" />
        <MetricCard
          label="Promedio por activo"
          value={fmtM(metrics.totalActivos ? metrics.valorTotal / metrics.totalActivos : 0)}
        />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Nuevo activo</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Field label="Nombre">
            <input
              value={newAsset.nombre}
              onChange={(e) => setNewAsset((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Tesla Model Y, Apto Cajicá"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={newAsset.tipo}
              onChange={(e) => setNewAsset((p) => ({ ...p, tipo: e.target.value }))}
            >
              {TIPOS_ACTIVO.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda">
            <input
              value={newAsset.moneda}
              onChange={(e) => setNewAsset((p) => ({ ...p, moneda: e.target.value }))}
            />
          </Field>

          <Field label="Valor actual">
            <input
              type="number"
              value={newAsset.valorActual}
              onChange={(e) => setNewAsset((p) => ({ ...p, valorActual: e.target.value }))}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'end' }}>
          <Field label="Crecimiento anual %">
            <input
              type="number"
              value={newAsset.crecimientoEsperadoAnualPct}
              onChange={(e) => setNewAsset((p) => ({ ...p, crecimientoEsperadoAnualPct: e.target.value }))}
            />
          </Field>

          <Field label="Notas">
            <input
              value={newAsset.notas}
              onChange={(e) => setNewAsset((p) => ({ ...p, notas: e.target.value }))}
              placeholder="Comentario opcional"
            />
          </Field>

          <Btn onClick={addActivo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} />
            Agregar
          </Btn>
        </div>
      </Card>

      {!activos.length ? (
        <EmptyState
          icon={Package}
          title="Sin activos"
          subtitle="Crea un primer activo para consolidar patrimonio más adelante."
        />
      ) : (
        <Card>
          <SectionTitle>Activos registrados</SectionTitle>

          {activos.map((item) => (
            <AssetRow
              key={item.id}
              item={item}
              onUpdate={updateActivo}
              onDelete={() => askDelete(item.id, item.nombre)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}

function AssetRow({ item, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.nombre}</span>
            {!item.activo && <Badge color="default">inactivo</Badge>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {getTipoLabel(item.tipo)} · {item.moneda || 'COP'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(item.valorActual || 0)}</span>
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
              {TIPOS_ACTIVO.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda">
            <input value={item.moneda || 'COP'} onChange={(e) => onUpdate(item.id, { moneda: e.target.value })} />
          </Field>

          <Field label="Valor actual">
            <input
              type="number"
              value={item.valorActual || 0}
              onChange={(e) => onUpdate(item.id, { valorActual: Number(e.target.value || 0) })}
            />
          </Field>

          <Field label="Notas">
            <input value={item.notas || ''} onChange={(e) => onUpdate(item.id, { notas: e.target.value })} />
          </Field>

          <Field label="Crecimiento anual %">
            <input
              type="number"
              value={item.crecimientoEsperadoAnualPct || 0}
              onChange={(e) => onUpdate(item.id, { crecimientoEsperadoAnualPct: Number(e.target.value || 0) })}
            />
          </Field>
        </div>
      )}
    </div>
  )
}