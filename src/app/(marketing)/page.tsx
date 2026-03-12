import { Syne, DM_Sans } from 'next/font/google'
import Link from 'next/link'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

const features = [
  {
    icon: '🤖',
    title: 'AI-chatt',
    description:
      'Få skräddarsydda caption-förslag, hashtags och innehållsidéer baserade på ditt UF-företag.',
  },
  {
    icon: '📊',
    title: 'TikTok-analys',
    description:
      'Synkronisera din TikTok och se följare, visningar, likes och engagemangsgrad i realtid.',
  },
  {
    icon: '📅',
    title: 'Innehållskalender',
    description:
      'Planera och schemalägg dina inlägg med en visuell kalender.',
  },
  {
    icon: '⚡',
    title: 'Snabb start',
    description:
      'Kom igång på minuter. Anslut TikTok, berätta om ditt företag och låt AI:n göra jobbet.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    description: '50 krediter/mån. AI-chatt, TikTok-analys, Kalender.',
    cta: 'Kom igång gratis',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '99 kr/mån',
    description: '100 krediter/mån. Allt i Starter + prioriterad support.',
    cta: 'Välj Growth',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '199 kr/mån',
    description: '200 krediter/mån. Allt i Growth + GPT-4.1 premium-modell.',
    cta: 'Välj Pro',
    highlighted: false,
  },
]

export default function MarketingHomePage() {
  return (
    <div className={dmSans.className} style={{ backgroundColor: '#ffffff' }}>

      {/* Nav */}
      <header
        style={{
          background: 'linear-gradient(135deg, #DC2626, #9333EA, #6D28D9)',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          <span
            className={syne.className}
            style={{ color: '#ffffff', fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Promotely
          </span>
          <Link
            href="/login"
            style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1.5px solid rgba(255,255,255,0.6)',
              borderRadius: '0.5rem',
              padding: '0.4rem 1rem',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            Logga in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #DC2626, #9333EA, #6D28D9)',
          padding: '6rem 1.5rem 7rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h1
            className={syne.className}
            style={{
              color: '#ffffff',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}
          >
            Den bästa marknadsföringen börjar med rätt ord.
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              lineHeight: 1.65,
              marginBottom: '2.5rem',
              maxWidth: '640px',
              margin: '0 auto 2.5rem',
            }}
          >
            AI-driven marknadsföring för svenska UF-företag. Skapa innehåll som engagerar,
            analysera din TikTok och planera din kalender — allt på ett ställe.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                backgroundColor: '#ffffff',
                color: '#DC2626',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.8rem 1.75rem',
                borderRadius: '0.625rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              }}
            >
              Kom igång gratis
            </Link>
            <a
              href="#priser"
              style={{
                display: 'inline-block',
                backgroundColor: 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.95rem',
                padding: '0.8rem 1.75rem',
                borderRadius: '0.625rem',
                textDecoration: 'none',
                border: '1.5px solid rgba(255,255,255,0.65)',
              }}
            >
              Se priser
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ backgroundColor: '#F8F7FF', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2
            className={syne.className}
            style={{
              textAlign: 'center',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 800,
              color: '#1e1b4b',
              marginBottom: '3rem',
              letterSpacing: '-0.02em',
            }}
          >
            Allt du behöver för att växa
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  padding: '1.75rem',
                  boxShadow: '0 1px 6px rgba(109,40,217,0.08)',
                  border: '1px solid rgba(109,40,217,0.08)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3
                  className={syne.className}
                  style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e1b4b', marginBottom: '0.5rem' }}
                >
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" style={{ backgroundColor: '#ffffff', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2
            className={syne.className}
            style={{
              textAlign: 'center',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 800,
              color: '#1e1b4b',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}
          >
            Enkla priser
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: '#64748b',
              fontSize: '1rem',
              marginBottom: '3rem',
            }}
          >
            Kom igång gratis — uppgradera när du är redo.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            {plans.map((p) => (
              <div
                key={p.name}
                style={{
                  borderRadius: '1rem',
                  padding: '2rem',
                  border: p.highlighted
                    ? '2px solid #9333EA'
                    : '1px solid #e2e8f0',
                  backgroundColor: p.highlighted ? '#faf5ff' : '#ffffff',
                  boxShadow: p.highlighted
                    ? '0 8px 24px rgba(147,51,234,0.15)'
                    : '0 1px 4px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div>
                  <div
                    className={syne.className}
                    style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1e1b4b' }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: p.highlighted ? '#9333EA' : '#1e1b4b',
                      marginTop: '0.5rem',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {p.price}
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, flexGrow: 1 }}>
                  {p.description}
                </p>
                <Link
                  href="/login"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    backgroundColor: p.highlighted ? '#9333EA' : 'transparent',
                    color: p.highlighted ? '#ffffff' : '#9333EA',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    padding: '0.7rem 1.25rem',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    border: p.highlighted ? 'none' : '1.5px solid #9333EA',
                  }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: '#1e1b4b',
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          fontSize: '0.85rem',
          padding: '2rem 1.5rem',
        }}
      >
        © 2026 Promotely — ett UF-företag · Från UF till UF
      </footer>
    </div>
  )
}
