import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Btn } from '../../components/UI'
import { ArrowLeft, Hammer } from 'lucide-react'

const LABELS = {
  '/app/activos':      'Activos',
  '/app/escenarios':   'Escenarios',
  '/app/simulador':    '¿Puedo comprarlo?',
  '/app/metas':        'Metas',
  '/app/seguimiento':  'Seguimiento',
}

export default function ComingSoonPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const pageName  = LABELS[location.pathname] || 'Esta sección'

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '2rem 1rem',
    }}>
      {/* Ícono */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--accent-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <Hammer size={28} color="var(--accent)" />
      </div>

      {/* Título */}
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-body)' }}>
        {pageName} — en construcción
      </div>

      {/* Subtítulo */}
      <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 380, marginBottom: '2rem' }}>
        Estamos construyendo esta sección para darte la mejor experiencia posible.
        Mientras tanto, puedes seguir usando Ingresos, Gastos, Deudas e Inversiones.
      </div>

      {/* Badge "beta" */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'var(--accent-dim)', color: '#5f7d15',
        fontSize: 11, fontWeight: 700, padding: '4px 12px',
        borderRadius: 999, marginBottom: '2rem',
        border: '1px solid rgba(183,222,74,0.3)',
      }}>
        Compás Beta · Más funciones pronto
      </div>

      {/* Botón volver */}
      <Btn variant="ghost" onClick={() => navigate('/app/resumen')} style={{ padding: '8px 16px' }}>
        <ArrowLeft size={14} /> Volver al resumen
      </Btn>
    </div>
  )
}