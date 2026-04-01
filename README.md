# Plan de Riqueza — JJC

Dashboard financiero personal para gestión de deudas, inversión en USD y proyección de patrimonio.

## Setup

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Build para producción

```bash
npm run build
```

## Despliegue en Netlify

1. `npm run build`
2. Arrastra la carpeta `dist/` a netlify.com/drop
   — o conecta el repo y Netlify detecta Vite automáticamente

## Estructura

```
src/
  App.jsx              — navegación principal
  index.css            — sistema de diseño (variables CSS)
  hooks/
    useStore.js        — estado global + localStorage
  utils/
    calc.js            — cálculos financieros (amortización, proyecciones)
  components/
    UI.jsx             — primitivos: Card, MetricCard, Row, Badge, Btn, Slider
    Resumen.jsx        — dashboard principal con flujo y gráfico patrimonio
    Configuracion.jsx  — edición de nómina, gastos y deudas
    Hipoteca.jsx       — simulador abonos + gráfico amortización
    InversionUSD.jsx   — proyección portafolio USD con interés compuesto
    Escenarios.jsx     — comparativa 3 estrategias en paralelo
    Tracker.jsx        — registro mes a mes de abonos reales
```

## Datos

Todo se guarda en `localStorage` bajo la clave `plan-riqueza-v1`.
Para exportar: `JSON.stringify(localStorage.getItem('plan-riqueza-v1'))` en la consola del navegador.
Para importar: `localStorage.setItem('plan-riqueza-v1', '...')` y recargar.

## Supuestos del modelo

- TRM proyectada: crece 3% anual
- Rendimiento USD: 8% anual (ajustable en la app)
- Santander 288M: cancela en 60 meses (mar 2030), flujo redirigido a USD
- Chery Tiggo: venta antes de dic 2031 cubre globo de $50.8M
- Abono hipoteca va 100% a capital (reduce plazo, no cuota)
