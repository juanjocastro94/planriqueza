import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Landmark,
  Target,
  Wallet,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Users,
  BadgeDollarSign,
} from 'lucide-react'
import Brand from '../../components/Brand'

const FEATURES = [
  {
    icon: Wallet,
    title: 'Ordena tu flujo de caja',
    text: 'Centraliza ingresos, gastos, suscripciones y provisiones para entender cuánto dinero tienes de verdad disponible cada mes.',
  },
  {
    icon: Landmark,
    title: 'Gestiona deudas con criterio',
    text: 'Calcula cuota, seguros, globo, pago mensual total y registra abonos a capital para tomar mejores decisiones.',
  },
  {
    icon: TrendingUp,
    title: 'Construye inversión y patrimonio',
    text: 'Consolida inversiones, activos y metas para ver cómo se mueve tu patrimonio y no solo tu saldo de cuenta.',
  },
  {
    icon: BarChart3,
    title: 'Compara escenarios',
    text: 'Simula qué pasa si aceleras deuda, inversión o una compra importante antes de comprometer caja.',
  },
  {
    icon: Target,
    title: 'Convierte objetivos en plan',
    text: 'No solo pongas metas: entiende cuánto necesitas, qué tan atrasado vas y qué decisión te acerca más.',
  },
  {
    icon: Sparkles,
    title: 'Prepárate para recomendaciones',
    text: 'Compás está diseñado para evolucionar hacia alertas, scoring financiero y recomendaciones accionables.',
  },
]

const PREMIUM = [
  'Escenarios avanzados y comparativos',
  'Centro premium de deudas',
  'Health score financiero',
  'Alertas y recomendaciones inteligentes',
  'Modo hogar / pareja',
  'Campañas y códigos promocionales',
]

const FAQS = [
  {
    q: '¿Compás se conecta a bancos?',
    a: 'Por ahora el modelo base es manual, bien hecho y flexible. La arquitectura ya está pensada para integraciones futuras.',
  },
  {
    q: '¿Sirve solo para personas con muchas inversiones?',
    a: 'No. También sirve mucho si tu reto principal hoy es ordenar flujo, salir de deudas o entender cuánto puedes mover sin romper caja.',
  },
  {
    q: '¿Puedo usarlo con mi pareja o familia?',
    a: 'Sí, ese es uno de los caminos del producto. El modo hogar / pareja está contemplado como parte importante del roadmap.',
  },
  {
    q: '¿Qué hace diferente a Compás?',
    a: 'No se queda en registrar gastos. Busca ayudarte a decidir: deuda vs inversión, caja vs metas, compra vs espera, plan vs ejecución.',
  },
]

function useResponsive() {
  const getDevice = () => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false }
    }

    const width = window.innerWidth
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
    }
  }

  const [device, setDevice] = React.useState(getDevice)

  React.useEffect(() => {
    const onResize = () => setDevice(getDevice())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return device
}

function Section({ eyebrow, title, subtitle, children, id, isMobile, isTablet }) {
  return (
    <section
      id={id}
      style={{
        padding: isMobile ? '3rem 0' : '4rem 0',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: isMobile ? '0 1rem' : '0 1.5rem',
        }}
      >
        {(eyebrow || title || subtitle) && (
          <div
            style={{
              marginBottom: isMobile ? '1.5rem' : '2rem',
              maxWidth: 760,
            }}
          >
            {eyebrow && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 10,
                  fontWeight: 700,
                  opacity: 0.82,
                }}
              >
                {eyebrow}
              </div>
            )}

            {title && (
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isMobile ? 28 : isTablet ? 32 : 36,
                  lineHeight: 1.1,
                  color: 'var(--text)',
                  margin: 0,
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                {title}
              </h2>
            )}

            {subtitle && (
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-3)',
                  fontSize: isMobile ? 14 : 15,
                  lineHeight: 1.75,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, text, isMobile }) {
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: isMobile ? '1rem' : '1.25rem',
        minHeight: isMobile ? 'auto' : 210,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          marginBottom: 14,
        }}
      >
        <Icon size={18} />
      </div>

      <div
        style={{
          fontSize: isMobile ? 16 : 17,
          color: 'var(--text)',
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: isMobile ? 13 : 13,
          color: 'var(--text-3)',
          lineHeight: 1.75,
        }}
      >
        {text}
      </div>
    </div>
  )
}

function MiniMetric({ label, value, color = 'var(--text)', isMobile }) {
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: isMobile ? '0.85rem' : '1rem',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: isMobile ? 19 : 24,
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono)',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function MockInsight({ title, body, accent }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 14,
        background: 'var(--bg)',
        padding: '0.95rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accent,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{title}</span>
      </div>

      <div style={{ color: 'var(--text-3)', fontSize: 12, lineHeight: 1.7 }}>{body}</div>
    </div>
  )
}

function AudienceCard({ icon: Icon, title, text, isMobile }) {
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: isMobile ? '1rem' : '1.25rem',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg-3)',
          color: 'var(--text)',
          marginBottom: 14,
        }}
      >
        <Icon size={18} />
      </div>

      <div
        style={{
          fontSize: isMobile ? 16 : 17,
          color: 'var(--text)',
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.75 }}>{text}</div>
    </div>
  )
}

function Checklist({ items, isMobile }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item) => (
        <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <CheckCircle2
            size={16}
            color="var(--accent)"
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <div
            style={{
              color: 'var(--text-2)',
              fontSize: isMobile ? 13 : 13,
              lineHeight: 1.75,
            }}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  )
}

function PricingCard({ title, price, subtitle, items, ctaLabel, ctaTo, featured, isMobile }) {
  return (
    <div
      style={{
        background: featured
          ? 'linear-gradient(180deg, rgba(200,240,96,0.08), rgba(255,255,255,0.02))'
          : 'var(--bg-2)',
        border: featured ? '1px solid rgba(200,240,96,0.22)' : '1px solid var(--border)',
        borderRadius: 22,
        padding: isMobile ? '1.1rem' : '1.4rem',
        position: 'relative',
      }}
    >
      {featured && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            borderRadius: 999,
            padding: '5px 10px',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          PREMIUM
        </div>
      )}

      <div style={{ fontSize: 20, color: 'var(--text)', fontWeight: 700, marginBottom: 6 }}>
        {title}
      </div>

      <div
        style={{
          fontSize: isMobile ? 28 : 34,
          color: featured ? 'var(--accent)' : 'var(--text)',
          fontWeight: 800,
          marginBottom: 8,
          paddingRight: featured && isMobile ? 84 : 0,
        }}
      >
        {price}
      </div>

      <div
        style={{
          fontSize: 13,
          color: 'var(--text-3)',
          lineHeight: 1.7,
          marginBottom: 16,
        }}
      >
        {subtitle}
      </div>

      <Checklist items={items} isMobile={isMobile} />

      <div style={{ marginTop: 18 }}>
        <Link
          to={ctaTo}
          style={{
            ...(featured ? primaryBtnStyle : ghostBtnStyle),
            width: isMobile ? '100%' : 'auto',
            justifyContent: 'center',
          }}
        >
          {ctaLabel} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}

export default function PublicLandingPage() {
  const { isMobile, isTablet } = useResponsive()

  const pagePadding = isMobile ? '0 1rem' : '0 1.5rem'
  const heroGrid = isMobile ? '1fr' : isTablet ? '1fr' : '1.15fr 0.95fr'
  const threeColGrid = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)'
  const twoColGrid = isMobile ? '1fr' : '1fr 1fr'
  const splitGrid = isMobile ? '1fr' : isTablet ? '1fr' : '1.1fr 0.9fr'
  const metricsGrid = isMobile ? '1fr 1fr' : '1fr 1fr'
  const headerHeight = isMobile ? 'auto' : 68

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backdropFilter: 'blur(12px)',
          background: 'rgba(255, 255, 255, 0.9)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: isMobile ? '0.8rem 1rem' : '0 1.5rem',
            minHeight: headerHeight,
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Brand variant="black" height={isMobile ? 24 : 28} />

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'flex-start' : 'flex-end',
              gap: 10,
              flexWrap: 'wrap',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            {!isMobile && (
              <>
                <a href="#como-funciona" style={navLinkStyle}>Cómo funciona</a>
                <a href="#planes" style={navLinkStyle}>Planes</a>
                <a href="#faq" style={navLinkStyle}>FAQ</a>
              </>
            )}

            <Link
              to="/login"
              style={{
                ...ghostBtnStyle,
                padding: isMobile ? '10px 12px' : '10px 14px',
              }}
            >
              Entrar
            </Link>

            <Link
              to="/login"
              style={{
                ...primaryBtnStyle,
                padding: isMobile ? '10px 12px' : '10px 14px',
              }}
            >
              Empieza gratis <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      <section style={{ padding: isMobile ? '2.5rem 0 2rem 0' : '4.5rem 0 3rem 0' }}>
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: pagePadding,
            display: 'grid',
            gridTemplateColumns: heroGrid,
            gap: isMobile ? 20 : 28,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      border: '1px solid #cfe3a6',
                      background: '#eef5dd',
                      color: '#4f6b1b',
                      borderRadius: 999,
                      padding: '6px 12px',
                      fontSize: 12,
                      marginBottom: 18,
                      fontWeight: 600,
                    }}
            >
              <Shield size={14} />
              Claridad para decidir, no solo para registrar
            </div>

            <h1
              style={{
                margin: 0,
                marginBottom: 18,
                fontFamily: 'var(--font-display)',
                fontSize: isMobile ? 36 : isTablet ? 48 : 62,
                lineHeight: isMobile ? 1.06 : 1.02,
                letterSpacing: '-0.04em',
                color: 'var(--text)',
                fontWeight: 500,
                maxWidth: 760,
              }}
            >
              Ordena tu flujo, domina tu deuda y toma mejores decisiones financieras.
            </h1>

            <p
              style={{
                margin: 0,
                marginBottom: 26,
                maxWidth: 720,
                color: 'var(--text-3)',
                fontSize: isMobile ? 15 : 17,
                lineHeight: 1.75,
              }}
            >
              Compás consolida ingresos, gastos, suscripciones, deudas, inversiones, activos y
              metas en un solo sistema. No se trata solo de mirar números: se trata de entender qué
              mover primero y qué decisión te acerca más a tu patrimonio objetivo.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 22,
              }}
            >
              <Link
                to="/login"
                style={{
                  ...primaryBtnLgStyle,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                Empieza gratis <ArrowRight size={16} />
              </Link>

              <a
                href="#como-funciona"
                style={{
                  ...ghostBtnLgStyle,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                Ver cómo funciona
              </a>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                color: 'var(--text-3)',
                fontSize: 13,
              }}
            >
              <span style={bulletRowStyle}>
                <CheckCircle2 size={14} color="var(--accent)" /> Flujo libre real
              </span>
              <span style={bulletRowStyle}>
                <CheckCircle2 size={14} color="var(--accent)" /> Gestión de deudas
              </span>
              <span style={bulletRowStyle}>
                <CheckCircle2 size={14} color="var(--accent)" /> Escenarios y metas
              </span>
            </div>
          </div>

          <div>
            <div
              style={{
                borderRadius: isMobile ? 20 : 24,
                border: '1px solid var(--border)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                padding: isMobile ? '0.75rem' : '1rem',
                boxShadow: '0 16px 60px rgba(0,0,0,0.25)',
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                }}
              >
                <div style={{ padding: isMobile ? '0.85rem' : '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Vista ejecutiva
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: metricsGrid, gap: 10 }}>
                    <MiniMetric label="Flujo libre mensual" value="$4.8M" color="var(--accent)" isMobile={isMobile} />
                    <MiniMetric label="Pago mensual deuda" value="$6.1M" color="var(--red)" isMobile={isMobile} />
                    <MiniMetric label="Inversión actual" value="$38.5M" color="#5ca8ff" isMobile={isMobile} />
                    <MiniMetric label="Patrimonio financiero" value="$112M" isMobile={isMobile} />
                  </div>
                </div>

                <div style={{ padding: isMobile ? '0.85rem' : '1rem', display: 'grid', gap: 10 }}>
                  <MockInsight
                    title="Recomendación del mes"
                    body="Tienes capacidad para mover más caja a deuda sin romper liquidez. El mayor impacto hoy está en reducir carga financiera."
                    accent="var(--accent)"
                  />
                  <MockInsight
                    title="Comparativo de escenarios"
                    body="Acelerar deuda te libera flujo antes; acelerar inversión te da más patrimonio proyectado si sostienes consistencia."
                    accent="#5ca8ff"
                  />
                  <MockInsight
                    title="Alerta de suscripciones"
                    body="Tus suscripciones ya pesan más de lo recomendable sobre el gasto discrecional. Ahí hay caja rápida para liberar."
                    accent="#ffc266"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section
        id="como-funciona"
        eyebrow="Cómo funciona"
        title="Un solo lugar para entender tu realidad financiera"
        subtitle="Compás conecta flujo, deudas, inversiones y metas. La diferencia no es solo ver el dato, sino entender la decisión."
        isMobile={isMobile}
        isTablet={isTablet}
      >
        <div style={{ display: 'grid', gridTemplateColumns: threeColGrid, gap: 16 }}>
          {FEATURES.map((item) => (
            <FeatureCard key={item.title} {...item} isMobile={isMobile} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Para quién es"
        title="Hecho para personas que ya sienten que sus finanzas merecen un sistema"
        subtitle="Compás no está pensado para llevar gastos por hobby. Está pensado para quien tiene ingresos reales, decisiones importantes y quiere más control."
        isMobile={isMobile}
        isTablet={isTablet}
      >
        <div style={{ display: 'grid', gridTemplateColumns: threeColGrid, gap: 16 }}>
          <AudienceCard
            icon={Users}
            title="Profesionales y directivos"
            text="Para quienes ganan bien, pero tienen varias capas financieras encima: deudas, metas, activos, hijos, decisiones grandes."
            isMobile={isMobile}
          />
          <AudienceCard
            icon={BadgeDollarSign}
            title="Hogares y parejas"
            text="Para organizar flujo compartido, metas familiares, patrimonio y decisiones de caja sin improvisar."
            isMobile={isMobile}
          />
          <AudienceCard
            icon={TrendingUp}
            title="Personas que ya invierten"
            text="Para quienes ya mueven dinero a USD, CDT, crypto, fondos o activos, pero no lo ven todo integrado."
            isMobile={isMobile}
          />
        </div>
      </Section>

      <Section
        eyebrow="Qué obtienes"
        title="Menos ansiedad. Más criterio. Mejor ejecución."
        subtitle="La idea no es abrumarte con dashboards. Es ayudarte a tener un sistema con prioridad, contexto y seguimiento."
        isMobile={isMobile}
        isTablet={isTablet}
      >
        <div style={{ display: 'grid', gridTemplateColumns: splitGrid, gap: 18 }}>
          <div
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: isMobile ? '1.1rem' : '1.4rem',
            }}
          >
            <div style={{ fontSize: 18, color: 'var(--text)', fontWeight: 600, marginBottom: 14 }}>
              Lo que resuelve hoy
            </div>

            <Checklist
              items={[
                'Entender cuánto flujo libre tienes de verdad',
                'Visualizar el peso real de tus deudas',
                'Calcular pago mensual total con seguros y cargos',
                'Comparar deuda vs inversión vs consumo',
                'Registrar ejecución real por período',
                'Conectar metas con caja disponible',
              ]}
              isMobile={isMobile}
            />
          </div>

          <div
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: isMobile ? '1.1rem' : '1.4rem',
            }}
          >
            <div style={{ fontSize: 18, color: 'var(--text)', fontWeight: 600, marginBottom: 14 }}>
              Hacia dónde va
            </div>

            <Checklist items={PREMIUM} isMobile={isMobile} />
          </div>
        </div>
      </Section>

      <Section
        id="planes"
        eyebrow="Planes"
        title="Empieza simple. Escala cuando te aporte más valor."
        subtitle="La versión gratuita debe dejarte ordenar tu situación. La versión premium debe ayudarte a decidir mejor y avanzar más rápido."
        isMobile={isMobile}
        isTablet={isTablet}
      >
        <div style={{ display: 'grid', gridTemplateColumns: twoColGrid, gap: 18 }}>
          <PricingCard
            title="Free"
            price="$0"
            subtitle="Para arrancar y ordenar tu realidad financiera."
            items={[
              'Ingresos, gastos, deudas e inversiones',
              'Resumen básico',
              'Seguimiento básico',
              'Una meta principal',
              'Simulador simple',
            ]}
            ctaLabel="Empieza gratis"
            ctaTo="/login"
            featured={false}
            isMobile={isMobile}
          />

          <PricingCard
            title="Premium"
            price="Próximamente"
            subtitle="Para quien quiere criterio, recomendaciones y mejores decisiones."
            items={[
              'Escenarios avanzados',
              'Health score financiero',
              'Recomendaciones inteligentes',
              'Centro premium de deudas',
              'Alertas y seguimiento más profundo',
              'Modo hogar / pareja',
            ]}
            ctaLabel="Quiero acceso"
            ctaTo="/login"
            featured
            isMobile={isMobile}
          />
        </div>
      </Section>

      <Section
        id="faq"
        eyebrow="FAQ"
        title="Preguntas frecuentes"
        subtitle="Las preguntas correctas aparecen antes de pagar, y mejor responderlas de frente."
        isMobile={isMobile}
        isTablet={isTablet}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {FAQS.map((item) => (
            <div
              key={item.q}
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: isMobile ? '1rem' : '1.1rem 1.2rem',
              }}
            >
              <div
                style={{
                  color: 'var(--text)',
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {item.q}
              </div>

              <div
                style={{
                  color: 'var(--text-3)',
                  fontSize: 13,
                  lineHeight: 1.75,
                }}
              >
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <section style={{ padding: isMobile ? '1.5rem 0 3rem 0' : '2rem 0 4.5rem 0' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: pagePadding }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(200,240,96,0.10), rgba(92,168,255,0.08))',
              border: '1px solid rgba(200,240,96,0.18)',
              borderRadius: 24,
              padding: isMobile ? '1.25rem' : '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 720 }}>
              <div
                style={{
                  fontSize: isMobile ? 26 : 32,
                  lineHeight: 1.08,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-display)',
                  marginBottom: 10,
                }}
              >
                Si tus finanzas ya no caben en un Excel mental, ya necesitas sistema.
              </div>

              <div style={{ fontSize: isMobile ? 14 : 15, color: 'var(--text-3)', lineHeight: 1.75 }}>
                Empieza gratis, ordena tus números y conviértelos en decisiones. Ese es el punto.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <Link
                to="/login"
                style={{
                  ...primaryBtnLgStyle,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                Crear cuenta <ArrowRight size={16} />
              </Link>

              <a
                href="#planes"
                style={{
                  ...ghostBtnLgStyle,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                Ver planes
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.25rem 0 2rem 0' }}>
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: pagePadding,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Brand variant="black" height={22} />
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
              © {new Date().getFullYear()} · Claridad financiera para decidir mejor.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href="#faq" style={footerLinkStyle}>FAQ</a>
            <a href="#planes" style={footerLinkStyle}>Planes</a>
            <Link to="/login" style={footerLinkStyle}>Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

const navLinkStyle = {
  color: 'var(--text-3)',
  textDecoration: 'none',
  fontSize: 13,
}

const footerLinkStyle = {
  color: 'var(--text-3)',
  textDecoration: 'none',
  fontSize: 12,
}

const bulletRowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const primaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  background: 'var(--accent)',
  color: '#0a0a0a',
  fontWeight: 700,
  border: '1px solid transparent',
  boxSizing: 'border-box',
}

const ghostBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  fontWeight: 600,
  boxSizing: 'border-box',
}

const primaryBtnLgStyle = {
  ...primaryBtnStyle,
  padding: '13px 18px',
  fontSize: 14,
}

const ghostBtnLgStyle = {
  ...ghostBtnStyle,
  padding: '13px 18px',
  fontSize: 14,
}