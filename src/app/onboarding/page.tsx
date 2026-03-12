'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Oswald, Outfit } from 'next/font/google'

const display = Oswald({ subsets: ['latin'], weight: ['600', '700'] })
const body = Outfit({ subsets: ['latin'], weight: ['400', '500', '600'] })

const steps = [
  { field: 'name', label: 'Företagsnamn', placeholder: 'Mitt UF-företag AB', required: true, type: 'text' },
  { field: 'industry', label: 'Bransch', placeholder: 'T.ex. Mode, Teknik, Mat & dryck', required: true, type: 'text' },
  { field: 'target_audience', label: 'Målgrupp', placeholder: 'T.ex. Ungdomar 16–25 år, föräldrar', required: true, type: 'text' },
  { field: 'description', label: 'Beskrivning', placeholder: 'Vad säljer ni? Vad gör er unika?', required: false, type: 'textarea' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', industry: '', target_audience: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/org')
      .then(r => r.json())
      .then(org => {
        if (org?.id) {
          setForm({
            name: org.name ?? '',
            industry: org.industry ?? '',
            target_audience: org.target_audience ?? '',
            description: org.description ?? '',
          })
        }
      })
      .catch(() => {})
  }, [])

  async function handleBlur(field: string, value: string) {
    setSaving(true)
    try {
      await fetch('/api/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  async function handleFinish() {
    setFinishing(true)
    setError(null)
    try {
      const res = await fetch('/api/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'unknown')
      }
      router.push('/dashboard')
    } catch (err) {
      setError('Något gick fel. Försök igen.')
      setFinishing(false)
    }
  }

  const canFinish = form.name.trim() && form.industry.trim() && form.target_audience.trim()
  const progress = [form.name, form.industry, form.target_audience, form.description].filter(v => v.trim()).length

  return (
    <>
      <style>{`
        .ob-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          font-family: inherit;
        }
        .ob-input::placeholder { color: rgba(255,255,255,0.25); }
        .ob-input:focus {
          border-color: rgba(220,38,38,0.6);
          background: rgba(255,255,255,0.08);
        }
        .ob-btn-finish {
          padding: 0.75rem 2rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 700;
          font-family: inherit;
          transition: opacity 0.2s, transform 0.15s;
          background: linear-gradient(135deg, #F03333, #CC0000);
          color: #fff;
          box-shadow: 0 4px 16px rgba(204,0,0,0.35);
        }
        .ob-btn-finish:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .ob-btn-finish:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
      `}</style>

      <div className={body.className} style={{
        minHeight: '100vh',
        background: '#070101',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(200,20,20,0.25) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(150,10,10,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 520, position: 'relative' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #F03333, #CC0000)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 16 16" style={{ width: 14, height: 14, fill: 'white' }}>
                  <path d="M8 1L1 5v6l7 4 7-4V5L8 1zm0 2.2L13 6.2v3.6L8 12.8 3 9.8V6.2L8 3.2z"/>
                </svg>
              </div>
              <span className={display.className} style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>Promotely</span>
            </div>
            <h1 className={display.className} style={{ color: '#fff', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
              Välkommen!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
              Berätta om ditt UF-företag — tar bara en minut.
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>Profil</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{progress}/4 fält</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(progress / 4) * 100}%`, background: 'linear-gradient(90deg, #F03333, #CC0000)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '2rem',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {steps.map(({ field, label, placeholder, required, type }) => (
                <div key={field}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    {label}
                    {required
                      ? <span style={{ color: '#F03333', marginLeft: '0.25rem' }}>*</span>
                      : <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: '0.35rem', fontSize: '0.72rem', fontWeight: 400 }}>(valfri)</span>
                    }
                  </label>
                  {type === 'textarea' ? (
                    <textarea
                      value={form[field as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      onBlur={e => handleBlur(field, e.target.value)}
                      placeholder={placeholder}
                      rows={3}
                      className="ob-input"
                      style={{ resize: 'none' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[field as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      onBlur={e => handleBlur(field, e.target.value)}
                      placeholder={placeholder}
                      className="ob-input"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div style={{ marginTop: '1.25rem', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '0.625rem 0.875rem', color: '#FF8080', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
                {saving ? '💾 Sparar...' : ''}
              </span>
              <button onClick={handleFinish} disabled={!canFinish || finishing} className="ob-btn-finish">
                {finishing ? 'Sparar...' : 'Slutför →'}
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
            Från UF till UF — byggt av ett UF-företag för UF-företag
          </p>
        </div>
      </div>
    </>
  )
}
