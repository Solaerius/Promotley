# Promotely Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the project foundation — dependencies, database schema, auth, middleware, onboarding form, and dashboard shell.

**Architecture:** Next.js 16 App Router monolith. Supabase handles Postgres and Google OAuth via session cookies. Middleware enforces auth and onboarding guards on all non-API routes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, `@supabase/supabase-js`, `@supabase/ssr`, Vitest + Testing Library for tests.

---

## File Map

**New files:**
- `supabase/migrations/20260312000000_initial_schema.sql` — all tables, RLS policies, seed
- `src/types/database.ts` — TypeScript types + plan constants
- `src/lib/supabase/client.ts` — browser Supabase client factory
- `src/lib/supabase/server.ts` — server + service-role client factories
- `src/lib/format.ts` — `formatEngagementRate` utility
- `src/lib/__tests__/format.test.ts` — unit tests for format utility
- `src/app/api/org/__tests__/route.test.ts` — unit tests for /api/org handlers
- `src/middleware.ts` — route guards (auth + onboarding redirect)
- `src/app/api/auth/callback/route.ts` — Supabase OAuth code exchange
- `src/app/api/org/route.ts` — GET + PATCH org
- `src/app/(auth)/login/page.tsx` — Google sign-in page
- `src/app/onboarding/page.tsx` — company setup form
- `src/app/(dashboard)/layout.tsx` — sidebar + credit counter + billing banner
- `src/app/(dashboard)/page.tsx` — dashboard placeholder
- `src/app/(dashboard)/chat/page.tsx` — placeholder
- `src/app/(dashboard)/calendar/page.tsx` — placeholder
- `src/app/(dashboard)/settings/page.tsx` — placeholder
- `src/test-setup.ts` — Vitest global setup
- `vitest.config.ts` — Vitest config
- `.env.local.example` — env var documentation
- `vercel.json` — maxDuration + cron config

**Modified:**
- `package.json` — add deps + `test` / `test:run` scripts
- `src/app/layout.tsx` — update title, description, set `lang="sv"`

**Deleted:**
- `src/app/page.tsx` — replaced by `src/app/(dashboard)/page.tsx`

---

## Chunk 1: Project Setup

### Task 1: Install Dependencies & Configure Environment

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test-setup.ts`
- Create: `.env.local.example`
- Create: `vercel.json`

- [ ] **Step 1.1: Install runtime dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 1.2: Install dev dependencies**

```bash
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

Expected: dev deps added to `package.json`.

- [ ] **Step 1.3: Add test scripts to package.json**

Open `package.json`. In the `"scripts"` section add:
```json
"test": "vitest",
"test:run": "vitest run"
```

Full scripts block should look like:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 1.4: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 1.5: Create `src/test-setup.ts`**

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 1.6: Create `.env.local.example`**

```bash
# Supabase — copy from your project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cron secret — generate with: openssl rand -hex 32
CRON_SECRET=your-cron-secret

# ---
# Copy this file to .env.local and fill in real values.
# .env.local is gitignored — never commit secrets.
```

- [ ] **Step 1.7: Create `vercel.json`**

The `functions` key uses the file path relative to the project root. For Next.js App Router on Vercel, the correct key is `src/app/api/chat/route.ts`. If the 60s limit is not applied after deploy, verify in the Vercel dashboard under Functions that the route shows the custom duration — if not, try `app/api/chat/route.ts` (without `src/`).

```json
{
  "functions": {
    "src/app/api/chat/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/tiktok/sync-all",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/uf-rules",
      "schedule": "0 6 * * 1"
    }
  ]
}
```

- [ ] **Step 1.8: Copy env template and create Supabase project**

```bash
cp .env.local.example .env.local
```

Then:
1. Create a project at supabase.com
2. Go to Project Settings → API and copy the URL and anon key into `.env.local`
3. Copy the service role key into `.env.local`
4. Go to Authentication → Providers → Google and enable Google OAuth
5. Add `http://localhost:3000/api/auth/callback` to the allowed redirect URLs in Authentication → URL Configuration

- [ ] **Step 1.9: Verify Vitest runs cleanly with no tests**

```bash
npm run test:run
```

Expected: exits 0 with `No test files found` or similar.

- [ ] **Step 1.10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test-setup.ts .env.local.example vercel.json
git commit -m "chore: add supabase, vitest, and project config"
```

---

### Task 2: Database Schema Migration

**Files:**
- Create: `supabase/migrations/20260312000000_initial_schema.sql`

- [ ] **Step 2.1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2.2: Create the schema migration file**

Create `supabase/migrations/20260312000000_initial_schema.sql`:

```sql
-- ================================================================
-- Tables
-- ================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'growth', 'pro')),
  credits_remaining INTEGER NOT NULL DEFAULT 50
    CHECK (credits_remaining >= 0),
  credits_reset_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_status TEXT NOT NULL DEFAULT 'active'
    CHECK (billing_status IN ('active', 'past_due', 'cancelled')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- access_token and refresh_token are stored as AES-256 encrypted strings.
-- Encryption/decryption is handled at the application layer (lib/crypto.ts, built in Plan 2).
-- The column type TEXT correctly holds the encrypted ciphertext.
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  access_token TEXT NOT NULL,    -- encrypted at rest (app-layer AES-256)
  refresh_token TEXT NOT NULL,   -- encrypted at rest (app-layer AES-256)
  token_expires_at TIMESTAMPTZ NOT NULL,
  account_handle TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'needs_reauth')),
  UNIQUE (org_id, platform)
);

CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  date DATE NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, date)
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  scheduled_date DATE NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  video_idea TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'posted', 'deleted')),
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-row table; id fixed to 1 enforces the invariant.
-- All writes MUST use: INSERT ... ON CONFLICT (id) DO UPDATE SET content=..., fetched_at=...
CREATE TABLE uf_rules_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with hardcoded fallback
INSERT INTO uf_rules_cache (id, content)
VALUES (
  1,
  'UF-företag ska följa Ung Företagsamhets riktlinjer för marknadsföring. Innehåll ska vara sanningsenligt, inte vilseledande och följa svenska marknadsföringslagar. Överdrivna påståenden om intäkter, tillväxt eller resultat är inte tillåtna.'
)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Row-Level Security
-- ================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE uf_rules_cache ENABLE ROW LEVEL SECURITY;

-- organizations: each user manages their own org only
CREATE POLICY "org_owner" ON organizations
  FOR ALL USING (user_id = auth.uid());

-- social_connections, analytics_snapshots, chat_messages: org-scoped
CREATE POLICY "sc_owner" ON social_connections
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
  );

CREATE POLICY "snap_owner" ON analytics_snapshots
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
  );

CREATE POLICY "msg_owner" ON chat_messages
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
  );

-- calendar_events: SELECT hides soft-deleted rows; INSERT/UPDATE are org-scoped
CREATE POLICY "event_owner_select" ON calendar_events
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
    AND status != 'deleted'
  );

CREATE POLICY "event_owner_insert" ON calendar_events
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
  );

-- WITH CHECK required so updating status to 'deleted' is always allowed
-- (the row becomes invisible to SELECT after update, but UPDATE itself must not be blocked)
CREATE POLICY "event_owner_update" ON calendar_events
  FOR UPDATE
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- uf_rules_cache: read-only for authenticated users; writes via service role only
CREATE POLICY "uf_rules_read" ON uf_rules_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);
```

- [ ] **Step 2.3: Apply migration in Supabase**

Go to your Supabase project → SQL Editor. Paste the full contents of the migration file and click Run.

Verify: open the Table Editor and confirm all 6 tables appear with correct columns and constraints.

- [ ] **Step 2.4: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with RLS policies"
```

---

## Chunk 2: Types, Clients & Format Utility

### Task 3: TypeScript Database Types

**Files:**
- Create: `src/types/database.ts`

- [ ] **Step 3.1: Create `src/types/database.ts`**

```typescript
// src/types/database.ts

export type Plan = 'starter' | 'growth' | 'pro'
export type BillingStatus = 'active' | 'past_due' | 'cancelled'
export type Platform = 'tiktok' | 'instagram'
export type EventStatus = 'draft' | 'scheduled' | 'posted' | 'deleted'
export type ConnectionStatus = 'connected' | 'needs_reauth'
export type MessageRole = 'user' | 'assistant'

export interface Organization {
  id: string
  user_id: string
  name: string
  industry: string
  target_audience: string
  description: string
  plan: Plan
  credits_remaining: number
  credits_reset_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_status: BillingStatus
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface SocialConnection {
  id: string
  org_id: string
  platform: Platform
  access_token: string
  refresh_token: string
  token_expires_at: string
  account_handle: string | null
  connected_at: string
  status: ConnectionStatus
}

export interface AnalyticsSnapshot {
  id: string
  org_id: string
  platform: Platform
  date: string
  followers: number
  views: number
  likes: number
  comments: number
  shares: number
  impressions: number
  profile_views: number
  engagement_rate: number
  created_at: string
}

export interface CalendarEvent {
  id: string
  org_id: string
  platform: Platform
  scheduled_date: string
  caption: string
  hashtags: string[]
  video_idea: string
  status: EventStatus
  ai_generated: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  org_id: string
  role: MessageRole
  content: string
  credits_used: number
  model_used: string
  created_at: string
}

export interface UfRulesCache {
  id: number
  content: string
  fetched_at: string
}

/** Monthly credit allowance per plan */
export const PLAN_CREDITS: Record<Plan, number> = {
  starter: 50,
  growth: 100,
  pro: 200,
}

/** Default (standard) model per plan */
export const PLAN_MODEL: Record<Plan, string> = {
  starter: 'gpt-4o-mini',
  growth: 'gpt-4.1-mini',
  pro: 'gpt-4.1-mini',
}

/** Premium model available on Pro plan only */
export const PRO_PREMIUM_MODEL = 'gpt-4.1'

/**
 * Returns the allowed model strings for a given plan.
 * Used server-side in /api/chat to validate the requested model.
 * Non-Pro users may only use their plan's standard model.
 */
export function getAllowedModels(plan: Plan): string[] {
  if (plan === 'pro') return [PLAN_MODEL.pro, PRO_PREMIUM_MODEL]
  return [PLAN_MODEL[plan]]
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add TypeScript database types and plan constants"
```

---

### Task 4: Format Utility (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Create: `src/lib/__tests__/format.test.ts`

- [ ] **Step 4.1: Write failing tests first**

```typescript
// src/lib/__tests__/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatEngagementRate } from '../format'

describe('formatEngagementRate', () => {
  it('formats a decimal ratio to a percentage string with 1 decimal', () => {
    expect(formatEngagementRate(0.043)).toBe('4.3%')
  })

  it('formats zero', () => {
    expect(formatEngagementRate(0)).toBe('0.0%')
  })

  it('rounds to 1 decimal place', () => {
    expect(formatEngagementRate(0.1234)).toBe('12.3%')
  })

  it('handles 100%', () => {
    expect(formatEngagementRate(1)).toBe('100.0%')
  })

  it('rounds up correctly at the midpoint', () => {
    expect(formatEngagementRate(0.0555)).toBe('5.6%')
  })
})
```

- [ ] **Step 4.2: Run to confirm tests fail**

```bash
npm run test:run -- src/lib/__tests__/format.test.ts
```

Expected: `Cannot find module '../format'` or similar.

- [ ] **Step 4.3: Implement `src/lib/format.ts`**

```typescript
// src/lib/format.ts

/**
 * Converts a decimal engagement rate (e.g. 0.043) to a display string (e.g. "4.3%").
 * Used consistently in system prompt construction and analytics UI.
 */
export function formatEngagementRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}
```

- [ ] **Step 4.4: Run tests and confirm all pass**

```bash
npm run test:run -- src/lib/__tests__/format.test.ts
```

Expected: `5 passed`.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/format.ts src/lib/__tests__/format.test.ts
git commit -m "feat: add formatEngagementRate utility with tests"
```

---

### Task 5: Supabase Client Utilities

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 5.1: Create browser client**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5.2: Create server client**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

/**
 * Creates a Supabase client using the service role key.
 * Bypasses RLS — use only in cron routes validated with CRON_SECRET.
 *
 * Uses no-op cookie handlers because cron routes have no browser request
 * context — next/headers cookies() is unavailable in that environment.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
```

- [ ] **Step 5.3: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase browser and server client utilities"
```

---

## Chunk 3: Middleware & Auth

### Task 6: Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 6.1: Write `src/middleware.ts`**

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Not authenticated
  if (!user) {
    if (path === '/login') return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated — check onboarding
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  // org is null when no row exists (first login, before GET /api/org creates it).
  // org?.onboarding_completed evaluates to undefined → false → redirects to /onboarding.
  // This is correct: the user must complete onboarding before accessing the dashboard.
  const onboardingDone = org?.onboarding_completed === true

  if (!onboardingDone) {
    if (path === '/onboarding') return supabaseResponse
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Onboarding done — redirect away from auth pages
  if (path === '/login' || path === '/onboarding') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Exclude API routes, Next.js internals, and static assets
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add middleware for auth and onboarding route guards"
```

---

### Task 7: Auth Callback Route

**Files:**
- Create: `src/app/api/auth/callback/route.ts`

- [ ] **Step 7.1: Create the OAuth callback handler**

```typescript
// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // User denied OAuth consent or provider returned an error
  if (error || !code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()
  await supabase.auth.exchangeCodeForSession(code)

  // Redirect to root — middleware handles /onboarding vs / based on org state
  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 7.2: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat: add Supabase OAuth callback route"
```

---

### Task 8: Login Page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 8.1: Create login page**

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Promotely</h1>
        <p className="text-gray-500 text-sm mb-8">
          AI-marknadsföring för UF-företag
        </p>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {/* Google logo */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Logga in med Google
        </button>
        <p className="text-xs text-gray-400 mt-6">
          Från UF till UF — byggt av ett UF-företag för UF-företag
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2: Commit**

```bash
git add src/app/(auth)/
git commit -m "feat: add Google sign-in login page"
```

---

## Chunk 4: Org API Route & Onboarding

### Task 9: /api/org Route (TDD)

**Files:**
- Create: `src/app/api/org/__tests__/route.test.ts`
- Create: `src/app/api/org/route.ts`

- [ ] **Step 9.1: Write failing tests**

```typescript
// src/app/api/org/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing route handlers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

const mockOrg = {
  id: 'org-1',
  user_id: 'user-1',
  name: 'Test UF',
  industry: 'Tech',
  target_audience: 'Youth',
  description: '',
  plan: 'starter',
  credits_remaining: 50,
  credits_reset_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  billing_status: 'active',
  onboarding_completed: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

let GET: typeof import('../route').GET
let PATCH: typeof import('../route').PATCH

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  const mod = await import('../route')
  GET = mod.GET
  PATCH = mod.PATCH
})

describe('GET /api/org', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(new NextRequest('http://localhost/api/org'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('unauthorized')
  })

  it('returns existing org for authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
    })
    const res = await GET(new NextRequest('http://localhost/api/org'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.org.id).toBe('org-1')
  })

  it('creates and returns a new org when none exists', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    const newOrg = { ...mockOrg, id: 'org-new' }
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newOrg, error: null }),
      })
    const res = await GET(new NextRequest('http://localhost/api/org'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.org.id).toBe('org-new')
  })
})

describe('PATCH /api/org', () => {
  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(
      new NextRequest('http://localhost/api/org', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('updates allowed fields and returns updated org', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    const updatedOrg = { ...mockOrg, name: 'Updated UF' }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedOrg, error: null }),
    })
    const res = await PATCH(
      new NextRequest('http://localhost/api/org', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated UF' }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.org.name).toBe('Updated UF')
  })

  it('strips fields not in the allowlist (e.g. credits_remaining)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    const updateMock = vi.fn().mockReturnThis()
    mockSupabase.from.mockReturnValue({
      update: updateMock,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
    })
    await PATCH(
      new NextRequest('http://localhost/api/org', {
        method: 'PATCH',
        body: JSON.stringify({ credits_remaining: 9999, name: 'Safe Name' }),
      })
    )
    const updateArg = updateMock.mock.calls[0][0]
    expect(updateArg.credits_remaining).toBeUndefined()
    expect(updateArg.name).toBe('Safe Name')
  })
})
```

- [ ] **Step 9.2: Run to confirm tests fail**

```bash
npm run test:run -- src/app/api/org/__tests__/route.test.ts
```

Expected: module-not-found errors for `../route`.

- [ ] **Step 9.3: Implement `src/app/api/org/route.ts`**

```typescript
// src/app/api/org/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_PATCH_FIELDS = [
  'name',
  'industry',
  'target_audience',
  'description',
  'onboarding_completed',
] as const

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'unauthorized' },
      { status: 401 }
    )
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('GET /api/org:', error)
    return NextResponse.json({ error: 'Något gick fel' }, { status: 500 })
  }

  if (!org) {
    // First time: create the org record
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({ user_id: user.id })
      .select()
      .single()

    if (createError) {
      console.error('GET /api/org create:', createError)
      return NextResponse.json({ error: 'Något gick fel' }, { status: 500 })
    }

    return NextResponse.json({ org: newOrg })
  }

  return NextResponse.json({ org })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'unauthorized' },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  for (const field of ALLOWED_PATCH_FIELDS) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('PATCH /api/org:', error)
    return NextResponse.json({ error: 'Något gick fel' }, { status: 500 })
  }

  return NextResponse.json({ org })
}
```

- [ ] **Step 9.4: Run tests and confirm all pass**

```bash
npm run test:run -- src/app/api/org/__tests__/route.test.ts
```

Expected: `5 passed`.

- [ ] **Step 9.5: Commit**

```bash
git add src/app/api/org/
git commit -m "feat: add /api/org GET and PATCH route with tests"
```

---

### Task 10: Onboarding Page

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 10.1: Create onboarding form**

```tsx
// src/app/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Organization } from '@/types/database'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    industry: '',
    target_audience: '',
    description: '',
  })
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from any previously auto-saved data
  useEffect(() => {
    fetch('/api/org')
      .then((r) => r.json())
      .then(({ org }: { org: Organization }) => {
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

  const autoSave = (field: string, value: string) => {
    fetch('/api/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => {})
  }

  const handleFinish = async () => {
    if (!form.name.trim() || !form.industry.trim() || !form.target_audience.trim())
      return
    setCompleting(true)
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
      setError('Något gick fel, försök igen.')
      setCompleting(false)
    }
  }

  const requiredFilled =
    form.name.trim() && form.industry.trim() && form.target_audience.trim()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-2xl shadow-sm border p-10 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-1">Välkommen till Promotely</h1>
        <p className="text-gray-500 text-sm mb-8">
          Berätta lite om ditt UF-företag så att AI:n kan hjälpa dig bättre.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Företagsnamn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={(e) => autoSave('name', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="t.ex. EcoWear UF"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Bransch <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.industry}
              onChange={(e) =>
                setForm((f) => ({ ...f, industry: e.target.value }))
              }
              onBlur={(e) => autoSave('industry', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="t.ex. Hållbar mode"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Målgrupp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.target_audience}
              onChange={(e) =>
                setForm((f) => ({ ...f, target_audience: e.target.value }))
              }
              onBlur={(e) => autoSave('target_audience', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="t.ex. Ungdomar 15–25 år"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Beskrivning{' '}
              <span className="text-gray-400 font-normal">(valfritt)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              onBlur={(e) => autoSave('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black h-24 resize-none"
              placeholder="Beskriv ditt företag kort"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        <button
          onClick={handleFinish}
          disabled={!requiredFilled || completing}
          className="mt-6 w-full bg-black text-white py-3 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-900 transition-colors"
        >
          {completing ? 'Sparar...' : 'Slutför'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 10.2: Commit**

```bash
git add src/app/onboarding/
git commit -m "feat: add onboarding page with auto-save on blur"
```

---

## Chunk 5: Dashboard Shell

### Task 11: Dashboard Layout & Placeholder Pages

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/app/(dashboard)/chat/page.tsx`
- Create: `src/app/(dashboard)/calendar/page.tsx`
- Create: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `src/app/page.tsx`

- [ ] **Step 11.1: Delete the default Next.js root page**

```bash
git rm src/app/page.tsx
```

`src/app/(dashboard)/page.tsx` will serve the root `/` route instead.

- [ ] **Step 11.2: Update root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Promotely',
  description: 'AI-marknadsföring för UF-företag',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 11.3: Create dashboard layout**

```tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Organization } from '@/types/database'

const navLinks = [
  { href: '/', label: 'Översikt' },
  { href: '/chat', label: 'AI-chatt' },
  { href: '/calendar', label: 'Kalender' },
  { href: '/settings', label: 'Inställningar' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('name, credits_remaining, credits_reset_at, plan, billing_status')
    .eq('user_id', user.id)
    .single<
      Pick<
        Organization,
        | 'name'
        | 'credits_remaining'
        | 'credits_reset_at'
        | 'plan'
        | 'billing_status'
      >
    >()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r flex flex-col shrink-0">
        <div className="p-5 border-b">
          <span className="font-bold text-lg">Promotely</span>
          {org?.name && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{org.name}</p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Credit counter */}
        {org && (
          <div className="p-4 border-t text-sm">
            <div className="font-medium text-gray-900">
              {org.credits_remaining} credits kvar
            </div>
            {org.credits_reset_at && (
              <div className="text-xs text-gray-400 mt-0.5">
                Återställs{' '}
                {new Date(org.credits_reset_at).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            )}
            <div className="text-xs text-gray-400 capitalize mt-0.5">
              {org.plan}-plan
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {org?.billing_status === 'past_due' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-sm text-red-800">
            Din betalning misslyckades — uppdatera din betalningsmetod för att
            fortsätta använda AI.
          </div>
        )}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 11.4: Create dashboard home placeholder**

```tsx
// src/app/(dashboard)/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Översikt</h1>
      <p className="text-gray-500 text-sm">Dashboard byggs ut i Plan 2.</p>
    </div>
  )
}
```

- [ ] **Step 11.5: Create placeholder pages**

```tsx
// src/app/(dashboard)/chat/page.tsx
export default function ChatPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">AI-chatt</h1>
      <p className="text-gray-500 text-sm">Byggs ut i Plan 3.</p>
    </div>
  )
}
```

```tsx
// src/app/(dashboard)/calendar/page.tsx
export default function CalendarPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Kalender</h1>
      <p className="text-gray-500 text-sm">Byggs ut i Plan 4.</p>
    </div>
  )
}
```

```tsx
// src/app/(dashboard)/settings/page.tsx
export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inställningar</h1>
      <p className="text-gray-500 text-sm">Byggs ut i Plan 5.</p>
    </div>
  )
}
```

- [ ] **Step 11.6: Commit**

```bash
git add src/app/layout.tsx src/app/(dashboard)/
git commit -m "feat: add dashboard layout with sidebar, credit counter, and placeholder pages"
```

---

### Task 12: Smoke Test

- [ ] **Step 12.1: Verify `.env.local` has real Supabase credentials**

Open `.env.local` and confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set with real values from your Supabase project.

- [ ] **Step 12.2: Start dev server**

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000` with no TypeScript compilation errors.

- [ ] **Step 12.3: Verify auth flow end-to-end**

1. Navigate to `http://localhost:3000` → should redirect to `/login`
2. Click "Logga in med Google" → Google OAuth flow opens
3. Complete Google sign-in → redirected back to `/onboarding`
4. Fill in Företagsnamn, Bransch, Målgrupp → each field auto-saves on blur
5. Click "Slutför" → redirected to `/` showing dashboard layout with sidebar
6. Verify credit counter shows "50 credits kvar" and "Starter-plan"

- [ ] **Step 12.4: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass (format utility + org route = 8 tests total).

- [ ] **Step 12.5: Final commit**

```bash
git add .
git commit -m "chore: plan 1 foundation complete and smoke tested"
```
