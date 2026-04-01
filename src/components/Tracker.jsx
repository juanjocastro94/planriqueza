import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, SectionTitle, Badge, Btn, EmptyState } from './UI'
import {
  fmt, fmtM, fmtUSD,
  deudaPlanMensual, deudaRealMensual,
  inversionPlanMensual, inversionRealMensual,
  calcularCumplimiento, currentPeriod, currentPeriodLabel,
  sumByPeriod,
} from '../utils/calc'
import { Trash2, TrendingUp, DollarSign, Landmark, Zap } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)',
}

// Genera lista de períodos cubiertos en todos los registros
function getPeriodos(state) {
  const set = new Set()
  state.deudas.forEach(d => {
    ;(d.abonosRealizados || []).forEach(a => a.periodo && set.add(a.periodo))
    ;(d.pagosCuotaRealizados || []).forEach(a => a.periodo && set.add(a.periodo))
  })
  ;(state.inversion.aportesRealizados || []).forEach(a => a.periodo && set.add(a.periodo))
  ;(state.inversion.transacciones || []).forEach(t => {
    if (t.fecha) set.add(t.fecha.slice(0, 7))
  })
  ;(state.abonosHipoteca || []).forEach(a => {
    if (a.fecha) set.add(a.fecha.slice(0, 7))
  })
  const periodos = Array.from(set).sort().reverse()
  if (!periodos.includes(currentPeriod())) periodos.unshift(currentPeriod())
  return periodos
}

// Construye feed cronológico unificado de un período
function buildFeed(state, periodo) {
  const items = []

  // Aportes USD realizados
  ;(state.inversion.aportesRealizados || [])
    .filter(a => a.periodo === periodo)
    .forEach(a => items.push({
      id: 'inv-' + a.id,
      tipo: 'inversion',
      label: 'Aporte USD',
      detalle: a.nota || 'Inversión USD',
      monto: a.monto,
      montoLabel: fmt(a.monto),
      icon: 'usd',
    }))

  // Transacciones USD (compras reales con TRM)
  ;(state.inversion.transacciones || [])
    .filter(t => t.fecha?.slice(0, 7) === periodo)
    .forEach(t => items.push({
      id: 'tx-' + t.id,
      tipo: 'compra-usd',
      label: 'Compra USD',
      detalle: `${t.nota || 'Global66'} · TRM ${Number(t.trm).toLocaleString()}`,
      monto: t.cop,
      montoLabel: `${fmt(t.cop)} → ${fmtUSD(Math.round(t.usd || t.cop / t.trm))}`,
      icon: 'usd',
    }))

  // Abonos a deudas
  state.deudas.forEach(d => {
    ;(d.abonosRealizados || [])
      .filter(a => a.periodo === periodo)
      .forEach(a => items.push({
        id: 'ab-' + d.id + '-' + a.id,
        tipo: 'abono',
        label: 'Abono capital',
        detalle: d.nombre + (a.nota ? ' · ' + a.nota : ''),
        monto: a.monto,
        montoLabel: fmt(a.monto),
        icon: 'deuda',
      }))
    ;(d.pagosCuotaRealizados || [])
      .filter(a => a.periodo === periodo)
      .forEach(a => items.push({
        id: 'cuota-' + d.id + '-' + a.id,
        tipo: 'cuota',
        label: 'Pago cuota',
        detalle: d.nombre + (a.nota ? ' · ' + a.nota : ''),
        monto: a.monto,
        montoLabel: fmt(a.monto),
        icon: 'deuda',
      }))
  })

  // Abonos extraordinarios hipoteca
  ;(state.abonosHipoteca || [])
    .filter(a => a.fecha?.slice(0, 7) === periodo)
    .forEach(a => items.push({
      id: 'hip-' + a.id,
      tipo: 'abono-hip',
      label: 'Abono extra hipoteca',
      detalle: a.nota || 'Abono extraordinario',
      monto: a.monto,
      montoLabel: fmt(a.monto),
      icon: 'zap',
    }))

  return items
}

const TIPO_CONFIG = {
  inversion:    { color: '#5ca8ff', badge: 'blue',    label: 'USD' },
  'compra-usd': { color: '#5ca8ff', badge: 'blue',    label: 'Compra' },
  abono:        { color: '#c8f060', badge: 'green',   label: 'Abono' },
  cuota:        { color: '#9a9690', badge: 'default', label: 'Cuota' },
  'abono-hip':  { color: '#ffc266', badge: 'amber',   label: 'Extra' },
}

export default function Tracker({ state, setState }) {
  const periodos = useMemo(() => getPeriodos(state), [state])
  const [periodo, setPeriodo] = useState(currentPeriod())

  const feed = useMemo(() => buildFeed(state, periodo), [state, periodo])
  const totalFeed = feed.reduce((s, i) => s + i.monto, 0)

  // Plan vs real del período seleccionado
  const deudaPlan = state.deudas.reduce((s, d) => s + deudaPlanMensual(d), 0)
  const deudaReal = state.deudas.reduce((s, d) => s + deudaRealMensual(d, periodo).total, 0)
  const invPlan = inversionPlanMensual(state.inversion)
  const invReal = inversionRealMensual(state.inversion, periodo)
  const planTotal = deudaPlan + invPlan
  const realTotal = deudaReal + invReal
  const cumplimiento = calcularCumplimiento(planTotal, realTotal)

  // Histórico de cumplimiento para el gráfico de barras (últimos 6 meses)
  const historico = useMemo(() => {
    return periodos.slice(0, 6).reverse().map(p => {
      const dReal = state.deudas.reduce((s, d) => s + deudaRealMensual(d, p).total, 0)
      const iReal = inversionRealMensual(state.inversion, p)
      const total = dReal + iReal
      return {
        label: p.slice(5), // mm
        real: Math.round(total / 1e6),
        plan: Math.round(planTotal / 1e6),
      }
    })
  }, [periodos, state, planTotal])

  const removeFromFeed = (item) => {
    const idStr = String(item.id)
    setState(p => {
      let next = { ...p }
      if (idStr.startsWith('inv-')) {
        const rid = item.id.replace('inv-', '')
        next = { ...next, inversion: { ...next.inversion, aportesRealizados: (next.inversion.aportesRealizados || []).filter(a => String(a.id) !== rid) } }
      } else if (idStr.startsWith('tx-')) {
        const rid = item.id.replace('tx-', '')
        next = { ...next, inversion: { ...next.inversion, transacciones: (next.inversion.transacciones || []).filter(t => String(t.id) !== rid) } }
      } else if (idStr.startsWith('hip-')) {
        const rid = item.id.replace('hip-', '')
        next = { ...next, abonosHipoteca: (next.abonosHipoteca || []).filter(a => String(a.id) !== rid) }
      } else if (idStr.startsWith('ab-') || idStr.startsWith('cuota-')) {
        const parts = idStr.split('-')
        const deudaId = Number(parts[1])
        const abonoId = parts.slice(2).join('-')
        const key = idStr.startsWith('ab-') ? 'abonosRealizados' : 'pagosCuotaRealizados'
        next = { ...next, deudas: next.deudas.map(d => d.id === deudaId ? { ...d, [key]: (d[key] || []).filter(a => String(a.id) !== abonoId) } : d) }
      }
      return next
    })
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <Kpi label="Período" value={currentPeriodLabel()} />
        <Kpi label="Plan mensual" value={fmtM(planTotal)} color="var(--accent)" />
        <Kpi label="Real registrado" value={fmtM(realTotal)} color="var(--blue)" />
        <Kpi label="Cumplimiento" value={`${cumplimiento}%`} color={cumplimiento >= 100 ? 'var(--accent)' : cumplimiento >= 70 ? '#f59e0b' : 'var(--red)'} />
      </div>

      {/* Selector de período + gráfico histórico */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        <Card>
          <SectionTitle>Seleccionar período</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {periodos.slice(0, 12).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} style={{
                padding: '5px 12px', fontSize: 12, fontFamily: 'var(--font-mono)',
                borderRadius: 6, cursor: 'pointer',
                background: p === periodo ? 'var(--accent)' : 'var(--bg-3)',
                color: p === periodo ? '#0a0a0a' : 'var(--text-2)',
                border: '1px solid ' + (p === periodo ? 'transparent' : 'var(--border)'),
                fontWeight: p === periodo ? 600 : 400,
              }}>{p}</button>
            ))}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Plan deuda</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(deudaPlan)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Real deuda</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: deudaReal >= deudaPlan ? 'var(--accent)' : 'var(--text-2)' }}>{fmt(deudaReal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Plan inversión</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(invPlan)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Real inversión</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: invReal >= invPlan ? 'var(--accent)' : 'var(--text-2)' }}>{fmt(invReal)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Histórico — últimos 6 meses (M COP)</SectionTitle>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historico} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5a5755' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#5a5755', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => v + 'M'} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtM(v * 1e6), '']} />
                <Bar dataKey="plan" fill="rgba(200,240,96,0.15)" radius={[3,3,0,0]} name="Plan" />
                <Bar dataKey="real" radius={[3,3,0,0]} name="Real">
                  {historico.map((h, i) => (
                    <Cell key={i} fill={h.real >= h.plan ? '#c8f060' : h.real >= h.plan * 0.7 ? '#ffc266' : '#ff5c5c'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[['#c8f060','≥ 100%'],['#ffc266','70–99%'],['#ff5c5c','< 70%']].map(([c,l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Feed cronológico */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <SectionTitle>Feed de movimientos — {periodo}</SectionTitle>
          {feed.length > 0 && (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmtM(totalFeed)} total</span>
          )}
        </div>

        {feed.length === 0 ? (
          <EmptyState icon={TrendingUp} title={`Sin movimientos en ${periodo}`} subtitle="Registra desde el Resumen, Deudas o Inversión USD" />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 160px auto', gap: 8, marginBottom: 6 }}>
              {['Tipo', 'Detalle', 'Monto', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {feed.map(item => {
              const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.cuota
              const Icon = item.icon === 'usd' ? DollarSign : item.icon === 'zap' ? Zap : Landmark
              return (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 160px auto',
                  gap: 8, alignItems: 'center', padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={13} color={cfg.color} />
                    <Badge color={cfg.badge}>{cfg.label}</Badge>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.detalle}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: cfg.color }}>{item.montoLabel}</span>
                  <button onClick={() => removeFromFeed(item)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.4 }}>
                    <Trash2 size={13} color="var(--red)" />
                  </button>
                </div>
              )
            })}
          </>
        )}
      </Card>
    </div>
  )
}

function Kpi({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '1rem', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 600, fontSize: 20 }}>{value}</div>
    </div>
  )
}
