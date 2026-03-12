import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let orgName = 'Mitt företag'
  let credits = 0
  let plan = 'starter'
  let isPastDue = false

  if (user) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, credits_remaining, plan, billing_status')
      .eq('user_id', user.id)
      .single()

    if (org) {
      orgName = org.name || 'Mitt företag'
      credits = org.credits_remaining ?? 0
      plan = org.plan ?? 'starter'
      isPastDue = org.billing_status === 'past_due'
    }
  }

  const planLabel: Record<string, string> = {
    starter: 'Starter-plan',
    growth: 'Growth-plan',
    pro: 'Pro-plan',
  }

  const navLinks = [
    { href: '/', label: 'Översikt' },
    { href: '/chat', label: 'AI-chatt' },
    { href: '/calendar', label: 'Kalender' },
    { href: '/settings', label: 'Inställningar' },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="text-xl font-bold text-indigo-600">Promotely</div>
          <div className="text-sm text-slate-500 mt-1 truncate">{orgName}</div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">{planLabel[plan] ?? 'Starter-plan'}</div>
          <div className="text-sm font-medium text-slate-800 mt-0.5">{credits} credits kvar</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {isPastDue && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-sm text-red-700">
            Betalningsproblem — uppdatera din betalningsmetod för att behålla tillgång.
          </div>
        )}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
