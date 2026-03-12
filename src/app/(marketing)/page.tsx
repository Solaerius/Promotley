import { Oswald, Outfit } from 'next/font/google'
import Link from 'next/link'

const display = Oswald({ subsets: ['latin'], weight: ['600', '700'] })
const body = Outfit({ subsets: ['latin'], weight: ['400', '500', '600'] })

const stats = [
  { value: '500+', label: 'UF-företag' },
  { value: '50K+', label: 'Inlägg skapade' },
  { value: '4.8★', label: 'Genomsnittsbetyg' },
  { value: '99.9%', label: 'Drifttid' },
]

const features = [
  {
    icon: '🤖',
    title: 'AI-chatt',
    desc: 'Skräddarsydda captions, hashtags och innehållsidéer baserade på ditt UF-företag och din målgrupp.',
  },
  {
    icon: '📊',
    title: 'TikTok-analys',
    desc: 'Synkronisera din TikTok och se följare, visningar, likes och engagemangsgrad i realtid.',
  },
  {
    icon: '📅',
    title: 'Innehållskalender',
    desc: 'Planera och schemalägg inlägg med en visuell kalender. Aldrig mer glömma att posta.',
  },
  {
    icon: '⚡',
    title: 'Snabb start',
    desc: 'Kom igång på under tre minuter. Anslut TikTok, berätta om företaget — AI:n sköter resten.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    sub: 'Perfekt för att komma igång',
    features: ['50 AI-krediter / månad', 'TikTok-analys', 'Innehållskalender', 'AI-chatt (GPT-4o mini)'],
    cta: 'Kom igång gratis',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '99 kr',
    sub: 'per månad',
    features: ['100 AI-krediter / månad', 'Allt i Starter', 'Prioriterad support', 'AI-chatt (GPT-4.1 mini)'],
    cta: 'Välj Growth',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '199 kr',
    sub: 'per månad',
    features: ['200 AI-krediter / månad', 'Allt i Growth', 'GPT-4.1 premium-modell', 'Avancerad analys'],
    cta: 'Välj Pro',
    highlight: false,
  },
]

export default function HomePage() {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .nav-link {
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #ffffff; }
        .btn-ghost {
          color: rgba(255,255,255,0.85);
          border: 1px solid rgba(255,255,255,0.2);
          background: transparent;
          padding: 0.45rem 1.1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.4);
          color: #fff;
        }
        .btn-red {
          background: linear-gradient(135deg, #F03333 0%, #CC0000 100%);
          color: #fff;
          padding: 0.45rem 1.2rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 700;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.15s;
          display: inline-block;
          box-shadow: 0 4px 16px rgba(220,38,38,0.4);
          border: none;
          cursor: pointer;
        }
        .btn-red:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-red-lg {
          background: linear-gradient(135deg, #F03333 0%, #CC0000 100%);
          color: #fff;
          padding: 0.85rem 2.25rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-block;
          box-shadow: 0 6px 24px rgba(220,38,38,0.45);
          transition: opacity 0.2s, transform 0.15s;
        }
        .btn-red-lg:hover { opacity: 0.92; transform: translateY(-2px); }
        .btn-outline-lg {
          color: rgba(255,255,255,0.85);
          border: 1.5px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.04);
          padding: 0.85rem 2.25rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }
        .btn-outline-lg:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.45);
          color: #fff;
        }
        .feature-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 2rem;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(240,51,51,0.3);
          transform: translateY(-3px);
        }
        .plan-card {
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          transition: transform 0.2s;
        }
        .plan-card:hover { transform: translateY(-4px); }
        .plan-card-highlight {
          border-color: #CC0000;
          background: rgba(204,0,0,0.08);
          box-shadow: 0 0 40px rgba(204,0,0,0.2);
        }
        .mockup-float {
          animation: float 5s ease-in-out infinite;
        }
        .hero-animate {
          animation: fadeUp 0.8s ease-out both;
        }
        .hero-animate-1 { animation-delay: 0.1s; }
        .hero-animate-2 { animation-delay: 0.25s; }
        .hero-animate-3 { animation-delay: 0.4s; }
        .hero-animate-4 { animation-delay: 0.55s; }
        .stat-num {
          background: linear-gradient(135deg, #FF5555, #CC0000);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glow-orb {
          animation: pulseGlow 4s ease-in-out infinite;
        }
        .section-tag {
          display: inline-block;
          background: rgba(220,38,38,0.15);
          border: 1px solid rgba(220,38,38,0.35);
          color: #FF6666;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.3rem 0.85rem;
          border-radius: 100px;
          margin-bottom: 1rem;
        }
      `}</style>

      <div className={body.className} style={{ background: '#070101', minHeight: '100vh', overflowX: 'hidden' }}>

        {/* ── Nav ─────────────────────────────────── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(7,1,1,0.75)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Logo */}
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #F03333, #CC0000)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 16 16" style={{ width: 14, height: 14, fill: 'white' }}>
                  <path d="M8 1L1 5v6l7 4 7-4V5L8 1zm0 2.2L13 6.2v3.6L8 12.8 3 9.8V6.2L8 3.2z"/>
                </svg>
              </div>
              <span className={display.className} style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Promotely</span>
            </Link>

            {/* Links */}
            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
              {[['Hem', '/'], ['Hur det fungerar', '#funktioner'], ['Priser', '#priser'], ['FAQ', '#faq']].map(([label, href]) => (
                <a key={label} href={href} className="nav-link">{label}</a>
              ))}
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
              <Link href="/login" className="btn-ghost">Logga in</Link>
              <Link href="/login" className="btn-red">Registrera konto</Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────── */}
        <section style={{ position: 'relative', padding: '7rem 1.5rem 5rem', overflow: 'hidden' }}>
          {/* Glow orbs */}
          <div className="glow-orb" style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(200,20,20,0.35) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div className="glow-orb" style={{ position: 'absolute', top: '20%', right: '-8%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(150,10,10,0.2) 0%, transparent 65%)', pointerEvents: 'none', animationDelay: '2s' }} />

          <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            {/* Left — text */}
            <div>
              <div className="hero-animate hero-animate-1">
                <span className="section-tag">🇸🇪 Byggt för svenska UF-företag</span>
              </div>

              <h1 className={`${display.className} hero-animate hero-animate-2`} style={{
                fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                marginBottom: '1.5rem',
              }}>
                Marknadsför<br />
                <span style={{ background: 'linear-gradient(135deg, #FF5555 0%, #CC0000 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Smartare</span><br />
                Varje Gång
              </h1>

              <p className="hero-animate hero-animate-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 440, marginBottom: '2.5rem' }}>
                AI-driven marknadsföring för UF-företag. Skapa engagerande innehåll, analysera din TikTok och planera din kalender — allt på ett ställe.
              </p>

              <div className="hero-animate hero-animate-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/login" className="btn-red-lg">Kom igång gratis</Link>
                <a href="#priser" className="btn-outline-lg">Se priser</a>
              </div>
            </div>

            {/* Right — product mockup */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="mockup-float" style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
                {/* Glow behind card */}
                <div style={{ position: 'absolute', inset: '-20px', background: 'radial-gradient(circle at 50% 50%, rgba(200,20,20,0.25) 0%, transparent 70%)', borderRadius: 32, pointerEvents: 'none' }} />

                {/* Main analytics card */}
                <div style={{
                  background: 'rgba(18,4,4,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  padding: '1.5rem',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
                }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 500 }}>Synkroniserat nyss</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>TikTok</span>
                  </div>

                  {/* Account handle */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Konto</div>
                    <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>@mitt_uf_foretag</div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.25rem' }}>
                    {[
                      { label: 'Följare', value: '12 847', delta: '+234' },
                      { label: 'Visningar', value: '94 200', delta: '+8.2K' },
                      { label: 'Likes', value: '3 410', delta: '+412' },
                      { label: 'Engagemang', value: '4.3%', delta: '+0.8%' },
                    ].map(({ label, value, delta }) => (
                      <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.875rem' }}>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', marginBottom: '0.35rem', fontWeight: 500 }}>{label}</div>
                        <div className={display.className} style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.25rem' }}>{value}</div>
                        <div style={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 600 }}>{delta} denna vecka</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini bar chart */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.875rem' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginBottom: '0.625rem', fontWeight: 500 }}>Visningar senaste 7 dagarna</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
                      {[40, 65, 45, 80, 70, 90, 100].map((h, i) => (
                        <div key={i} style={{
                          flex: 1,
                          height: `${h}%`,
                          borderRadius: '3px 3px 0 0',
                          background: `linear-gradient(to top, #CC0000, #FF4444)`,
                          opacity: 0.7 + i * 0.04,
                        }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                      {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map(d => (
                        <span key={d} style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', flex: 1, textAlign: 'center' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating AI chip */}
                <div style={{
                  position: 'absolute',
                  top: -16,
                  right: -16,
                  background: 'linear-gradient(135deg, #F03333, #AA0000)',
                  borderRadius: 12,
                  padding: '0.5rem 0.875rem',
                  boxShadow: '0 8px 24px rgba(220,38,38,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}>
                  <span style={{ fontSize: '0.85rem' }}>🤖</span>
                  <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>AI-genererat</span>
                </div>

                {/* Floating caption chip */}
                <div style={{
                  position: 'absolute',
                  bottom: -12,
                  left: -16,
                  background: 'rgba(18,4,4,0.95)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '0.6rem 1rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  maxWidth: 220,
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 600, marginBottom: '0.2rem' }}>✨ NYTT INLÄGG FÖRSLAG</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', lineHeight: 1.4 }}>"Veckans deal — 20% rabatt på allt! 🔥 #uf #ungföretagsamhet"</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ maxWidth: 1160, margin: '5rem auto 0', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '3rem', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem' }}>
            {stats.map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div className={`${display.className} stat-num`} style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginTop: '0.35rem', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────── */}
        <section id="funktioner" style={{ padding: '6rem 1.5rem', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span className="section-tag">Funktioner</span>
              <h2 className={display.className} style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.75rem', lineHeight: 1.1 }}>
                Allt du behöver för att växa
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: 500, margin: '0 auto' }}>
                Från idé till publicerat inlägg — Promotely hjälper dig i varje steg.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {features.map((f) => (
                <div key={f.title} className="feature-card">
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
                  <h3 className={display.className} style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{f.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────── */}
        <section id="priser" style={{ padding: '6rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span className="section-tag">Priser</span>
              <h2 className={display.className} style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.75rem', lineHeight: 1.1 }}>
                Enkla, transparenta priser
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: 420, margin: '0 auto' }}>
                Börja gratis. Uppgradera när din UF-verksamhet växer.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', maxWidth: 920, margin: '0 auto' }}>
              {plans.map((p) => (
                <div key={p.name} className={`plan-card ${p.highlight ? 'plan-card-highlight' : ''}`}>
                  {p.highlight && (
                    <div style={{ background: 'linear-gradient(135deg, #F03333, #CC0000)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 100, display: 'inline-block', marginBottom: '1rem' }}>Populärast</div>
                  )}
                  <div className={display.className} style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>{p.name}</div>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <span className={display.className} style={{ fontSize: '2.5rem', fontWeight: 900, color: p.highlight ? '#FF5555' : '#fff', letterSpacing: '-0.02em' }}>{p.price}</span>
                    {p.sub !== 'Gratis' && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginLeft: '0.35rem' }}>{p.sub}</span>}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '1.25rem 0', paddingTop: '1.25rem' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      {p.features.map(feat => (
                        <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                          <span style={{ color: '#CC0000', fontWeight: 700, flexShrink: 0 }}>✓</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/login" style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    ...(p.highlight
                      ? { background: 'linear-gradient(135deg, #F03333, #CC0000)', color: '#fff', boxShadow: '0 4px 16px rgba(204,0,0,0.4)' }
                      : { background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }
                    ),
                  }}>
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────── */}
        <section id="faq" style={{ padding: '6rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span className="section-tag">FAQ</span>
              <h2 className={display.className} style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Vanliga frågor
              </h2>
            </div>
            {[
              { q: 'Vad är ett UF-företag?', a: 'UF (Ung Företagsamhet) är ett program för gymnasieelever som driver riktiga företag under ett år. Promotely är byggt specifikt för dessa företag.' },
              { q: 'Vad är en AI-kredit?', a: 'En kredit används varje gång du genererar innehåll via AI-chatten. Starter-planen ger 50 krediter per månad — räcker för ca 50 caption-förslag.' },
              { q: 'Kan jag byta plan senare?', a: 'Ja, du kan uppgradera eller nedgradera när som helst. Ändringar gäller från nästa faktureringsperiod.' },
              { q: 'Behöver jag ett TikTok-konto?', a: 'Nej, du kan använda AI-chatten och kalendern utan TikTok. Men för analys behöver du ansluta ditt konto.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem 0' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{q}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.65 }}>{a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ──────────────────────────── */}
        <section style={{ padding: '5rem 1.5rem', background: 'linear-gradient(135deg, rgba(200,20,20,0.15) 0%, rgba(140,10,10,0.1) 100%)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h2 className={display.className} style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1rem' }}>
              Redo att ta ditt UF-företag till nästa nivå?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.65 }}>
              Gå med hundratals UF-företag som redan använder Promotely. Starta gratis idag.
            </p>
            <Link href="/login" className="btn-red-lg" style={{ fontSize: '1.05rem', padding: '0.95rem 2.5rem' }}>
              Kom igång gratis →
            </Link>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────── */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '2.5rem 1.5rem' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #F03333, #CC0000)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 16 16" style={{ width: 12, height: 12, fill: 'white' }}>
                  <path d="M8 1L1 5v6l7 4 7-4V5L8 1zm0 2.2L13 6.2v3.6L8 12.8 3 9.8V6.2L8 3.2z"/>
                </svg>
              </div>
              <span className={display.className} style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>Promotely</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
              © 2026 Promotely — ett UF-företag · Från UF till UF
            </div>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              {['Villkor', 'Integritet', 'Kontakt'].map(link => (
                <a key={link} href="#" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', textDecoration: 'none', transition: 'color 0.2s' }}
                   onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                   onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                >{link}</a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
