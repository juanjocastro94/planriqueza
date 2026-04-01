import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, SectionTitle, Field, Btn, MetricCard, Badge, Divider } from './UI'
import { fmt, fmtM, proyectarPatrimonioDesdeEstado, getMesAnio } from '../utils/calc'
import { Target, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

const PRESETS = [
  { label: '100M en 5 años', valor: 100e6, anio: new Date().getFullYear() + 5 },
  { label: '300M en 10 años', valor: 300e6, anio: new Date().getFullYear() + 10 },
  { label: '500M en 15 años', valor: 500e6, anio: new Date().getFullYear() + 15 },
  { label: '1.000M en 20 años', valor: 1000e6, anio: new Date().getFullYear() + 20 },
]

export default function Metas({ state, setState }) {
  const meta = state.meta || {}
  const [editValor, setEditValor] = useState(meta.valorCOP ? meta.valorCOP / 1e6 : '')
  const [editAnio, setEditAnio] = useState(meta.anio || new Date().getFullYear() + 10)

  const guardarMeta = () => {
    setState(p => ({ ...p, meta: { valorCOP: Number(editValor) * 1e6, anio: Number(editAnio) } }))
  }

  const borrarMeta = () => {
    setState(p => ({ ...p, meta: null }))
    setEditValor('')
    setEditAnio(new Date().getFullYear() + 10)
  }

  const anioHoy = new Date().getFullYear()
  const anos = meta.anio ? Math.max(5, meta.anio - anioHoy + 2) : 20

  const puntos = useMemo(() => proyectarPatrimonioDesdeEstado(state, anos), [state, anos])

  const metaLinea = meta.valorCOP ? meta.valorCOP / 1e6 : null

  // Cuándo cruza la meta
  const puntoCorte = metaLinea
    ? puntos.find(p => p.Plan >= metaLinea)
    : null

  const patrimonioHoy = puntos[0]?.Plan || 0
  const patrimonioEnMeta = meta.anio
    ? (puntos.find(p => Number(p.label) >= meta.anio)?.Plan || puntos[puntos.length - 1]?.Plan || 0)
    : 0
  const pctCumplimiento = metaLinea ? Math.round(patrimonioEnMeta / metaLinea * 100) : 0
  const mesesParaMeta = puntoCorte
    ? Math.max(0, (Number(puntoCorte.label) - anioHoy) * 12)
    : null

  // Cuánto aporte adicional mensual se necesita para alcanzar la meta en el año objetivo
  const aporteActual = state.inversion?.aporteMensualCOP || 0
  const excedente = useMemo(() => {
    const ded = state.deducciones.reduce((s, d) => s + d.valor, 0)
    const gst = state.gastos.reduce((s, g) => s + g.valor, 0)
    return state.salarioBruto - ded - gst
  }, [state])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Patrimonio hoy" value={fmtM(patrimonioHoy * 1e6)} color={patrimonioHoy >= 0 ? 'var(--accent)' : 'var(--red)'} sub="estimado actual" />
        <MetricCard
          label={meta.anio ? `Proyección ${meta.anio}` : 'Proyección año 10'}
          value={fmtM(patrimonioEnMeta * 1e6)}
          color="var(--blue)"
          sub="según plan actual"
        />
        {metaLinea && <MetricCard label="Cumplimiento meta" value={`${pctCumplimiento}%`} color={pctCumplimiento >= 100 ? 'var(--accent)' : pctCumplimiento >= 70 ? 'var(--amber)' : 'var(--red)'} sub={`meta: ${fmtM(metaLinea * 1e6)}`} />}
        {puntoCorte && <MetricCard label="Meta alcanzada en" value={puntoCorte.label} color="var(--accent)" sub={`${mesesParaMeta} meses desde hoy`} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12, marginBottom: '1rem' }}>
        {/* Config meta */}
        <Card>
          <SectionTitle>Configurar meta</SectionTitle>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
            <Field label="Patrimonio objetivo (M COP)">
              <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)} placeholder="500" style={{ fontFamily: 'var(--font-mono)' }} />
            </Field>
            <Field label="Año objetivo">
              <input type="number" value={editAnio} onChange={e => setEditAnio(e.target.value)} min={anioHoy + 1} max={anioHoy + 30} style={{ fontFamily: 'var(--font-mono)' }} />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="accent" onClick={guardarMeta} style={{ flex: 1, justifyContent: 'center' }}>
                <Target size={13} /> Guardar meta
              </Btn>
              {meta.valorCOP && (
                <Btn variant="danger" onClick={borrarMeta}>Quitar</Btn>
              )}
            </div>
          </div>

          <Divider />
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: '0.75rem', marginTop: '0.75rem' }}>Presets rápidos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => { setEditValor(p.valor / 1e6); setEditAnio(p.anio) }} style={{
                background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
                fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Estado vs meta */}
        <Card>
          <SectionTitle>¿Cómo vas?</SectionTitle>

          {!metaLinea ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Target size={32} style={{ opacity: 0.15, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Define una meta para ver el análisis</div>
            </div>
          ) : (
            <>
              {/* Veredicto */}
              {(() => {
                const ok = pctCumplimiento >= 100
                const warn = pctCumplimiento >= 70
                const Icon = ok ? CheckCircle : warn ? TrendingUp : AlertCircle
                const color = ok ? 'var(--accent)' : warn ? 'var(--amber)' : 'var(--red)'
                const bg = ok ? 'var(--accent-dim)' : warn ? 'var(--amber-dim)' : 'var(--red-dim)'
                const msg = ok
                  ? `En camino. El plan actual supera la meta en ${fmtM((patrimonioEnMeta - metaLinea) * 1e6)}.`
                  : warn
                    ? `Cerca. Llegas al ${pctCumplimiento}% de la meta en ${editAnio}. Un aporte adicional de ${fmtM(excedente * 0.1)}/mes puede cerrar la brecha.`
                    : `Brecha de ${fmtM((metaLinea - patrimonioEnMeta) * 1e6)}. Considera aumentar el aporte USD o reducir gastos.`

                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.9rem 1rem', borderRadius: 10, marginBottom: '1.25rem', background: bg, border: `1px solid ${color}30` }}>
                    <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{msg}</div>
                  </div>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meta</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16 }}>{fmtM(metaLinea * 1e6)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>año {editAnio}</div>
                </div>
                <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proyección en {editAnio}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: pctCumplimiento >= 100 ? 'var(--accent)' : 'var(--text)' }}>{fmtM(patrimonioEnMeta * 1e6)}</div>
                  <div style={{ fontSize: 10, color: pctCumplimiento >= 100 ? 'var(--accent)' : 'var(--red)', marginTop: 2 }}>{pctCumplimiento}% de la meta</div>
                </div>
                {puntoCorte && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Año que alcanzas meta</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: 'var(--accent)' }}>{puntoCorte.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{mesesParaMeta} meses desde hoy</div>
                  </div>
                )}
                <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aporte USD actual</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16 }}>{fmtM(aporteActual)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>/mes</div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Gráfico con línea de meta */}
      <Card>
        <SectionTitle>Proyección de patrimonio vs meta</SectionTitle>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Base (sin aportes)', color: '#ff5c5c' },
            { label: 'Plan actual', color: '#c8f060' },
            metaLinea && { label: 'Meta', color: '#ffc266' },
          ].filter(Boolean).map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ width: 10, height: l.label === 'Meta' ? 2 : 10, borderRadius: l.label === 'Meta' ? 0 : 2, background: l.color, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={puntos} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {[['r','#ff5c5c'],['g','#c8f060']].map(([k,c]) => (
                  <linearGradient key={k} id={'mg'+k} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#5a5755', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => v + 'M'} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtM(v * 1e6), n]} />
              {metaLinea && (
                <ReferenceLine y={metaLinea} stroke="#ffc266" strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `Meta ${fmtM(metaLinea * 1e6)}`, position: 'insideTopRight', fontSize: 10, fill: '#ffc266' }} />
              )}
              <Area type="monotone" dataKey="Base" name="Base" stroke="#ff5c5c" fill="url(#mgr)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="Plan" name="Plan actual" stroke="#c8f060" fill="url(#mgg)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
