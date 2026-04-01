import React, { useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Card, Btn, MetricCard, SectionTitle, Badge, Field, EmptyState } from './UI'
import { fmt, fmtM, generarProyeccionDeuda, deudaPlanMensual, deudaRealMensual, calcularCumplimiento, currentPeriod, amortizarHipoteca, getMesAnio } from '../utils/calc'
import { Plus, Trash2 } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

const CATEGORIAS = [
  { value: 'libre-destino', label: 'Libre destino' },
  { value: 'hipotecario', label: 'Hipotecario' },
  { value: 'vehiculo', label: 'Vehículo' },
]

function emptyEventoReal() {
  return { periodo: currentPeriod(), monto: '', nota: '' }
}
function emptyEventoPlan() {
  return { mesOffset: 1, monto: '', nota: '' }
}

export default function Deudas({ state, setState }) {
  const [selectedId, setSelectedId] = useState(state.deudas[0]?.id)
  const [planForm, setPlanForm] = useState(emptyEventoPlan())
  const [abonoRealForm, setAbonoRealForm] = useState(emptyEventoReal())
  const [cuotaRealForm, setCuotaRealForm] = useState(emptyEventoReal())
  const [cargoRealForm, setCargoRealForm] = useState(emptyEventoReal())

  const deudas = state.deudas
  const deuda = deudas.find(d => d.id === selectedId) || deudas[0]
  const totalCuotasNomina = deudas.filter(d => d.descontadoNomina).reduce((s, d) => s + d.cuotaMensual, 0)
  const totalSaldo = deudas.reduce((s, d) => s + d.saldo, 0)
  const totalAbonoPlan = deudas.reduce((s, d) => s + (d.abonoMensualPlan || 0), 0)

  const chartData = useMemo(() => {
    if (!deuda) return []
    const base = generarProyeccionDeuda(deuda, 'base', Math.min(180, deuda.mesesRestantes + 12))
    const plan = generarProyeccionDeuda(deuda, 'plan', Math.min(180, deuda.mesesRestantes + 12))
    const real = generarProyeccionDeuda(deuda, 'real', Math.min(180, deuda.mesesRestantes + 12))
    const max = Math.max(base.length, plan.length, real.length)
    return Array.from({ length: max }).map((_, i) => ({
      mes: i,
      label: `M${i}`,
      Base: Math.round((base[i]?.saldo ?? base[base.length - 1]?.saldo ?? 0) / 1e6),
      Plan: Math.round((plan[i]?.saldo ?? plan[plan.length - 1]?.saldo ?? 0) / 1e6),
      Real: Math.round((real[i]?.saldo ?? real[real.length - 1]?.saldo ?? 0) / 1e6),
    }))
  }, [deuda])

  const realMes = deuda ? deudaRealMensual(deuda) : { cuota: 0, capital: 0, cargos: 0, total: 0 }
  const planMes = deuda ? deudaPlanMensual(deuda) : 0
  const cumplimiento = calcularCumplimiento(planMes, realMes.total)
  const avgReal = deuda?.abonosRealizados?.length
    ? Math.round(deuda.abonosRealizados.reduce((s, a) => s + Number(a.monto || 0), 0) / deuda.abonosRealizados.length)
    : 0

  // Impacto en plazo: sin abonos vs con abono mensual plan + abonos reales
  const impactoPlazo = useMemo(() => {
    if (!deuda || !deuda.tasaEA || !deuda.cuotaMensual || !deuda.saldo) return null
    const sinAbono = amortizarHipoteca(deuda.saldo, deuda.tasaEA, deuda.cuotaMensual, 0, {})
    const totalAbonosMensuales = (deuda.abonoMensualPlan || 0) + avgReal
    const conAbono = amortizarHipoteca(deuda.saldo, deuda.tasaEA, deuda.cuotaMensual, totalAbonosMensuales, {})
    const mesesAhorrados = sinAbono.meses - conAbono.meses
    const interesesAhorrados = sinAbono.interesesTotal - conAbono.interesesTotal
    return {
      sinAbono: sinAbono.meses,
      conAbono: conAbono.meses,
      mesesAhorrados,
      interesesAhorrados,
      finSin: getMesAnio(sinAbono.meses),
      finCon: getMesAnio(conAbono.meses),
    }
  }, [deuda, avgReal])

  const updateDeuda = (field, value) => {
    setState(prev => ({
      ...prev,
      deudas: prev.deudas.map(d => d.id === deuda.id ? { ...d, [field]: value } : d),
    }))
  }

  const addCredit = () => {
    const id = Date.now()
    setState(prev => ({
      ...prev,
      deudas: [...prev.deudas, {
        id,
        nombre: `Nuevo crédito ${prev.deudas.length + 1}`,
        categoria: 'libre-destino',
        saldo: 0,
        tasaTipo: 'ea',
        tasaValor: 0,
        plazoMeses: 60,
        fechaDesembolso: '2026-03-01',
        residualPct: 0,
        descontadoNomina: false,
        color: '#a78bfa',
        abonoMensualPlan: 0,
        abonosPlanificados: [],
        abonosRealizados: [],
        pagosCuotaRealizados: [],
        otrosCargosRealizados: [],
      }],
    }))
    setSelectedId(id)
  }

  const removeDebt = (id) => {
    const next = deudas.filter(d => d.id !== id)
    setState(prev => ({ ...prev, deudas: next }))
    setSelectedId(next[0]?.id)
  }

  const appendToDebt = (key, payload) => {
    setState(prev => ({
      ...prev,
      deudas: prev.deudas.map(d => d.id === deuda.id ? { ...d, [key]: [...(d[key] || []), { id: Date.now(), ...payload }] } : d),
    }))
  }

  const removeFromDebt = (key, id) => {
    setState(prev => ({
      ...prev,
      deudas: prev.deudas.map(d => d.id === deuda.id ? { ...d, [key]: (d[key] || []).filter(a => a.id !== id) } : d),
    }))
  }

  if (!deuda) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Saldo total deudas" value={fmtM(totalSaldo)} color="var(--red)" />
        <MetricCard label="Cuotas desde nómina" value={fmtM(totalCuotasNomina)} sub="derivado desde deudas" />
        <MetricCard label="Abono mensual plan" value={fmtM(totalAbonoPlan)} color="var(--accent)" />
        <MetricCard label="Promedio abonos reales" value={fmtM(avgReal)} color="var(--blue)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {deudas.map(d => (
          <button key={d.id} onClick={() => setSelectedId(d.id)} style={{
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${selectedId === d.id ? d.color : 'var(--border)'}`,
            background: selectedId === d.id ? `${d.color}22` : 'var(--bg-3)',
            color: selectedId === d.id ? 'var(--text)' : 'var(--text-2)',
          }}>{d.nombre}</button>
        ))}
        <Btn onClick={addCredit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> Agregar crédito</Btn>
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <SectionTitle>{deuda.nombre}</SectionTitle>
          <Btn variant="danger" onClick={() => removeDebt(deuda.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={13} /> Eliminar crédito
          </Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Field label="Nombre"><input type="text" value={deuda.nombre} onChange={e => updateDeuda('nombre', e.target.value)} /></Field>
          <Field label="Categoría">
            <select value={deuda.categoria} onChange={e => updateDeuda('categoria', e.target.value)}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Saldo actual"><input type="number" value={deuda.saldo} onChange={e => updateDeuda('saldo', Number(e.target.value || 0))} /></Field>
          <Field label="Fecha desembolso"><input type="date" value={deuda.fechaDesembolso} onChange={e => updateDeuda('fechaDesembolso', e.target.value)} /></Field>
          <Field label="Tipo tasa">
            <select value={deuda.tasaTipo} onChange={e => updateDeuda('tasaTipo', e.target.value)}>
              <option value="ea">EA</option>
              <option value="nmv">NMV</option>
            </select>
          </Field>
          <Field label={`Tasa ${deuda.tasaTipo.toUpperCase()} %`}><input type="number" value={deuda.tasaValor} onChange={e => updateDeuda('tasaValor', Number(e.target.value || 0))} /></Field>
          <Field label="Plazo total meses"><input type="number" value={deuda.plazoMeses} onChange={e => updateDeuda('plazoMeses', Number(e.target.value || 0))} /></Field>
          <Field label="Residual / globo %"><input type="number" value={deuda.residualPct || 0} onChange={e => updateDeuda('residualPct', Number(e.target.value || 0))} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
          <MetricCard label="Meses restantes" value={String(deuda.mesesRestantes)} small />
          <MetricCard label="Cuota calculada" value={fmt(deuda.cuotaMensual)} color="var(--accent)" small />
          <MetricCard label="Globo estimado" value={fmt(deuda.globo || 0)} small />
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nómina</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-2)' }}>
              <input type="checkbox" checked={deuda.descontadoNomina} onChange={e => updateDeuda('descontadoNomina', e.target.checked)} style={{ width: 'auto' }} />
              Descontado por nómina
            </label>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 12, marginBottom: '1rem' }}>
        <Card>
          <SectionTitle>Curva de saldo</SectionTitle>
          <div style={{ height: 290 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt((v || 0) * 1e6), 'Saldo']} />
                <Legend />
                <Line type="monotone" dataKey="Base" stroke="#ff5c5c" strokeWidth={2} dot={false} name="Sin abonos" />
                <Line type="monotone" dataKey="Plan" stroke="#c8f060" strokeWidth={2} dot={false} name="Planificado" />
                <Line type="monotone" dataKey="Real" stroke="#5ca8ff" strokeWidth={2} dot={false} name="Real + promedio" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle>Plan vs real del mes</SectionTitle>
          <Row label="Plan total del crédito" value={fmt(planMes)} />
          <Row label="Cuota real registrada" value={fmt(realMes.cuota)} />
          <Row label="Abono real a capital" value={fmt(realMes.capital)} />
          <Row label="Otros cargos reales" value={fmt(realMes.cargos)} />
          <Row label="Total real del mes" value={fmt(realMes.total)} />
          <div style={{ marginTop: 12 }}><Badge color={cumplimiento >= 100 ? 'green' : cumplimiento >= 70 ? 'amber' : 'red'}>{cumplimiento}% cumplimiento</Badge></div>
        </Card>
      </div>

      {/* Impacto en plazo */}
      {impactoPlazo && (
        <Card style={{ marginBottom: '1rem' }}>
          <SectionTitle>Impacto de los abonos en el plazo</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
            <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.9rem' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sin abonos — fin</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: 'var(--red)' }}>{impactoPlazo.finSin}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{impactoPlazo.sinAbono} meses</div>
            </div>
            <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.9rem', border: '1px solid rgba(200,240,96,0.2)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Con abonos — fin</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: 'var(--accent)' }}>{impactoPlazo.finCon}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{impactoPlazo.conAbono} meses</div>
            </div>
            <div style={{ background: impactoPlazo.mesesAhorrados > 0 ? 'var(--accent-dim)' : 'var(--bg-3)', borderRadius: 8, padding: '0.9rem', border: impactoPlazo.mesesAhorrados > 0 ? '1px solid rgba(200,240,96,0.3)' : '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meses ahorrados</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: impactoPlazo.mesesAhorrados > 0 ? 'var(--accent)' : 'var(--text-3)' }}>
                {impactoPlazo.mesesAhorrados > 0 ? `−${impactoPlazo.mesesAhorrados} meses` : 'Sin impacto'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                {impactoPlazo.mesesAhorrados > 0 ? `≈ ${(impactoPlazo.mesesAhorrados / 12).toFixed(1)} años` : 'Agrega abonos'}
              </div>
            </div>
            <div style={{ background: impactoPlazo.interesesAhorrados > 0 ? 'var(--accent-dim)' : 'var(--bg-3)', borderRadius: 8, padding: '0.9rem', border: impactoPlazo.interesesAhorrados > 0 ? '1px solid rgba(200,240,96,0.3)' : '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Intereses ahorrados</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: impactoPlazo.interesesAhorrados > 0 ? 'var(--accent)' : 'var(--text-3)' }}>
                {impactoPlazo.interesesAhorrados > 0 ? fmt(impactoPlazo.interesesAhorrados) : '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>vs pago sin abonos</div>
            </div>
          </div>
          {(deuda.abonoMensualPlan > 0 || avgReal > 0) && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7, padding: '0.6rem 0.75rem', background: 'var(--bg-3)', borderRadius: 8 }}>
              Abono mensual plan: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmt(deuda.abonoMensualPlan || 0)}</span>
              {avgReal > 0 && <> · Promedio abonos reales: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt(avgReal)}</span></>}
              · Total: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt((deuda.abonoMensualPlan || 0) + avgReal)}/mes</span>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: '1rem' }}>
        <Card>
          <SectionTitle>Plan del crédito</SectionTitle>
          <Field label="Abono mensual planeado a capital"><input type="number" value={deuda.abonoMensualPlan || 0} onChange={e => updateDeuda('abonoMensualPlan', Number(e.target.value || 0))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 140px 1fr auto', gap: 8, marginTop: 12, alignItems: 'end' }}>
            <Field label="Mes +n"><input type="number" value={planForm.mesOffset} onChange={e => setPlanForm(f => ({ ...f, mesOffset: e.target.value }))} /></Field>
            <Field label="Monto"><input type="number" value={planForm.monto} onChange={e => setPlanForm(f => ({ ...f, monto: e.target.value }))} /></Field>
            <Field label="Nota"><input type="text" value={planForm.nota} onChange={e => setPlanForm(f => ({ ...f, nota: e.target.value }))} placeholder="Bono, prima, extra" /></Field>
            <Btn onClick={() => {
              if (!planForm.monto) return
              appendToDebt('abonosPlanificados', { monto: Number(planForm.monto || 0), mesOffset: Number(planForm.mesOffset || 1), nota: planForm.nota || '' })
              setPlanForm(emptyEventoPlan())
            }}>Agregar</Btn>
          </div>
          <ListItems items={deuda.abonosPlanificados} onRemove={(id) => removeFromDebt('abonosPlanificados', id)} renderLabel={(item) => `M+${item.mesOffset} · ${item.nota || 'sin nota'}`} />
        </Card>

        <Card>
          <SectionTitle>Ejecución real</SectionTitle>
          <div style={{ display: 'grid', gap: 12 }}>
            <RealEntryBlock title="Pago de cuota realizado" form={cuotaRealForm} setForm={setCuotaRealForm} onAdd={() => {
              if (!cuotaRealForm.monto) return
              appendToDebt('pagosCuotaRealizados', { periodo: cuotaRealForm.periodo, monto: Number(cuotaRealForm.monto || 0), nota: cuotaRealForm.nota || '' })
              setCuotaRealForm(emptyEventoReal())
            }} />
            <RealEntryBlock title="Abono a capital realizado" form={abonoRealForm} setForm={setAbonoRealForm} onAdd={() => {
              if (!abonoRealForm.monto) return
              appendToDebt('abonosRealizados', { periodo: abonoRealForm.periodo, monto: Number(abonoRealForm.monto || 0), nota: abonoRealForm.nota || '' })
              setAbonoRealForm(emptyEventoReal())
            }} />
            <RealEntryBlock title="Cargo extra del crédito" form={cargoRealForm} setForm={setCargoRealForm} onAdd={() => {
              if (!cargoRealForm.monto) return
              appendToDebt('otrosCargosRealizados', { periodo: cargoRealForm.periodo, monto: Number(cargoRealForm.monto || 0), nota: cargoRealForm.nota || '' })
              setCargoRealForm(emptyEventoReal())
            }} />
          </div>
          <div style={{ marginTop: 14 }}>
            <ListItems title="Cuotas reales" items={deuda.pagosCuotaRealizados} onRemove={(id) => removeFromDebt('pagosCuotaRealizados', id)} renderLabel={(item) => `${item.periodo} · ${item.nota || 'cuota'}`} />
            <ListItems title="Abonos reales" items={deuda.abonosRealizados} onRemove={(id) => removeFromDebt('abonosRealizados', id)} renderLabel={(item) => `${item.periodo} · ${item.nota || 'capital'}`} />
            <ListItems title="Otros cargos" items={deuda.otrosCargosRealizados} onRemove={(id) => removeFromDebt('otrosCargosRealizados', id)} renderLabel={(item) => `${item.periodo} · ${item.nota || 'cargo'}`} />
          </div>
        </Card>
      </div>
    </div>
  )
}


function Row({ label, value }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span></div>
}

function RealEntryBlock({ title, form, setForm, onAdd }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '130px 140px 1fr auto', gap: 8, alignItems: 'end' }}>
        <Field label="Periodo"><input type="month" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} /></Field>
        <Field label="Monto"><input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></Field>
        <Field label="Nota"><input type="text" value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="opcional" /></Field>
        <Btn onClick={onAdd}>Agregar</Btn>
      </div>
    </div>
  )
}

function ListItems({ title, items = [], onRemove, renderLabel }) {
  if (!items.length) return title ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>{title}: sin registros</div> : null
  return (
    <div style={{ marginTop: 10 }}>
      {title && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{title}</div>}
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{renderLabel(item)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(item.monto)}</span>
            <button onClick={() => onRemove(item.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={13} color="var(--red)" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}
