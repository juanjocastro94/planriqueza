import React, { useMemo, useState } from 'react'
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, SectionTitle, Badge, Btn } from './UI'
import {
  proyectarPatrimonioDesdeEstado, getMesAnio, fmtM, fmt,
  deudaPlanMensual, deudaRealMensual, inversionPlanMensual,
  inversionRealMensual, calcularCumplimiento, currentPeriod, currentPeriodLabel,
  sumByPeriod, detectarHitos,
} from '../utils/calc'
import { CheckCircle, AlertCircle, TrendingUp, Plus, Bell } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

export default function Resumen({ state, setState }) {
  const totalDed = state.deducciones.reduce((s, d) => s + d.valor, 0)
  const latest = state.latestIngreso
  const netoNomina = state.salarioBruto - totalDed + Number(latest.bonos || 0)
  const totalGastos = state.gastos.reduce((s, g) => s + g.valor, 0)
  const excedente = netoNomina - totalGastos

  // Provisión mensual de gastos extraordinarios
  const provisionExtraordinarios = (state.gastosExtraordinarios || []).reduce((s, g) => {
    const frecVeces = { anual: 1, semestral: 2, trimestral: 4, bimestral: 6 }[g.frecuencia] || 1
    return s + Math.round((g.valor * frecVeces) / 12)
  }, 0)

  const deudaPlan = state.deudas.reduce((s, d) => s + deudaPlanMensual(d), 0)
  const deudaReal = state.deudas.reduce((s, d) => s + deudaRealMensual(d, currentPeriod()).total, 0)
  const inversionPlan = inversionPlanMensual(state.inversion)
  const inversionReal = inversionRealMensual(state.inversion, currentPeriod())
  const planMensual = deudaPlan + inversionPlan + Number(state.estrategia.colchonMensual || 0)
  const realMensual = deudaReal + inversionReal
  const cumplimiento = calcularCumplimiento(planMensual, realMensual)
  const flujoLibrePlan = excedente - planMensual - provisionExtraordinarios
  const flujoLibreReal = excedente - realMensual
  const totalDeuda = state.deudas.reduce((s, d) => s + d.saldo, 0)
  const delta = excedente - planMensual

  const patrimonioPuntos = useMemo(() => proyectarPatrimonioDesdeEstado(state, 10), [state])
  const hipoteca = state.deudas.find(d => d.categoria === 'hipotecario')
  const liberacion = hipoteca ? getMesAnio(Math.max(0, hipoteca.mesesRestantes)) : '—'

  // ── Registro rápido mensual ──────────────────────────────────────
  const [quickInv, setQuickInv] = useState('')
  const [quickAbono, setQuickAbono] = useState('')
  const [quickNota, setQuickNota] = useState('')
  const periodo = currentPeriod()

  const registrarMes = () => {
    const ts = Date.now()
    setState(p => {
      let next = { ...p }
      if (quickInv && Number(quickInv) > 0) {
        next = {
          ...next,
          inversion: {
            ...next.inversion,
            aportesRealizados: [
              ...(next.inversion.aportesRealizados || []),
              { id: ts, periodo, monto: Number(quickInv), nota: quickNota || 'Registro rápido' },
            ],
          },
        }
      }
      if (quickAbono && Number(quickAbono) > 0 && hipoteca) {
        next = {
          ...next,
          deudas: next.deudas.map(d =>
            d.id === hipoteca.id
              ? { ...d, abonosRealizados: [...(d.abonosRealizados || []), { id: ts + 1, periodo, monto: Number(quickAbono), nota: quickNota || 'Registro rápido' }] }
              : d
          ),
        }
      }
      return next
    })
    setQuickInv(''); setQuickAbono(''); setQuickNota('')
  }

  const yaRegistroInv = inversionReal > 0
  const yaRegistroDeuda = deudaReal > 0

  return (
    <div>
      {/* ── Alerta inteligente inicio de mes ───────────────────────── */}
      <AlertaMes
        excedente={excedente}
        planMensual={planMensual}
        delta={delta}
        cumplimiento={cumplimiento}
        inversionReal={inversionReal}
        deudaReal={deudaReal}
        periodo={currentPeriodLabel()}
      />

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <Kpi label="Neto mensual" value={fmtM(netoNomina)} sub={`incl. bono · crece ${state.ingresos?.crecimientoBaseAnualPct || 0}%/año`} />
        <Kpi label="Plan del mes" value={fmtM(planMensual)} color="var(--accent)" sub="deuda + inversión + colchón" />
        <Kpi label="Cumplimiento" value={`${cumplimiento}%`} color={cumplimiento >= 100 ? 'var(--accent)' : cumplimiento >= 70 ? '#f59e0b' : 'var(--red)'} sub="real vs plan" />
        <Kpi label="Deuda total" value={fmtM(totalDeuda)} color="var(--red)" sub={`hipoteca libre: ${liberacion}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        {/* ── Plan vs real ─────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Plan consolidado del mes</SectionTitle>
          <Row label="Plan deuda" value={fmt(deudaPlan)} />
          <Row label="Real deuda" value={fmt(deudaReal)} color={deudaReal >= deudaPlan ? 'var(--accent)' : 'var(--red)'} />
          <Row label="Plan inversión" value={fmt(inversionPlan)} />
          <Row label="Real inversión" value={fmt(inversionReal)} color={inversionReal >= inversionPlan ? 'var(--accent)' : 'var(--red)'} />
          <Row label="Colchón plan" value={fmt(state.estrategia.colchonMensual || 0)} />
          {provisionExtraordinarios > 0 && <Row label="Provisión extraordinarios" value={fmt(provisionExtraordinarios)} valueColor="var(--amber)" />}
          <Row label="Flujo libre plan" value={fmt(flujoLibrePlan)} color={flujoLibrePlan >= 0 ? 'var(--accent)' : 'var(--red)'} />
          <Row label="Flujo libre real" value={fmt(flujoLibreReal)} color={flujoLibreReal >= 0 ? 'var(--blue)' : 'var(--red)'} />
          <div style={{ marginTop: 12 }}>
            <Badge color={cumplimiento >= 100 ? 'green' : cumplimiento >= 70 ? 'amber' : 'red'}>{cumplimiento}% cumplimiento total</Badge>
          </div>
        </Card>

        {/* ── Registro rápido mensual ──────────────────────────────── */}
        <Card>
          <SectionTitle>Registro rápido — {currentPeriodLabel()}</SectionTitle>

          {(yaRegistroInv || yaRegistroDeuda) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--accent-dim)', borderRadius: 8, marginBottom: '1rem', fontSize: 12, color: 'var(--accent)' }}>
              <CheckCircle size={13} />
              {yaRegistroInv && yaRegistroDeuda
                ? 'Inversión y abono registrados este mes.'
                : yaRegistroInv ? 'Inversión registrada. Falta abono a deuda.'
                : 'Abono registrado. Falta registrar inversión.'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                Aporte USD este mes (COP) — plan: {fmt(inversionPlan)}
              </div>
              <input
                type="number"
                value={quickInv}
                onChange={e => setQuickInv(e.target.value)}
                placeholder={String(inversionPlan)}
                style={{ fontFamily: 'var(--font-mono)', width: '100%' }}
              />
            </div>
            {hipoteca && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                  Abono hipoteca este mes — plan: {fmt(hipoteca.abonoMensualPlan || 0)}
                </div>
                <input
                  type="number"
                  value={quickAbono}
                  onChange={e => setQuickAbono(e.target.value)}
                  placeholder={String(hipoteca.abonoMensualPlan || 0)}
                  style={{ fontFamily: 'var(--font-mono)', width: '100%' }}
                />
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Nota (opcional)</div>
              <input
                type="text"
                value={quickNota}
                onChange={e => setQuickNota(e.target.value)}
                placeholder="Prima, transferencia Global66..."
              />
            </div>
          </div>

          <Btn
            variant="accent"
            onClick={registrarMes}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Plus size={13} /> Registrar este mes
          </Btn>

          <div style={{ marginTop: '0.75rem', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Los registros de inversión y abono se guardan con el período actual y aparecen en el feed de Seguimiento.
          </div>
        </Card>
      </div>

      {/* ── Progreso últimos 3 meses ─────────────────────────────────── */}
      <Progreso3Meses state={state} planMensual={planMensual} />

      {/* ── Hitos automáticos ───────────────────────────────────────────── */}
      <HitosPanel state={state} />

      {/* ── Gráfico patrimonio ───────────────────────────────────────── */}
      <GraficoPatrimonio puntos={patrimonioPuntos} />
    </div>
  )
}

// ── Gráfico de patrimonio mejorado ───────────────────────────────────────────
function GraficoPatrimonio({ puntos }) {
  // Snapshot en años clave
  const snapshot = [
    puntos.find(p => p.label === String(new Date().getFullYear() + 1)),
    puntos.find(p => p.label === String(new Date().getFullYear() + 3)),
    puntos.find(p => p.label === String(new Date().getFullYear() + 5)),
    puntos.find(p => p.label === String(new Date().getFullYear() + 10)),
  ].filter(Boolean)

  return (
    <Card style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Patrimonio proyectado — 10 años
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Patrimonio neto = inversión USD en COP menos deuda pendiente
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Inversión USD', color: '#5ca8ff' },
            { label: 'Deuda', color: '#ff5c5c' },
            { label: 'Patrimonio neto', color: '#c8f060' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block', flexShrink: 0 }} />{l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Snapshot numérico en años clave */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${snapshot.length}, 1fr)`, gap: 8, marginBottom: '1rem' }}>
        {snapshot.map(p => (
          <div key={p.label} style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14,
              color: p.Plan >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {p.Plan >= 0 ? '+' : ''}{p.Plan}M
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
              deuda {p.Deuda}M
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico — separado por tipo, no apilado */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={puntos} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5ca8ff" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#5ca8ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c8f060" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#c8f060" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#5a5755', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => v + 'M'} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => {
                const labels = { Inversion: 'Inversión USD', Deuda: 'Deuda total', Plan: 'Patrimonio neto' }
                return [fmtM(v * 1e6), labels[name] || name]
              }}
            />
            <Area type="monotone" dataKey="Inversion" stroke="#5ca8ff" fill="url(#gInv)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="Plan" stroke="#c8f060" fill="url(#gPat)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Deuda" stroke="#ff5c5c" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        La línea roja punteada es la deuda que baja. Las barras azules son la inversión USD acumulada. La línea verde es el patrimonio neto (USD menos deuda). Cuando la verde cruza cero, el portafolio supera toda la deuda.
      </div>
    </Card>
  )
}

// ── Hitos automáticos ──────────────────────────────────────────────────────
function HitosPanel({ state }) {
  const hitos = detectarHitos(state)
  if (!hitos.length) return null
  const urgenciaColor = { alta: 'var(--red)', media: 'var(--amber)', info: 'var(--blue)', exito: 'var(--accent)' }
  return (
    <Card style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <Bell size={13} color="var(--text-3)" />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hitos automáticos</div>
        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: 'var(--bg-4)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{hitos.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hitos.map((h, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 8, borderLeft: `3px solid ${urgenciaColor[h.urgencia] || 'var(--border)'}` }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{h.icono}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{h.titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{h.detalle}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Progreso últimos 3 meses ─────────────────────────────────────────────────
function Progreso3Meses({ state, planMensual }) {
  const periodos = useMemo(() => {
    const hoy = new Date()
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }).reverse()
  }, [])

  const data = periodos.map(p => {
    const dReal = state.deudas.reduce((s, d) => s + deudaRealMensual(d, p).total, 0)
    const iReal = inversionRealMensual(state.inversion, p)
    const total = dReal + iReal
    const pct = planMensual > 0 ? Math.round(total / planMensual * 100) : 0
    return { label: p.slice(5) + '/' + p.slice(2, 4), deuda: Math.round(dReal / 1e6), inversion: Math.round(iReal / 1e6), total: Math.round(total / 1e6), pct, raw: total }
  })

  const tendencia = data[2]?.raw > data[0]?.raw ? '↑ mejorando' : data[2]?.raw < data[0]?.raw ? '↓ bajando' : '→ estable'
  const colorTendencia = data[2]?.raw > data[0]?.raw ? 'var(--accent)' : data[2]?.raw < data[0]?.raw ? 'var(--red)' : 'var(--text-3)'

  return (
    <Card style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <SectionTitle>Progreso — últimos 3 meses</SectionTitle>
        <span style={{ fontSize: 12, color: colorTendencia, fontWeight: 500 }}>{tendencia}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1rem' }}>
        {data.map((d, i) => (
          <div key={i} style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.9rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{d.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', color: d.pct >= 100 ? 'var(--accent)' : d.pct >= 70 ? '#ffc266' : d.pct === 0 ? 'var(--text-3)' : 'var(--red)', marginBottom: 4 }}>
              {d.pct}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {d.total > 0 ? `${fmtM(d.raw)} registrado` : 'sin registros'}
            </div>
            {d.total > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 3, background: 'var(--bg-4)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: Math.min(100, d.pct) + '%', background: d.pct >= 100 ? 'var(--accent)' : d.pct >= 70 ? '#ffc266' : 'var(--red)', borderRadius: 2, transition: 'width 0.4s' }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        Plan mensual de referencia: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmtM(planMensual)}</span> · Los registros se toman de Deudas e Inversión USD.
      </div>
    </Card>
  )
}

// ── Alerta inteligente ────────────────────────────────────────────────────────
function AlertaMes({ excedente, planMensual, delta, cumplimiento, inversionReal, deudaReal, periodo }) {
  const sinRegistro = inversionReal === 0 && deudaReal === 0
  const enCurso = cumplimiento > 0 && cumplimiento < 100
  const cumplido = cumplimiento >= 100

  if (cumplido) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '1rem 1.25rem', background: 'var(--accent-dim)', border: '1px solid rgba(200,240,96,0.25)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
        <CheckCircle size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 2 }}>Plan cumplido este mes — {periodo}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Registraste {fmtM(inversionReal + deudaReal)} de {fmtM(planMensual)} planificados.
            {delta > 0 && ` Tienes ${fmtM(delta)} de remanente — considera abonar a capital de la hipoteca.`}
          </div>
        </div>
      </div>
    )
  }

  if (sinRegistro) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '1rem 1.25rem', background: 'rgba(255,194,102,0.08)', border: '1px solid rgba(255,194,102,0.25)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
        <AlertCircle size={18} color="#ffc266" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ffc266', marginBottom: 2 }}>Sin registros este mes — {periodo}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Tu plan requiere <strong style={{ color: 'var(--text)' }}>{fmtM(planMensual)}</strong> este mes.
            Excedente disponible: <strong style={{ color: delta >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmtM(excedente)}</strong>.
            {delta >= 0
              ? ` Te sobran ${fmtM(delta)} después del plan. Usa el registro rápido abajo para dejar constancia.`
              : ` El plan supera el excedente en ${fmtM(Math.abs(delta))} — revisa la estrategia.`}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '1rem 1.25rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
      <TrendingUp size={18} color="#5ca8ff" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5ca8ff', marginBottom: 2 }}>En curso — {periodo} · {cumplimiento}% completado</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Registraste {fmtM(inversionReal + deudaReal)} de {fmtM(planMensual)}.
          Faltan <strong style={{ color: 'var(--text)' }}>{fmtM(planMensual - inversionReal - deudaReal)}</strong> para completar el plan del mes.
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, color = 'var(--text)' }) {
  return (
    <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '1rem', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 600, fontSize: 20 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color }}>{value}</span>
    </div>
  )
}
