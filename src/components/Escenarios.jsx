import React, { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, SectionTitle, MetricCard, SliderRow } from './UI'
import { proyectarPatrimonioDesdeEstado, fmtM, fmt } from '../utils/calc'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

export default function Escenarios({ state }) {
  // Escenarios derivados del estado real, no hardcodeados
  const hipoteca = state.deudas.find(d => d.categoria === 'hipotecario')
  const abonoActual = hipoteca?.abonoMensualPlan || 0
  const aporteActual = state.inversion.aporteMensualCOP || 0
  const excedente = (state.salarioBruto - state.deducciones.reduce((s,d) => s+d.valor, 0))
                  - state.gastos.reduce((s,g) => s+g.valor, 0)

  // Sliders para customizar escenario libre
  const [abonoCustom, setAbonoCustom] = useState(abonoActual / 1e6)
  const [aporteCustom, setAporteCustom] = useState(aporteActual / 1e6)

  const ESCENARIOS = useMemo(() => [
    {
      id: 'a',
      nombre: 'Todo a hipoteca',
      desc: `${fmtM(excedente > 0 ? excedente * 0.9 : 5e6)}/mes solo a capital hipoteca`,
      abonoHipoteca: excedente > 0 ? excedente * 0.9 : 5000000,
      aporteUSD: 0,
      color: '#ff5c5c',
    },
    {
      id: 'b',
      nombre: 'Estrategia actual',
      desc: `${fmtM(abonoActual)} hipoteca + ${fmtM(aporteActual)} USD`,
      abonoHipoteca: abonoActual,
      aporteUSD: aporteActual,
      color: '#c8f060',
    },
    {
      id: 'c',
      nombre: 'Todo a USD',
      desc: `${fmtM(excedente > 0 ? excedente * 0.9 : 5e6)}/mes solo a USD`,
      abonoHipoteca: 0,
      aporteUSD: excedente > 0 ? excedente * 0.9 : 5000000,
      color: '#5ca8ff',
    },
    {
      id: 'd',
      nombre: 'Personalizado',
      desc: `${fmtM(abonoCustom * 1e6)} hipoteca + ${fmtM(aporteCustom * 1e6)} USD`,
      abonoHipoteca: abonoCustom * 1e6,
      aporteUSD: aporteCustom * 1e6,
      color: '#ffc266',
    },
  ], [abonoActual, aporteActual, excedente, abonoCustom, aporteCustom])

  const datos = useMemo(() => {
    const resultados = ESCENARIOS.map(e => ({
      ...e,
      puntos: proyectarPatrimonioDesdeEstado({
        ...state,
        inversion: { ...state.inversion, aporteMensualCOP: e.aporteUSD },
        deudas: state.deudas.map(d =>
          d.categoria === 'hipotecario' ? { ...d, abonoMensualPlan: e.abonoHipoteca } : d
        ),
      }, 20),
    }))

    const maxLen = Math.max(...resultados.map(r => r.puntos.length))
    const merged = []
    for (let i = 0; i < maxLen; i++) {
      const punto = { label: resultados[0].puntos[i]?.label || '' }
      resultados.forEach(r => { punto[r.nombre] = r.puntos[i]?.Plan || null })
      merged.push(punto)
    }
    return { merged, resultados }
  }, [ESCENARIOS, state])

  const año10 = datos.resultados.map(r => ({
    nombre: r.nombre, valor: r.puntos[10]?.Plan || 0, color: r.color,
  }))
  const año20 = datos.resultados.map(r => ({
    nombre: r.nombre, valor: r.puntos[19]?.Plan || r.puntos[r.puntos.length - 1]?.Plan || 0, color: r.color,
  }))

  return (
    <div>
      {/* Cards escenarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        {ESCENARIOS.map(e => (
          <div key={e.id} style={{
            background: 'var(--bg-3)', border: `1px solid ${e.color}30`,
            borderRadius: 'var(--border-radius-lg, 12px)', padding: '1rem',
            borderTop: `3px solid ${e.color}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: e.color, marginBottom: 4 }}>{e.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>{e.desc}</div>
          </div>
        ))}
      </div>

      {/* Escenario personalizado */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Ajustar escenario personalizado</SectionTitle>
        <SliderRow
          label="Abono mensual hipoteca"
          min={0} max={10} step={0.5}
          value={abonoCustom}
          onChange={setAbonoCustom}
          display={fmtM(abonoCustom * 1e6) + '/mes'}
        />
        <SliderRow
          label="Aporte mensual USD"
          min={0} max={10} step={0.5}
          value={aporteCustom}
          onChange={setAporteCustom}
          display={fmtM(aporteCustom * 1e6) + '/mes'}
        />
        <div style={{ fontSize: 12, color: abonoCustom * 1e6 + aporteCustom * 1e6 > excedente ? 'var(--red)' : 'var(--text-3)', marginTop: 4 }}>
          {abonoCustom * 1e6 + aporteCustom * 1e6 > excedente
            ? `⚠ Supera el excedente disponible de ${fmtM(excedente)}`
            : `Excedente disponible: ${fmtM(excedente)} · Asignado: ${fmtM((abonoCustom + aporteCustom) * 1e6)}`}
        </div>
      </Card>

      {/* Gráfico comparativo */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Patrimonio neto proyectado — 20 años (M COP)</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          {ESCENARIOS.map(e => (
            <span key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: e.color, display: 'inline-block' }} />
              {e.nombre}
            </span>
          ))}
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos.merged} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#5a5755', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => v + 'M'} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtM(v * 1e6), n]} />
              {ESCENARIOS.map(e => (
                <Line key={e.id} type="monotone" dataKey={e.nombre} stroke={e.color} strokeWidth={e.id === 'b' ? 2.5 : 1.5} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Comparativa año 10 y 20 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[{ label: 'Año 10', data: año10 }, { label: 'Año 20', data: año20 }].map(({ label, data }) => (
          <Card key={label}>
            <SectionTitle>Patrimonio en {label}</SectionTitle>
            {data.map(a => (
              <div key={a.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{a.nombre}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: a.valor >= 0 ? a.color : 'var(--red)', fontWeight: 500 }}>
                  {a.valor >= 0 ? '+' : ''}{fmtM(a.valor * 1e6)}
                </span>
              </div>
            ))}
          </Card>
        ))}
      </div>

      <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--accent-dim2)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        Los escenarios usan tu situación real actual: deudas vigentes, tasas, saldos, capital USD registrado y crecimiento salarial configurado. La estrategia mixta (verde) equilibra reducción de deuda cara con cobertura cambiaria. El escenario personalizado te permite simular cualquier combinación.
      </div>
    </div>
  )
}
