import React, { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, MetricCard, SliderRow, SectionTitle, Btn, EmptyState, Field } from './UI'
import { amortizarHipoteca, getMesAnio, fmtM, fmt } from '../utils/calc'
import { Plus, Trash2, Zap } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

function buildExtrasMap(abonos) {
  const hoy = new Date()
  const map = {}
  ;(abonos || []).forEach(a => {
    if (!a.fecha || !a.monto) return
    const fecha = new Date(a.fecha)
    const mes = Math.max(1, Math.round((fecha - hoy) / (1000 * 60 * 60 * 24 * 30.44)))
    map[mes] = (map[mes] || 0) + a.monto
  })
  return map
}

export default function Hipoteca({ state, setState }) {
  // ── Busca hipoteca por categoría, no por id hardcodeado ──
  const hipoteca = state.deudas.find(d => d.categoria === 'hipotecario')
    || state.deudas.find(d => d.nombre?.toLowerCase().includes('hipoteca'))

  const abonoMensualGuardado = hipoteca?.abonoMensualPlan || state.estrategia?.abonoHipotecaMensual || 0
  const [abono, setAbono] = useState(abonoMensualGuardado / 1e6)
  // Sync slider if external state changes (e.g. user edits in Deudas tab)
  React.useEffect(() => {
    setAbono((hipoteca?.abonoMensualPlan || 0) / 1e6)
  }, [hipoteca?.id, hipoteca?.abonoMensualPlan])

  const abonosExtra = state.abonosHipoteca || []
  const [formFecha, setFormFecha] = useState('')
  const [formMonto, setFormMonto] = useState('')
  const [formNota, setFormNota] = useState('')

  const extrasMap = useMemo(() => buildExtrasMap(abonosExtra), [abonosExtra])
  const totalExtras = abonosExtra.reduce((s, a) => s + (a.monto || 0), 0)

  const sinAbono = useMemo(() => {
    if (!hipoteca) return { meses: 0, interesesTotal: 0, tabla: [] }
    return amortizarHipoteca(hipoteca.saldo, hipoteca.tasaEA || hipoteca.tasaValor, hipoteca.cuotaMensual, 0, {})
  }, [hipoteca])

  const conAbono = useMemo(() => {
    if (!hipoteca) return { meses: 0, interesesTotal: 0, tabla: [] }
    return amortizarHipoteca(hipoteca.saldo, hipoteca.tasaEA || hipoteca.tasaValor, hipoteca.cuotaMensual, abono * 1e6, extrasMap)
  }, [hipoteca, abono, extrasMap])

  if (!hipoteca) {
    return (
      <Card>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No hay ninguna deuda marcada como "Hipotecario". Ve a la pestaña Deudas y asigna la categoría correcta.
        </div>
      </Card>
    )
  }

  const anosAhorrados = ((sinAbono.meses - conAbono.meses) / 12).toFixed(1)
  const ahorroInt = sinAbono.interesesTotal - conAbono.interesesTotal

  const chartData = useMemo(() => {
    const maxMeses = Math.max(sinAbono.tabla.length, conAbono.tabla.length)
    const puntos = []
    for (let i = 0; i < maxMeses; i += 12) {
      puntos.push({
        label: 'Año ' + (Math.floor(i / 12) + 1),
        'Sin abono': Math.round((sinAbono.tabla[i]?.saldo || 0) / 1e6),
        'Con abono + extras': Math.round((conAbono.tabla[i]?.saldo || 0) / 1e6),
      })
    }
    return puntos
  }, [sinAbono, conAbono])

  const handleAbonoChange = (v) => {
    setAbono(v)
    // Actualiza abonoMensualPlan en la deuda y en estrategia
    setState(p => ({
      ...p,
      deudas: p.deudas.map(d =>
        d.id === hipoteca.id ? { ...d, abonoMensualPlan: v * 1e6 } : d
      ),
      estrategia: { ...p.estrategia, abonoHipotecaMensual: v * 1e6 },
    }))
  }

  const addAbono = () => {
    if (!formFecha || !formMonto) return
    setState(p => ({
      ...p,
      abonosHipoteca: [...(p.abonosHipoteca || []), {
        id: Date.now(), fecha: formFecha, monto: Number(formMonto), nota: formNota,
      }],
    }))
    setFormFecha(''); setFormMonto(''); setFormNota('')
  }

  const removeAbono = (id) => {
    setState(p => ({ ...p, abonosHipoteca: (p.abonosHipoteca || []).filter(a => a.id !== id) }))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Saldo actual" value={fmtM(hipoteca.saldo)} color="var(--red)" />
        <MetricCard label="Sin abonos — fin" value={getMesAnio(sinAbono.meses)} color="var(--red)" />
        <MetricCard label="Con abonos — fin" value={getMesAnio(conAbono.meses)} color="var(--accent)" />
        <MetricCard label="Años ahorrados" value={anosAhorrados + ' años'} color="var(--accent)" />
      </div>

      {/* Slider abono mensual */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Abono mensual fijo a capital</SectionTitle>
        <SliderRow
          label="Abono mensual adicional"
          min={0} max={10} step={0.5}
          value={abono}
          onChange={handleAbonoChange}
          display={fmtM(abono * 1e6) + '/mes'}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { label: 'Intereses sin abono', value: fmtM(sinAbono.interesesTotal), color: 'var(--red)', border: 'rgba(255,92,92,0.2)' },
            { label: 'Intereses con todo', value: fmtM(conAbono.interesesTotal), color: 'var(--accent)', border: 'rgba(200,240,96,0.2)' },
            { label: 'Ahorro total', value: '+' + fmtM(ahorroInt), color: 'var(--accent)', border: 'rgba(200,240,96,0.3)', bg: 'var(--accent-dim)' },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg || 'var(--bg-3)', borderRadius: 8, padding: '1rem', border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', color: c.color, fontWeight: 600, fontSize: 15 }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                {[['Red','#ff5c5c'],['Green','#c8f060']].map(([k,c]) => (
                  <linearGradient key={k} id={'grad'+k} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#5a5755', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => v + 'M'} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtM(v * 1e6), '']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Sin abono" stroke="#ff5c5c" fill="url(#gradRed)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Con abono + extras" stroke="#c8f060" fill="url(#gradGreen)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Abonos extraordinarios */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <SectionTitle>Abonos extraordinarios — bonos, primas, extras</SectionTitle>
          {totalExtras > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              <Zap size={13} />{fmtM(totalExtras)} planificados
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 1fr auto', gap: 8, alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Fecha del abono</div>
            <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Monto COP</div>
            <input type="number" value={formMonto} onChange={e => setFormMonto(e.target.value)} placeholder="5000000" style={{ fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Concepto</div>
            <input type="text" value={formNota} onChange={e => setFormNota(e.target.value)} placeholder="Prima junio, bono desempeño..." />
          </div>
          <Btn variant="accent" onClick={addAbono} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Agregar
          </Btn>
        </div>

        {abonosExtra.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            Agrega bonos, primas o cualquier pago puntual a capital. El simulador los incorpora en la proyección.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px auto', gap: 8, marginBottom: 6 }}>
              {['Fecha', 'Concepto', 'Monto', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {abonosExtra.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(a => {
              const hoy = new Date()
              const fecha = new Date(a.fecha)
              const mesesRest = Math.max(0, Math.round((fecha - hoy) / (1000 * 60 * 60 * 24 * 30.44)))
              const pasado = fecha < hoy
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px auto', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', opacity: pasado ? 0.45 : 1 }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                    {fecha.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>{pasado ? '(pasado)' : `en ${mesesRest}m`}</span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{a.nota || '—'}</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 500 }}>{fmt(a.monto)}</span>
                  <button onClick={() => removeAbono(a.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                    <Trash2 size={13} color="var(--red)" />
                  </button>
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Total abonos extraordinarios</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{fmt(totalExtras)}</span>
            </div>
          </>
        )}
      </Card>

      {/* Detalle */}
      <Card>
        <SectionTitle>Detalle — {hipoteca.nombre}</SectionTitle>
        {[
          ['Tasa', (hipoteca.tasaEA || hipoteca.tasaValor) + '% EA'],
          ['Plazo original', hipoteca.plazoMeses + ' meses'],
          ['Meses restantes', (hipoteca.mesesRestantes || hipoteca.plazoMeses) + ' meses'],
          ['Cuota base mensual', fmt(hipoteca.cuotaMensual)],
          ['Abono mensual fijo', fmt(abono * 1e6)],
          ['Abonos extraordinarios', abonosExtra.length + ' · ' + fmt(totalExtras)],
          ['Nueva fecha cancelación', getMesAnio(conAbono.meses)],
        ].map(([l, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 6 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{l}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: i === 6 ? 'var(--accent)' : 'var(--text)' }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--accent-dim2)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
          Al {hipoteca.tasaEA || hipoteca.tasaValor}% EA, cada $1M abonado hoy a capital evita ~${(1 * Math.pow(1 + (hipoteca.tasaEA || hipoteca.tasaValor) / 100, (hipoteca.mesesRestantes || hipoteca.plazoMeses) / 12) - 1).toFixed(1)}M en intereses futuros.
        </div>
      </Card>
    </div>
  )
}
