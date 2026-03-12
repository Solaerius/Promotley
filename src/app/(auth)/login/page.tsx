'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Oswald, Outfit } from 'next/font/google'

const display = Oswald({ subsets: ['latin'], weight: ['600', '700'] })
const body = Outfit({ subsets: ['latin'], weight: ['400', '500', '600'] })

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    const supabase = createClient()

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(translateError(err.message)); setLoading(false); return }
      router.push('/')
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(translateError(err.message)); setLoading(false); return }
      setSuccess('Konto skapat! Kontrollera din e-post för att bekräfta.')
      setLoading(false)
    }
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/api/auth/callback' },
    })
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Fel e-postadress eller lösenord.'
    if (msg.includes('Email not confirmed')) return 'Bekräfta din e-post innan du loggar in.'
    if (msg.includes('User already registered')) return 'Det finns redan ett konto med den e-postadressen.'
    if (msg.includes('Password should be at least')) return 'Lösenordet måste vara minst 6 tecken.'
    if (msg.includes('Unable to validate email')) return 'Ogiltig e-postadress.'
    return 'Något gick fel. Försök igen.'
  }

  return (
    <>
      <style>{`
        .login-input {
          width: 100%;
          padding: 0.7rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          font-family: inherit;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.3); }
        .login-input:focus {
          border-color: rgba(220,38,38,0.7);
          background: rgba(255,255,255,0.09);
        }
        .tab-btn {
          flex: 1;
          padding: 0.5rem;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.15s;
          font-family: inherit;
        }
        .tab-active {
          background: linear-gradient(135deg, #F03333, #CC0000);
          color: #fff;
          box-shadow: 0 2px 8px rgba(204,0,0,0.4);
        }
        .tab-inactive {
          background: transparent;
          color: rgba(255,255,255,0.45);
        }
        .tab-inactive:hover { color: rgba(255,255,255,0.75); }
        .btn-submit {
          width: 100%;
          padding: 0.8rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 700;
          font-family: inherit;
          transition: opacity 0.2s, transform 0.15s;
          background: linear-gradient(135deg, #F03333, #CC0000);
          color: #fff;
          box-shadow: 0 4px 16px rgba(204,0,0,0.35);
        }
        .btn-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.85);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s, border-color 0.2s;
        }
        .btn-google:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.25);
        }
      `}</style>

      <div className={body.className} style={{
        minHeight: '100vh',
        background: '#070101',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(200,20,20,0.3) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(150,10,10,0.2) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #F03333, #CC0000)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(204,0,0,0.4)' }}>
                <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, fill: 'white' }}>
                  <path d="M8 1L1 5v6l7 4 7-4V5L8 1zm0 2.2L13 6.2v3.6L8 12.8 3 9.8V6.2L8 3.2z"/>
                </svg>
              </div>
              <span className={display.className} style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.02em' }}>Promotely</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>AI-marknadsföring för UF-företag</p>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 16,
            padding: '2rem',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.25rem', marginBottom: '1.5rem', gap: '0.25rem' }}>
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                  className={`tab-btn ${mode === m ? 'tab-active' : 'tab-inactive'}`}
                >
                  {m === 'login' ? 'Logga in' : 'Skapa konto'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  E-postadress
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="du@exempel.se"
                  className="login-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Lösenord
                </label>
                <input
                  type="password"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input"
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '0.625rem 0.875rem', color: '#FF8080', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '0.625rem 0.875rem', color: '#4ade80', fontSize: '0.85rem' }}>
                  {success}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-submit" style={{ marginTop: '0.25rem' }}>
                {loading ? 'Laddar...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>eller</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Google */}
            <button onClick={handleGoogle} type="button" className="btn-google">
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Fortsätt med Google
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', lineHeight: 1.5 }}>
            Genom att logga in godkänner du våra användarvillkor och integritetspolicy.
          </p>
          <p style={{ textAlign: 'center', marginTop: '0.75rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
            Från UF till UF — byggt av ett UF-företag för UF-företag
          </p>
        </div>
      </div>
    </>
  )
}
