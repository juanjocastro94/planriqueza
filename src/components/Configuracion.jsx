import React, { useMemo } from 'react'
import { Card, SectionTitle, Btn, MetricCard, Field, Divider } from './UI'
import { fmt, fmtM } from '../utils/calc'
import { Plus, Trash2, Lock, Calendar, AlertCircle } from 'lucide-react'

const MESES_NOMBRES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const FRECUENCIAS = [
  { value: 'anual',      label: 'Anual',       veces: 1 },
  { value: 'semestral',  label: 'Semestral',   veces: 2 },
  { value: 'trimestral', label: 'Trimestral',  veces: 4 },
  { value: 'bimestral',  label: 'Bimestral',   veces: 6 },
]

// Calcula los próximos meses de vencimiento dado frecuencia y mes base
function proximosVencimientos(mesBase, frecuencia) {
  const frec = FRECUENCIAS.find(f => f.value === frecuencia) || FRECUENCIAS[0]
  const intervalo = Math.round(12 / frec.veces)
  const meses = []
  for (let i = 0; i < frec.veces; i++) {
    meses.push(((mesBase - 1 + intervalo * i) % 12) + 1)
  }
  return meses.sort((a, b) => a - b)
}

// Meses para el próximo vencimiento desde hoy
function mesesHastaProximo(mesBase, frecuencia) {
  const venc = proximosVencimientos(mesBase, frecuencia)
  const mesActual = new Date().getMonth() + 1
  const futuros = venc.filter(m => m > mesActual)
  const proximo = futuros.length > 0 ? futuros[0] : venc[0] + 12
  return proximo - mesActual
}

export default function Configuracion({ state, setState }) {
  const totalDed = state.deducciones.reduce((s, d) => s + d.valor, 0)
  const netoNomina = state.salarioBruto - totalDed
  const totalGastos = state.gastos.reduce((s, g) => s + g.valor, 0)

  const gastosExtra = state.gastosExtraordinarios || []

  // Provisión mensual total de extraordinarios
  const provisionMensual = useMemo(() =>
    gastosExtra.reduce((s, g) => {
      const frec = FRECUENCIAS.find(f => f.value === g.frecuencia) || FRECUENCIAS[0]
      return s + Math.round((g.valor * frec.veces) / 12)
    }, 0),
    [gastosExtra]
  )

  const excedente = netoNomina - totalGastos - provisionMensual

  // Gastos mensuales
  const updateGasto = (id, field, val) =>
    setState(p => ({ ...p, gastos: p.gastos.map(g => g.id === id ? { ...g, [field]: val } : g) }))
  const addGasto = () =>
    setState(p => ({ ...p, gastos: [...p.gastos, { id: Date.now(), nombre: 'Nuevo gasto', valor: 0, categoria: 'variable' }] }))
  const removeGasto = (id) =>
    setState(p => ({ ...p, gastos: p.gastos.filter(g => g.id !== id) }))

  // Gastos extraordinarios
  const addExtra = () =>
    setState(p => ({ ...p, gastosExtraordinarios: [...(p.gastosExtraordinarios || []), {
      id: Date.now(), nombre: 'Nuevo gasto', valor: 0, frecuencia: 'anual', mesBase: 1,
    }]}))
  const updateExtra = (id, field, val) =>
    setState(p => ({ ...p, gastosExtraordinarios: (p.gastosExtraordinarios || []).map(g => g.id === id ? { ...g, [field]: val } : g) }))
  const removeExtra = (id) =>
    setState(p => ({ ...p, gastosExtraordinarios: (p.gastosExtraordinarios || []).filter(g => g.id !== id) }))

  // Detectar vencimientos este mes o el próximo
  const mesActual = new Date().getMonth() + 1
  const alertas = gastosExtra.filter(g => {
    const m = mesesHastaProximo(g.mesBase, g.frecuencia)
    return m <= 1
  })

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Bruto vigente" value={fmtM(state.salarioBruto)} sub={state.latestIngreso?.periodo || 'sin periodo'} />
        <MetricCard label="Gastos fijos/mes" value={fmtM(totalGastos)} sub="bolsillo" />
        <MetricCard label="Provisión extraordinarios" value={fmtM(provisionMensual)} color="var(--amber)" sub="promedio mensual" />
        <MetricCard label="Excedente real" value={fmtM(excedente)} color={excedente >= 0 ? 'var(--accent)' : 'var(--red)'} sub="incluye provisión" />
      </div>

      {/* Alerta vencimientos próximos */}
      {alertas.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '0.9rem 1rem', background: 'var(--amber-dim)',
          border: '1px solid rgba(255,194,102,0.3)', borderRadius: 10,
          marginBottom: '1.25rem',
        }}>
          <AlertCircle size={15} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 3 }}>
              Vencimiento este mes o el próximo
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
              {alertas.map(g => `${g.nombre} — ${fmt(g.valor)}`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12, marginBottom: '1rem' }}>
        {/* Nómina readonly */}
        <Card>
          <SectionTitle>Referencia de nómina</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-2)', fontSize: 12 }}>
            <Lock size={13} /> Datos de Ingresos y Deudas. No editables aquí.
          </div>
          {state.deducciones.map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 12 }}>{d.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {d.origen === 'deuda' ? 'Desde deuda' : 'Del desprendible'}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: d.origen === 'deuda' ? 'var(--amber)' : 'var(--red)' }}>{fmt(d.valor)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Neto a cuenta</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{fmt(netoNomina)}</span>
          </div>
        </Card>

        {/* Gastos fijos mensuales */}
        <Card>
          <SectionTitle>Gastos mensuales fijos</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px auto', gap: 8, marginBottom: 8, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>Concepto</span><span>Valor</span><span>Tipo</span><span />
          </div>
          {state.gastos.map(g => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px auto', gap: 8, alignItems: 'center', marginBottom: 7 }}>
              <input type="text" value={g.nombre} onChange={e => updateGasto(g.id, 'nombre', e.target.value)} />
              <input type="number" value={g.valor} onChange={e => updateGasto(g.id, 'valor', Number(e.target.value || 0))} style={{ fontFamily: 'var(--font-mono)' }} />
              <select value={g.categoria} onChange={e => updateGasto(g.id, 'categoria', e.target.value)}>
                <option value="fijo">Fijo</option>
                <option value="variable">Variable</option>
                <option value="prescindible">Prescindible</option>
              </select>
              <button onClick={() => removeGasto(g.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={13} color="var(--red)" />
              </button>
            </div>
          ))}
          <Btn onClick={addGasto} style={{ marginTop: 4 }}>
            <Plus size={13} /> Agregar
          </Btn>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            {['fijo', 'variable', 'prescindible'].map(cat => {
              const total = state.gastos.filter(g => g.categoria === cat).reduce((s, g) => s + g.valor, 0)
              if (!total) return null
              return (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{cat}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(total)}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Total mensual</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(totalGastos)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Gastos extraordinarios */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={13} color="var(--text-3)" />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Gastos extraordinarios recurrentes
            </div>
          </div>
          <Btn onClick={addExtra}><Plus size={13} /> Agregar</Btn>
        </div>

        {gastosExtra.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            SOAT, impuesto predial, revisión técnico-mecánica, matrículas anuales...
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 110px 110px 120px 120px auto', gap: 8, marginBottom: 8, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Concepto</span>
              <span>Valor c/vez</span>
              <span>Frecuencia</span>
              <span>Mes vencimiento</span>
              <span>Provisión/mes</span>
              <span />
            </div>

            {gastosExtra.map(g => {
              const frec = FRECUENCIAS.find(f => f.value === g.frecuencia) || FRECUENCIAS[0]
              const provision = Math.round((g.valor * frec.veces) / 12)
              const vencimientos = proximosVencimientos(g.mesBase, g.frecuencia)
              const mesesHasta = mesesHastaProximo(g.mesBase, g.frecuencia)
              const proxima = mesesHasta <= 0 ? 'Este mes' : mesesHasta === 1 ? 'El próximo mes' : `En ${mesesHasta} meses`
              const alerta = mesesHasta <= 1

              return (
                <div key={g.id} style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 110px 110px 120px 120px auto',
                  gap: 8, alignItems: 'center', padding: '10px 0',
                  borderTop: '1px solid var(--border)',
                }}>
                  <input
                    type="text" value={g.nombre}
                    onChange={e => updateExtra(g.id, 'nombre', e.target.value)}
                  />
                  <input
                    type="number" value={g.valor}
                    onChange={e => updateExtra(g.id, 'valor', Number(e.target.value || 0))}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <select value={g.frecuencia} onChange={e => updateExtra(g.id, 'frecuencia', e.target.value)}>
                    {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div>
                    <select value={g.mesBase} onChange={e => updateExtra(g.id, 'mesBase', Number(e.target.value))}>
                      {MESES_NOMBRES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <div style={{ fontSize: 10, marginTop: 4, color: alerta ? 'var(--amber)' : 'var(--text-3)', fontWeight: alerta ? 600 : 400 }}>
                      {proxima}
                      {frec.veces > 1 && ` · también ${vencimientos.slice(1).map(m => MESES_NOMBRES[m-1]).join(', ')}`}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--amber)', fontWeight: 500, textAlign: 'right' }}>
                    {fmt(provision)}<span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400, fontFamily: 'var(--font-body)' }}>/mes</span>
                  </div>
                  <button onClick={() => removeExtra(g.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                    <Trash2 size={13} color="var(--red)" />
                  </button>
                </div>
              )
            })}

            {/* Totales */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total anual extraordinarios</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 12 }}>
                  ≈ {fmt(provisionMensual)}/mes de provisión
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--amber)' }}>
                {fmt(gastosExtra.reduce((s, g) => {
                  const frec = FRECUENCIAS.find(f => f.value === g.frecuencia) || FRECUENCIAS[0]
                  return s + g.valor * frec.veces
                }, 0))}
              </span>
            </div>

            {/* Calendario del año */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Calendario del año
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
                {MESES_NOMBRES.map((mes, i) => {
                  const mesNum = i + 1
                  const gastosMes = gastosExtra.filter(g =>
                    proximosVencimientos(g.mesBase, g.frecuencia).includes(mesNum)
                  )
                  const totalMes = gastosMes.reduce((s, g) => s + g.valor, 0)
                  const esHoy = mesNum === mesActual
                  return (
                    <div key={mes} style={{
                      background: gastosMes.length > 0 ? 'var(--amber-dim)' : 'var(--bg-3)',
                      border: `1px solid ${esHoy ? 'var(--accent)' : gastosMes.length > 0 ? 'rgba(255,194,102,0.3)' : 'var(--border)'}`,
                      borderRadius: 6, padding: '6px 4px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: esHoy ? 'var(--accent)' : 'var(--text-3)', fontWeight: esHoy ? 600 : 400, marginBottom: 3 }}>{mes}</div>
                      {totalMes > 0 ? (
                        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>
                          {fmtM(totalMes)}
                        </div>
                      ) : (
                        <div style={{ fontSize: 9, color: 'var(--text-3)' }}>—</div>
                      )}
                      {gastosMes.length > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>
                          {gastosMes.map(g => g.nombre.split(' ')[0]).join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Flujo real considerando provisión */}
      {gastosExtra.length > 0 && (
        <Card style={{ marginTop: '1rem' }}>
          <SectionTitle>Flujo mensual real (con provisión)</SectionTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Neto a cuenta</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(netoNomina)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Gastos fijos mensuales</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--red)' }}>−{fmt(totalGastos)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Provisión extraordinarios</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--amber)' }}>−{fmt(provisionMensual)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Excedente real disponible</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: excedente >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {excedente >= 0 ? '+' : ''}{fmt(excedente)}
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
            La provisión es el promedio mensual de los gastos extraordinarios anualizados. No sale de tu cuenta cada mes, pero debes reservarla para cuando venzan.
          </div>
        </Card>
      )}
    </div>
  )
}
