import React, { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, SectionTitle, Btn, MetricCard, EmptyState, Field } from './UI'
import { fmt, fmtM } from '../utils/calc'
import { Plus, Trash2, TrendingDown, Package } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

const TIPOS = [
  { value: 'vehiculo', label: 'Vehículo', depreciacion: 15 },
  { value: 'inmueble', label: 'Inmueble', depreciacion: -3 },
  { value: 'otro', label: 'Otro', depreciacion: 5 },
]

export default function Activos({ state, setState }) {
  const activos = state.activos || []

  const totalValor = activos.reduce((s, a) => s + Number(a.valorMercado || 0), 0)
  const totalDeuda = state.deudas.reduce((s, d) => s + d.saldo, 0)
  const patrimonioNeto = totalValor - totalDeuda

  // Proyección valor activos a 10 años
  const chartData = useMemo(() => {
    const puntos = []
    for (let ano = 0; ano <= 10; ano++) {
      const valorActivos = activos.reduce((s, a) => {
        const tipo = TIPOS.find(t => t.value === a.tipo) || TIPOS[2]
        return s + Number(a.valorMercado || 0) * Math.pow(1 - tipo.depreciacion / 100, ano)
      }, 0)
      puntos.push({ label: String(new Date().getFullYear() + ano), Activos: Math.round(valorActivos / 1e6) })
    }
    return puntos
  }, [activos])

  const addActivo = () => {
    const nuevo = { id: Date.now(), nombre: 'Nuevo activo', tipo: 'vehiculo', valorMercado: 0, anioCompra: new Date().getFullYear() }
    setState(p => ({ ...p, activos: [...(p.activos || []), nuevo] }))
  }

  const updateActivo = (id, field, val) => {
    setState(p => ({ ...p, activos: (p.activos || []).map(a => a.id === id ? { ...a, [field]: val } : a) }))
  }

  const removeActivo = (id) => {
    setState(p => ({ ...p, activos: (p.activos || []).filter(a => a.id !== id) }))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Valor activos hoy" value={fmtM(totalValor)} color="var(--accent)" sub="valor de mercado estimado" />
        <MetricCard label="Deuda total" value={fmtM(totalDeuda)} color="var(--red)" sub="capital pendiente" />
        <MetricCard label="Patrimonio neto real" value={fmtM(patrimonioNeto)} color={patrimonioNeto >= 0 ? 'var(--accent)' : 'var(--red)'} sub="activos menos deudas" />
      </div>

      {/* Lista editable de activos */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <SectionTitle>Activos físicos</SectionTitle>
          <Btn onClick={addActivo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Agregar activo
          </Btn>
        </div>

        {activos.length === 0 ? (
          <EmptyState icon={Package} title="Sin activos registrados" subtitle="Agrega vehículos, inmuebles u otros bienes" />
        ) : (
          activos.map(a => {
            const tipo = TIPOS.find(t => t.value === a.tipo) || TIPOS[2]
            const valorEn5 = Number(a.valorMercado || 0) * Math.pow(1 - tipo.depreciacion / 100, 5)
            return (
              <div key={a.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 110px 130px 110px auto',
                gap: 8, alignItems: 'center', padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <input
                  type="text" value={a.nombre}
                  onChange={e => updateActivo(a.id, 'nombre', e.target.value)}
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <select value={a.tipo} onChange={e => updateActivo(a.id, 'tipo', e.target.value)}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  type="number" value={a.valorMercado}
                  onChange={e => updateActivo(a.id, 'valorMercado', Number(e.target.value))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                  <div>En 5 años:</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: tipo.depreciacion > 0 ? 'var(--red)' : 'var(--accent)' }}>
                    {fmtM(valorEn5)}
                  </div>
                </div>
                <button onClick={() => removeActivo(a.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                  <Trash2 size={13} color="var(--red)" />
                </button>
              </div>
            )
          })
        )}

        {activos.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Total valor de mercado</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{fmt(totalValor)}</span>
          </div>
        )}
      </Card>

      {/* Proyección de depreciación */}
      {activos.length > 0 && (
        <Card>
          <SectionTitle>Proyección de valor — 10 años</SectionTitle>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradActivos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc266" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ffc266" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#5a5755', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => v + 'M'} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtM(v * 1e6), 'Valor activos']} />
                <Area type="monotone" dataKey="Activos" stroke="#ffc266" fill="url(#gradActivos)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--accent-dim2)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
            Vehículos deprecian ~15%/año. Inmuebles se valorizan ~3%/año (estimado mercado colombiano). El valor de mercado se usa en la proyección de patrimonio del Resumen.
          </div>
        </Card>
      )}
    </div>
  )
}
