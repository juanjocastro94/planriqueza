import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, MetricCard, SliderRow, SectionTitle, Btn, Badge, Field, EmptyState } from './UI'
import { proyectarUSDConLineas, fmtM, fmtUSD, fmt, inversionPlanMensual, inversionRealMensual, calcularCumplimiento, currentPeriod } from '../utils/calc'
import { Plus, Trash2, DollarSign } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

function emptyTx() { return { fecha: '', cop: '', trm: '', nota: '' } }
function emptyPlan() { return { mesOffset: 1, monto: '', nota: '' } }

export default function InversionUSD({ state, setState }) {
  const { inversion } = state
  const [aporte, setAporte] = useState(inversion.aporteMensualCOP / 1e6)
  const [trm, setTrm] = useState(inversion.trmActual)
  const [rend, setRend] = useState(inversion.rendimientoAnual)
  const [horizonte, setHorizonte] = useState(10)
  const [txForm, setTxForm] = useState(emptyTx())
  const [planForm, setPlanForm] = useState(emptyPlan())

  // Transacciones reales registradas (reemplaza capitalInicialUSD hardcodeado)
  const transacciones = inversion.transacciones || []

  // Capital real acumulado: suma USD de cada tx con su TRM real
  const capitalRealUSD = useMemo(() =>
    transacciones.reduce((s, t) => s + (Number(t.cop) / Number(t.trm)), 0),
    [transacciones]
  )
  const capitalRealCOP = useMemo(() =>
    transacciones.reduce((s, t) => s + Number(t.cop), 0),
    [transacciones]
  )
  const trmPromedio = capitalRealCOP > 0 ? capitalRealCOP / capitalRealUSD : inversion.trmActual
  const gananciaCambiaria = capitalRealUSD * (trm - trmPromedio)

  // Para proyección: usa capital real si hay txs, si no usa el inicial del state
  const capitalBase = capitalRealUSD > 0 ? capitalRealUSD : inversion.capitalInicialUSD

  // Proyección con las 3 líneas (base, plan, real)
  const inversionParaProyeccion = {
    ...inversion,
    capitalInicialUSD: capitalBase,
    trmActual: trm,
    rendimientoAnual: rend,
    aporteMensualCOP: aporte * 1e6,
  }
  const result = useMemo(() =>
    proyectarUSDConLineas(inversionParaProyeccion, horizonte),
    [capitalBase, aporte, trm, rend, horizonte, inversion.aportesPlanificados, inversion.aportesRealizados]
  )

  const chartData = result.puntos.map(p => ({ label: 'Año ' + p.ano, Base: p.Base, Plan: p.Plan, Real: p.Real }))
  const trmFutura = trm * Math.pow(1.03, horizonte)
  const planMes = inversionPlanMensual(inversion)
  const realMes = inversionRealMensual(inversion)
  const cumplimiento = calcularCumplimiento(planMes, realMes)

  const handleAporte = (v) => {
    setAporte(v)
    setState(p => ({ ...p, inversion: { ...p.inversion, aporteMensualCOP: v * 1e6 } }))
  }

  // Agregar transacción real con TRM
  const addTx = () => {
    if (!txForm.fecha || !txForm.cop || !txForm.trm) return
    const nueva = {
      id: Date.now(),
      fecha: txForm.fecha,
      cop: Number(txForm.cop),
      trm: Number(txForm.trm),
      usd: Number(txForm.cop) / Number(txForm.trm),
      nota: txForm.nota,
    }
    setState(p => ({ ...p, inversion: { ...p.inversion, transacciones: [...(p.inversion.transacciones || []), nueva] } }))
    setTxForm(emptyTx())
  }

  const removeTx = (id) => {
    setState(p => ({ ...p, inversion: { ...p.inversion, transacciones: (p.inversion.transacciones || []).filter(t => t.id !== id) } }))
  }

  // Aportes planificados (extras puntuales futuros)
  const appendPlan = () => {
    if (!planForm.monto) return
    setState(p => ({ ...p, inversion: { ...p.inversion, aportesPlanificados: [...(p.inversion.aportesPlanificados || []), { id: Date.now(), mesOffset: Number(planForm.mesOffset || 1), monto: Number(planForm.monto), nota: planForm.nota }] } }))
    setPlanForm(emptyPlan())
  }

  const removePlan = (id) => {
    setState(p => ({ ...p, inversion: { ...p.inversion, aportesPlanificados: (p.inversion.aportesPlanificados || []).filter(a => a.id !== id) } }))
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard
          label="Capital real USD"
          value={fmtUSD(Math.round(capitalRealUSD || inversion.capitalInicialUSD))}
          sub={transacciones.length > 0 ? `${transacciones.length} compras · TRM prom. ${Math.round(trmPromedio).toLocaleString()}` : 'sin compras registradas'}
        />
        <MetricCard label="Portafolio plan" value={fmtUSD(result.saldoFinalPlan)} color="var(--accent)" sub={`año ${horizonte}`} />
        <MetricCard label="Portafolio real proyectado" value={fmtUSD(result.saldoFinalReal)} color="var(--blue)" sub={`año ${horizonte}`} />
        <MetricCard
          label="Ganancia cambiaria"
          value={fmtM(gananciaCambiaria)}
          sub={`vs TRM ${trm.toLocaleString()}`}
          color={gananciaCambiaria >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
      </div>

      {/* Registro de compras con TRM real */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Compras de dólares — TRM real por transacción</SectionTitle>

        {/* Formulario */}
        <div style={{ display: 'grid', gridTemplateColumns: '150px 130px 110px 1fr auto', gap: 8, alignItems: 'flex-end', marginBottom: '1rem' }}>
          <Field label="Fecha">
            <input type="date" value={txForm.fecha} onChange={e => setTxForm(f => ({ ...f, fecha: e.target.value }))} style={{ fontFamily: 'var(--font-mono)' }} />
          </Field>
          <Field label="Monto COP">
            <input type="number" value={txForm.cop} onChange={e => setTxForm(f => ({ ...f, cop: e.target.value }))} placeholder="2000000" style={{ fontFamily: 'var(--font-mono)' }} />
          </Field>
          <Field label="TRM real">
            <input type="number" value={txForm.trm} onChange={e => setTxForm(f => ({ ...f, trm: e.target.value }))} placeholder="4100" style={{ fontFamily: 'var(--font-mono)' }} />
          </Field>
          <Field label="Plataforma / nota">
            <input type="text" value={txForm.nota} onChange={e => setTxForm(f => ({ ...f, nota: e.target.value }))} placeholder="Global66, Remitly..." />
          </Field>
          <Btn variant="accent" onClick={addTx} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Registrar
          </Btn>
        </div>

        {/* Preview USD antes de confirmar */}
        {txForm.cop && txForm.trm && Number(txForm.trm) > 0 && (
          <div style={{ background: 'var(--accent-dim2)', borderRadius: 6, padding: '8px 12px', marginBottom: '1rem', fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span>USD a recibir: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{fmtUSD(Math.round(Number(txForm.cop) / Number(txForm.trm)))}</strong></span>
            <span>vs TRM mercado {trm.toLocaleString()}: <strong style={{ color: Number(txForm.trm) <= trm ? 'var(--accent)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              {Number(txForm.trm) <= trm
                ? `▼ ${((1 - Number(txForm.trm) / trm) * 100).toFixed(1)}% más barato`
                : `▲ ${((Number(txForm.trm) / trm - 1) * 100).toFixed(1)}% más caro`}
            </strong></span>
          </div>
        )}

        {/* Lista de transacciones */}
        {transacciones.length === 0 ? (
          <EmptyState icon={DollarSign} title="Sin compras registradas" subtitle="Registra cada compra con su TRM real — el portafolio se construye desde tus transacciones" />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 110px 100px 90px 1fr auto', gap: 8, marginBottom: 6 }}>
              {['Fecha', 'COP', 'TRM real', 'USD', 'Nota', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {transacciones
              .slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
              .map(t => {
                const diferencial = trm > 0 ? ((trm - t.trm) / trm * 100).toFixed(1) : 0
                const gano = t.trm <= trm
                return (
                  <div key={t.id} style={{
                    display: 'grid', gridTemplateColumns: '110px 110px 100px 90px 1fr auto',
                    gap: 8, alignItems: 'center', padding: '6px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                      {new Date(t.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{fmt(t.cop)}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {Number(t.trm).toLocaleString()}
                      <span style={{ fontSize: 10, marginLeft: 4, color: gano ? 'var(--accent)' : 'var(--red)' }}>
                        {gano ? `▼${diferencial}%` : `▲${Math.abs(diferencial)}%`}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 500 }}>
                      {fmtUSD(Math.round(t.usd || t.cop / t.trm))}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.nota || '—'}</span>
                    <button onClick={() => removeTx(t.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                      <Trash2 size={13} color="var(--red)" />
                    </button>
                  </div>
                )
              })}

            {/* Totales */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 110px 100px 90px 1fr auto', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(capitalRealCOP)}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>~{Math.round(trmPromedio).toLocaleString()} prom.</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{fmtUSD(Math.round(capitalRealUSD))}</span>
              <span /><span />
            </div>
          </>
        )}
      </Card>

      {/* Proyección */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Proyección del portafolio</SectionTitle>
        <SliderRow label="Aporte mensual plan (M COP)" min={0.5} max={8} step={0.5} value={aporte} onChange={handleAporte} display={fmtM(aporte * 1e6) + '/mes'} />
        <SliderRow label="TRM de referencia (mercado)" min={3500} max={6500} step={50} value={trm} onChange={v => { setTrm(v); setState(p => ({ ...p, inversion: { ...p.inversion, trmActual: v } })) }} display={trm.toLocaleString() + ' COP/USD'} />
        <SliderRow label="Rendimiento anual estimado" min={4} max={15} step={0.5} value={rend} onChange={v => { setRend(v); setState(p => ({ ...p, inversion: { ...p.inversion, rendimientoAnual: v } })) }} display={rend + '%'} />
        <SliderRow label="Horizonte" min={3} max={20} step={1} value={horizonte} onChange={setHorizonte} display={horizonte + ' años'} />

        <div style={{ height: 260, marginTop: '0.5rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#5a5755', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => '$' + v.toLocaleString()} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtUSD(v), 'USD']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Base" stroke="#ff5c5c" strokeWidth={2} dot={false} name="Sin aportes nuevos" />
              <Line type="monotone" dataKey="Plan" stroke="#c8f060" strokeWidth={2} dot={false} name="Planificado" />
              <Line type="monotone" dataKey="Real" stroke="#5ca8ff" strokeWidth={2} dot={false} name="Real + promedio" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: '1rem' }}>
          <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '.9rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Plan año {horizonte}</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600, fontSize: 16 }}>{fmtUSD(result.saldoFinalPlan)}</div>
          </div>
          <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '.9rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>En COP (TRM futura ~{Math.round(trmFutura).toLocaleString()})</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: '#5ca8ff', fontWeight: 600, fontSize: 16 }}>{fmtM(result.saldoFinalPlan * trmFutura)}</div>
          </div>
          <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '.9rem', border: '1px solid rgba(200,240,96,0.2)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Cumplimiento mes actual</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: cumplimiento >= 100 ? 'var(--accent)' : 'var(--text)', fontWeight: 600, fontSize: 16 }}>{cumplimiento}%</div>
          </div>
        </div>
      </Card>

      {/* Aportes extraordinarios planificados */}
      <Card>
        <SectionTitle>Aportes extraordinarios planificados</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 140px 1fr auto', gap: 8, alignItems: 'flex-end', marginBottom: '1rem' }}>
          <Field label="Mes +n">
            <input type="number" value={planForm.mesOffset} onChange={e => setPlanForm(f => ({ ...f, mesOffset: e.target.value }))} style={{ fontFamily: 'var(--font-mono)' }} />
          </Field>
          <Field label="Monto COP">
            <input type="number" value={planForm.monto} onChange={e => setPlanForm(f => ({ ...f, monto: e.target.value }))} placeholder="5000000" style={{ fontFamily: 'var(--font-mono)' }} />
          </Field>
          <Field label="Nota">
            <input type="text" value={planForm.nota} onChange={e => setPlanForm(f => ({ ...f, nota: e.target.value }))} placeholder="Bono desempeño, prima..." />
          </Field>
          <Btn variant="accent" onClick={appendPlan} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Agregar
          </Btn>
        </div>

        {!(inversion.aportesPlanificados?.length) ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '0.5rem 0' }}>Sin aportes planificados.</div>
        ) : (
          inversion.aportesPlanificados.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Mes +{item.mesOffset} · {item.nota || 'sin nota'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(item.monto)}</span>
                <button onClick={() => removePlan(item.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5, display: 'flex' }}>
                  <Trash2 size={13} color="var(--red)" />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

