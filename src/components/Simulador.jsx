import React, { useState, useMemo } from 'react'
import { Card, SectionTitle, Field, Btn, MetricCard, Badge, Divider } from './UI'
import { fmt, fmtM, fmtUSD, simularCompra } from '../utils/calc'
import { ShoppingCart, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react'

export default function Simulador({ state }) {
  const excedente = useMemo(() => {
    const totalDed = state.deducciones.reduce((s, d) => s + d.valor, 0)
    const neto = state.salarioBruto - totalDed
    const gastos = state.gastos.reduce((s, g) => s + g.valor, 0)
    return neto - gastos
  }, [state])

  const aporteUSD = state.inversion?.aporteMensualCOP || 0

  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [financiado, setFinanciado] = useState(false)
  const [plazo, setPlazo] = useState(24)
  const [tasa, setTasa] = useState(18)
  const [resultado, setResultado] = useState(null)

  const calcular = () => {
    if (!precio || Number(precio) <= 0) return
    const r = simularCompra({
      precioTotal: Number(precio),
      financiado,
      plazoMeses: plazo,
      tasaEA: tasa,
      excedenteMensual: excedente,
      aporteUSDMensual: aporteUSD,
    })
    setResultado({ ...r, nombre, precio: Number(precio) })
  }

  const urgencia = resultado
    ? !resultado.viable ? 'no' : resultado.mesesImpacto > 24 ? 'caution' : 'ok'
    : null

  const urgenciaConfig = {
    no:      { color: 'var(--red)',   bg: 'var(--red-dim)',   icon: AlertCircle,   label: 'No es viable ahora' },
    caution: { color: 'var(--amber)', bg: 'var(--amber-dim)', icon: TrendingDown,  label: 'Impacto significativo' },
    ok:      { color: 'var(--accent)',bg: 'var(--accent-dim)',icon: CheckCircle,   label: 'Viable' },
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Excedente mensual" value={fmtM(excedente)} color={excedente >= 0 ? 'var(--accent)' : 'var(--red)'} sub="después de gastos fijos" />
        <MetricCard label="Aporte USD mensual plan" value={fmtM(aporteUSD)} sub="que este gasto podría afectar" />
        <MetricCard label="Capacidad anual disponible" value={fmtM(Math.max(0, excedente) * 12)} sub="sin tocar plan de inversión" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Formulario */}
        <Card>
          <SectionTitle>Simular gasto extraordinario</SectionTitle>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="¿Qué quieres comprar?">
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Viaje a Disney, TV, carro..." />
            </Field>
            <Field label="Precio total (COP)">
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="15000000" style={{ fontFamily: 'var(--font-mono)' }} />
            </Field>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setFinanciado(false)} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                background: !financiado ? 'var(--accent-dim)' : 'var(--bg-3)',
                border: `1px solid ${!financiado ? 'rgba(200,240,96,0.4)' : 'var(--border)'}`,
                color: !financiado ? 'var(--accent)' : 'var(--text-2)',
                fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: !financiado ? 600 : 400,
                transition: 'all 0.15s',
              }}>Contado</button>
              <button onClick={() => setFinanciado(true)} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                background: financiado ? 'var(--accent-dim)' : 'var(--bg-3)',
                border: `1px solid ${financiado ? 'rgba(200,240,96,0.4)' : 'var(--border)'}`,
                color: financiado ? 'var(--accent)' : 'var(--text-2)',
                fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: financiado ? 600 : 400,
                transition: 'all 0.15s',
              }}>Financiado</button>
            </div>

            {financiado && (
              <>
                <Field label="Plazo (meses)">
                  <input type="number" value={plazo} onChange={e => setPlazo(Number(e.target.value))} style={{ fontFamily: 'var(--font-mono)' }} />
                </Field>
                <Field label="Tasa EA %">
                  <input type="number" value={tasa} onChange={e => setTasa(Number(e.target.value))} style={{ fontFamily: 'var(--font-mono)' }} />
                </Field>
              </>
            )}

            <Btn variant="accent" onClick={calcular} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
              <ShoppingCart size={14} /> Simular
            </Btn>
          </div>
        </Card>

        {/* Resultado */}
        <Card>
          <SectionTitle>Resultado</SectionTitle>
          {!resultado ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <ShoppingCart size={32} style={{ opacity: 0.15, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Completa el formulario y simula</div>
            </div>
          ) : (
            <div>
              {/* Veredicto */}
              {(() => {
                const cfg = urgenciaConfig[urgencia]
                const Icon = cfg.icon
                return (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '0.9rem 1rem', borderRadius: 10, marginBottom: '1.25rem',
                    background: cfg.bg, border: `1px solid ${cfg.color}30`,
                  }}>
                    <Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                        {resultado.nombre && <strong>{resultado.nombre}</strong>}
                        {resultado.nombre && ' · '}
                        {fmt(resultado.precio)}
                        {resultado.modo === 'financiado' && ` en ${resultado.mesesImpacto} meses`}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Métricas */}
              {resultado.modo === 'financiado' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cuota mensual</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: resultado.viable ? 'var(--text)' : 'var(--red)' }}>{fmt(resultado.cuotaMensual)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Intereses totales</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: 'var(--red)' }}>{fmt(resultado.interesesPagados)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total pagado</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16 }}>{fmt(resultado.totalPagado)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Excedente tras cuota</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: resultado.excedenteTrasCompra >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(resultado.excedenteTrasCompra)}</div>
                  </div>
                </div>
              )}

              {resultado.modo === 'contado' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meses para ahorrar</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16 }}>
                      {resultado.mesesImpacto === Infinity ? '∞' : resultado.mesesImpacto}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '0.8rem' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>USD dejados de comprar</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: 'var(--red)' }}>{fmtUSD(Math.round(resultado.perdidaInversionUSD / (state.inversion?.trmActual || 4100)))}</div>
                  </div>
                </div>
              )}

              <Divider />

              {/* Consejo */}
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, marginTop: '0.75rem' }}>
                {!resultado.viable && (
                  <>Con el excedente actual de <strong style={{ color: 'var(--text)' }}>{fmtM(excedente)}</strong> este gasto no es sostenible sin romper el plan. Considera esperar a que canceles el Santander (mar 2030) cuando se liberen <strong style={{ color: 'var(--accent)' }}>$5.44M/mes</strong> adicionales.</>
                )}
                {resultado.viable && resultado.modo === 'financiado' && (
                  <>Financiado al {tasa}% EA pagarás <strong style={{ color: 'var(--red)' }}>{fmt(resultado.interesesPagados)}</strong> en intereses. Si puedes pagar contado en {Math.ceil(resultado.precio / excedente)} meses de ahorro, ahorras esos intereses.</>
                )}
                {resultado.viable && resultado.modo === 'contado' && (
                  <>Ahorrando {fmtM(excedente)}/mes llegas al precio en <strong style={{ color: 'var(--accent)' }}>{resultado.mesesImpacto} meses</strong>. Sin intereses y sin afectar el flujo mensual después de comprar.</>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
