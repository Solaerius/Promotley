'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    industry: '',
    target_audience: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/org')
      .then(r => r.json())
      .then(org => {
        if (org) {
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
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
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
      if (!res.ok) throw new Error()
      router.push('/')
    } catch {
      setError('Något gick fel. Försök igen.')
      setFinishing(false)
    }
  }

  const canFinish = form.name.trim() && form.industry.trim() && form.target_audience.trim()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Välkommen till Promotely</h1>
        <p className="text-slate-500 mb-8">Berätta lite om ditt UF-företag för att komma igång.</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Företagsnamn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onBlur={e => handleBlur('name', e.target.value)}
              placeholder="Mitt UF-företag AB"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bransch <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.industry}
              onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              onBlur={e => handleBlur('industry', e.target.value)}
              placeholder="T.ex. Mode, Teknik, Mat & dryck"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Målgrupp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.target_audience}
              onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
              onBlur={e => handleBlur('target_audience', e.target.value)}
              placeholder="T.ex. Ungdomar 16–25 år, föräldrar"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Beskrivning <span className="text-slate-400 text-xs">(valfri)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              onBlur={e => handleBlur('description', e.target.value)}
              placeholder="Vad säljer ni? Vad gör er unika?"
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-8 flex items-center justify-between">
          {saving && <span className="text-xs text-slate-400">Sparar...</span>}
          {!saving && <span />}
          <button
            onClick={handleFinish}
            disabled={!canFinish || finishing}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {finishing ? 'Sparar...' : 'Slutför'}
          </button>
        </div>
      </div>
    </div>
  )
}
