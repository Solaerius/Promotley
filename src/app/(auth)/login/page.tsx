'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/api/auth/callback',
      },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl px-10 py-12 flex flex-col items-center gap-6">

          {/* Logo mark */}
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>

          {/* Heading */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Promotely</h1>
            <p className="text-slate-500 text-sm font-medium">AI-marknadsföring för UF-företag</p>
          </div>

          {/* Divider */}
          <div className="w-full border-t border-slate-100" />

          {/* Sign-in prompt */}
          <p className="text-slate-600 text-sm text-center">
            Logga in med ditt Google-konto för att fortsätta.
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            type="button"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Fortsätt med Google
          </button>

          {/* Divider */}
          <div className="w-full border-t border-slate-100" />

          {/* Footer */}
          <p className="text-slate-400 text-xs text-center leading-relaxed">
            Från UF till UF — byggt av ett UF-företag för UF-företag
          </p>
        </div>

        {/* Sub-footer */}
        <p className="mt-6 text-center text-slate-500 text-xs">
          Genom att logga in godkänner du våra{' '}
          <span className="underline underline-offset-2 cursor-pointer hover:text-slate-300 transition-colors">
            användarvillkor
          </span>
          {' '}och{' '}
          <span className="underline underline-offset-2 cursor-pointer hover:text-slate-300 transition-colors">
            integritetspolicy
          </span>
          .
        </p>
      </div>
    </div>
  )
}
