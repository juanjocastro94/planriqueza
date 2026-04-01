import React, { useMemo, useState } from 'react'
import { Card, SectionTitle, Btn, MetricCard, Field } from './UI'
import { fmt, fmtM, proyectarSalario } from '../utils/calc'
import { Plus, Trash2, ArrowDownToLine, TrendingUp } from 'lucide-react'

function emptyRegistro() {
  return {
    id: Date.now(),
    periodo: '',
    salarioBruto: 0,
    salud: 0,
    pension: 0,
    solidaridad: 0,
    retencion: 0,
    otrosDescuentos: 0,
    bonos: 0,
    nota: '',
  }
}

export default function Ingresos({ state, setState }) {
  const [draft, setDraft] = useState(emptyRegistro())
  const [edicionAno, setEdicionAno] = useState(2026)
  const [edicionCambioReal, setEdicionCambioReal] = useState(state.ingresos.cambiosRealesPorAno?.[2026] ?? 0)

  const registros = useMemo(
    () => [...state.ingresos.registros].sort((a, b) => (b.periodo || '').localeCompare(a.periodo || '')),
    [state.ingresos.registros]
  )

  const latest = state.latestIngreso
  const totalDeduccionesBase = Number(latest.salud || 0) + Number(latest.pension || 0) + Number(latest.solidaridad || 0) + Number(latest.retencion || 0) + Number(latest.otrosDescuentos || 0)
  const netoAntesDeudas = Number(latest.salarioBruto || 0) - totalDeduccionesBase

  const addRegistro = () => {
    if (!draft.periodo) return
    setState(prev => ({
      ...prev,
      ingresos: {
        ...prev.ingresos,
        registros: [
          ...prev.ingresos.registros.filter(r => r.id !== draft.id),
          { ...draft, salarioBruto: Number(draft.salarioBruto || 0), salud: Number(draft.salud || 0), pension: Number(draft.pension || 0), solidaridad: Number(draft.solidaridad || 0), retencion: Number(draft.retencion || 0), otrosDescuentos: Number(draft.otrosDescuentos || 0), bonos: Number(draft.bonos || 0) },
        ],
      },
    }))
    setDraft(emptyRegistro())
  }

  const removeRegistro = (id) => {
    setState(prev => ({
      ...prev,
      ingresos: {
        ...prev.ingresos,
        registros: prev.ingresos.registros.filter(r => r.id !== id),
      },
    }))
  }

  const saveGrowth = () => {
    setState(prev => ({
      ...prev,
      ingresos: {
        ...prev.ingresos,
        cambiosRealesPorAno: {
          ...prev.ingresos.cambiosRealesPorAno,
          [edicionAno]: Number(edicionCambioReal || 0),
        },
      },
    }))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Último bruto" value={fmtM(latest.salarioBruto)} sub={latest.periodo || 'sin periodo'} />
        <MetricCard label="Deducciones base" value={fmtM(totalDeduccionesBase)} color="var(--red)" sub="sin cuotas de deuda" />
        <MetricCard label="Neto antes de deudas" value={fmtM(netoAntesDeudas)} color="var(--accent)" />
        <MetricCard label="Crecimiento anual base" value={`${state.ingresos.crecimientoBaseAnualPct}%`} sub="editable" />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Registrar desprendible</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
          <Field label="Periodo">
            <input type="month" value={draft.periodo} onChange={e => setDraft(v => ({ ...v, periodo: e.target.value }))} />
          </Field>
          <Field label="Salario bruto">
            <input type="number" value={draft.salarioBruto} onChange={e => setDraft(v => ({ ...v, salarioBruto: e.target.value }))} />
          </Field>
          <Field label="Salud">
            <input type="number" value={draft.salud} onChange={e => setDraft(v => ({ ...v, salud: e.target.value }))} />
          </Field>
          <Field label="Pensión">
            <input type="number" value={draft.pension} onChange={e => setDraft(v => ({ ...v, pension: e.target.value }))} />
          </Field>
          <Field label="Solidaridad">
            <input type="number" value={draft.solidaridad} onChange={e => setDraft(v => ({ ...v, solidaridad: e.target.value }))} />
          </Field>
          <Field label="Retención">
            <input type="number" value={draft.retencion} onChange={e => setDraft(v => ({ ...v, retencion: e.target.value }))} />
          </Field>
          <Field label="Otros descuentos">
            <input type="number" value={draft.otrosDescuentos} onChange={e => setDraft(v => ({ ...v, otrosDescuentos: e.target.value }))} />
          </Field>
          <Field label="Bonos / variable">
            <input type="number" value={draft.bonos} onChange={e => setDraft(v => ({ ...v, bonos: e.target.value }))} />
          </Field>
        </div>
        <Field label="Nota">
          <input type="text" value={draft.nota} onChange={e => setDraft(v => ({ ...v, nota: e.target.value }))} placeholder="Prima, ajuste, vacaciones..." />
        </Field>
        <Btn variant="accent" onClick={addRegistro} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} /> Guardar desprendible
        </Btn>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        <Card>
          <SectionTitle>Crecimiento salarial</SectionTitle>
          <Field label="% base anual">
            <input
              type="number"
              value={state.ingresos.crecimientoBaseAnualPct}
              onChange={e => setState(prev => ({
                ...prev,
                ingresos: { ...prev.ingresos, crecimientoBaseAnualPct: Number(e.target.value || 0) },
              }))}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 160px auto', gap: 8, alignItems: 'end', marginTop: 12 }}>
            <Field label="Año">
              <input type="number" value={edicionAno} onChange={e => setEdicionAno(Number(e.target.value || 0))} />
            </Field>
            <Field label="Cambio real %">
              <input type="number" value={edicionCambioReal} onChange={e => setEdicionCambioReal(e.target.value)} />
            </Field>
            <Btn onClick={saveGrowth} style={{ alignSelf: 'end' }}>Guardar cambio real</Btn>
          </div>
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            {Object.entries(state.ingresos.cambiosRealesPorAno || {}).sort((a, b) => Number(a[0]) - Number(b[0])).map(([ano, valor]) => (
              <div key={ano} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{ano}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{valor}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Lo que alimenta nómina hoy</SectionTitle>
          <Row label="Periodo vigente" value={latest.periodo || '—'} />
          <Row label="Salario bruto" value={fmt(latest.salarioBruto)} />
          <Row label="Salud" value={fmt(latest.salud)} />
          <Row label="Pensión" value={fmt(latest.pension)} />
          <Row label="Solidaridad" value={fmt(latest.solidaridad)} />
          <Row label="Retención" value={fmt(latest.retencion)} />
          <Row label="Otros descuentos" value={fmt(latest.otrosDescuentos || 0)} />
          <Row label="Bonos" value={fmt(latest.bonos || 0)} />
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)' }}>
            Aquí está la fuente única. Configuración ya no puede sobreescribir estos valores.
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Proyección salarial futura</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 8, marginBottom: 8, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Año</span><span>Bruto est.</span><span>Crecimiento</span><span>Neto est.</span><span>Aporte USD posible</span>
        </div>
        {proyectarSalario(latest.salarioBruto, state.ingresos.crecimientoBaseAnualPct, 8).map((row, i) => {
          const netoEst = Math.round(row.bruto * 0.67)
          const gastosFijos = state.gastos.reduce((s, g) => s + g.valor, 0)
          const deudas = state.deducciones.filter(d => d.origen === 'deuda').reduce((s, d) => s + d.valor, 0)
          const excEst = netoEst - gastosFijos
          return (
            <div key={row.ano} style={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.ano}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtM(row.bruto)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>+{fmtM(row.bruto - latest.salarioBruto)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmtM(netoEst)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: excEst > 0 ? 'var(--blue)' : 'var(--red)' }}>{fmtM(Math.max(0, excEst))}</span>
            </div>
          )
        })}
        <div style={{ marginTop: '0.75rem', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
          Neto estimado al 67% del bruto (retención + SS). Aporte posible = neto menos gastos actuales. No incluye incremento de cuotas de deuda.
        </div>
      </Card>

      <Card>
        <SectionTitle>Histórico de desprendibles</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr) 140px auto', gap: 8, marginBottom: 8, fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Periodo</span><span>Bruto</span><span>Retención</span><span>Otros desc.</span><span>Bonos</span><span>Neto base</span><span></span>
        </div>
        {registros.map(r => {
          const neto = Number(r.salarioBruto || 0) - Number(r.salud || 0) - Number(r.pension || 0) - Number(r.solidaridad || 0) - Number(r.retencion || 0) - Number(r.otrosDescuentos || 0)
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr) 140px auto', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{r.periodo}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(r.salarioBruto)}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(r.retencion)}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(r.otrosDescuentos || 0)}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(r.bonos || 0)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt(neto)}</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {latest.id === r.id && <span style={{ fontSize: 11, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowDownToLine size={12} /> vigente</span>}
                <button onClick={() => removeRegistro(r.id)} style={{ background: 'transparent' }}>
                  <Trash2 size={14} color="var(--red)" />
                </button>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}


function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>
    </div>
  )
}
