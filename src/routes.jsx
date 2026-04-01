import React from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppShell from './components/AppShell'
import RouteGuard from './components/RouteGuard'

import PublicLandingPage from './features/public/PublicLandingPage'
import LoginPage from './features/auth/LoginPage'
import ResumenPage from './features/resumen/ResumenPage'
import IngresosPage from './features/ingresos/IngresosPage'
import GastosPage from './features/gastos/GastosPage'
import DeudasPage from './features/deudas/DeudasPage'
import InversionesPage from './features/inversiones/InversionesPage'
import ActivosPage from './features/activos/ActivosPage'
import MetasPage from './features/metas/MetasPage'
import SeguimientoPage from './features/seguimiento/SeguimientoPage'
import SimuladorPage from './features/simulador/SimuladorPage'
import EscenariosPage from './features/escenarios/EscenariosPage'

function PageTitle({ title, children }) {
  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 400,
            color: 'var(--text)',
          }}
        >
          {title}
        </h1>
      </div>
      {children}
    </>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: (
      <RouteGuard>
        <AppShell />
      </RouteGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/app/resumen" replace /> },
      { path: 'resumen', element: <PageTitle title="Resumen"><ResumenPage /></PageTitle> },
      { path: 'ingresos', element: <PageTitle title="Ingresos"><IngresosPage /></PageTitle> },
      { path: 'gastos', element: <PageTitle title="Gastos"><GastosPage /></PageTitle> },
      { path: 'deudas', element: <PageTitle title="Deudas"><DeudasPage /></PageTitle> },
      { path: 'inversiones', element: <PageTitle title="Inversiones"><InversionesPage /></PageTitle> },
      { path: 'activos', element: <PageTitle title="Activos"><ActivosPage /></PageTitle> },
      { path: 'metas', element: <PageTitle title="Metas"><MetasPage /></PageTitle> },
      { path: 'seguimiento', element: <PageTitle title="Seguimiento"><SeguimientoPage /></PageTitle> },
      { path: 'simulador', element: <PageTitle title="¿Puedo comprarlo?"><SimuladorPage /></PageTitle> },
      { path: 'escenarios', element: <PageTitle title="Escenarios"><EscenariosPage /></PageTitle> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])