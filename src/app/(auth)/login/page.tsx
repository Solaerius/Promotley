'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    const supabase = createClient()

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(translateError(authError.message))
        setLoading(false)
        return
      }
      router.push('/')
    } else {
      const { error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) {
        setError(translateError(authError.message))
        setLoading(false)
        return
      }
      setSuccessMessage('Konto skapat! Kontrollera din e-post för att bekräfta.')
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/api/auth/callback',
      },
    })
  }

  function translateError(message: string): string {
    if (message.includes('Invalid login credentials')) return 'Fel e-postadress eller lösenord.'
    if (message.includes('Email not confirmed')) return 'Bekräfta din e-post innan du loggar in.'
    if (message.includes('User already registered')) return 'Det finns redan ett konto med den e-postadressen.'
    if (message.includes('Password should be at least')) return 'Lösenordet måste vara minst 6 tecken.'
    if (message.includes('Unable to validate email address')) return 'Ogiltig e-postadress.'
    return 'Något gick fel. Försök igen.'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #DC2626, #9333EA, #6D28D9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          {/* Card header — gradient strip */}
          <div
            style={{
              background: 'linear-gradient(135deg, #DC2626, #9333EA, #6D28D9)',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            {/* Logo mark */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', fill: 'white' }} aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <div style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Promotely
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              AI-marknadsföring för UF-företag
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '2rem' }}>

            {/* Mode toggle tabs */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                borderRadius: '0.625rem',
                padding: '0.25rem',
                marginBottom: '1.5rem',
              }}
            >
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); setSuccessMessage(null) }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                    backgroundColor: mode === m ? '#ffffff' : 'transparent',
                    color: mode === m ? '#9333EA' : '#64748b',
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Logga in' : 'Skapa konto'}
                </button>
              ))}
            </div>

            {/* Email/password form */}
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label
                  htmlFor="email"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}
                >
                  E-postadress
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@exempel.se"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: '#1e293b',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}
                >
                  Lösenord
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: '#1e293b',
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.85rem',
                    color: '#DC2626',
                  }}
                >
                  {error}
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.85rem',
                    color: '#15803d',
                  }}
                >
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.625rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading
                    ? '#c4b5fd'
                    : 'linear-gradient(135deg, #DC2626, #9333EA)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Laddar...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
              </button>
            </form>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: '1.25rem 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>— eller —</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.7rem 1.25rem',
                borderRadius: '0.625rem',
                border: '1.5px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', flexShrink: 0 }} aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Fortsätt med Google
            </button>

            {/* Footer note */}
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem', lineHeight: 1.5 }}>
              Från UF till UF — byggt av ett UF-företag för UF-företag
            </p>
          </div>
        </div>

        {/* Sub-footer */}
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          Genom att logga in godkänner du våra{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>användarvillkor</span>
          {' '}och{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>integritetspolicy</span>.
        </p>
      </div>
    </div>
  )
}
