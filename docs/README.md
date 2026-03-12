# Promotely — Project Documentation

**Vision:** "Från UF till UF" — An AI-powered social media marketing platform built by a UF company, for Swedish UF (Ung Företagsamhet) companies.

---

## What Is This Project?

Promotely helps Swedish UF companies grow their social media presence using AI. It connects to TikTok, analyzes engagement data, and gives users an AI chat assistant that generates UF-compliant content strategies, captions, hashtags, and video ideas — all within a content calendar.

**UI Language:** Swedish throughout.

---

## Repository Structure

```
src/
├── app/
│   ├── (auth)/login/          — Google OAuth login page
│   ├── onboarding/            — Company setup form
│   ├── (dashboard)/           — Protected app layout + pages
│   │   ├── layout.tsx         — Sidebar, credit counter, billing banner
│   │   ├── page.tsx           — Dashboard (TikTok status, analytics, quick actions)
│   │   ├── chat/              — AI chat page
│   │   ├── calendar/          — Content calendar page
│   │   └── settings/          — Account & billing settings
│   └── api/
│       ├── auth/callback/     — Supabase OAuth code exchange
│       ├── org/               — GET + PATCH organization
│       ├── tiktok/
│       │   ├── connect/       — Redirect to TikTok OAuth
│       │   ├── callback/      — Exchange code, store encrypted tokens
│       │   ├── sync/          — User-triggered analytics sync
│       │   └── sync-all/      — Cron: sync all orgs (daily 06:00 UTC)
│       ├── chat/              — Streaming AI chat (OpenAI)
│       ├── calendar/          — Calendar CRUD
│       ├── uf-rules/          — Scrape + cache UF rules (weekly cron)
│       └── stripe/webhook/    — Billing webhook handler
├── components/dashboard/      — Dashboard UI components
├── lib/
│   ├── supabase/              — Browser + server + service-role clients
│   ├── tiktok/                — TikTok API client, token refresh, sync helper
│   ├── crypto.ts              — AES-256-GCM encrypt/decrypt
│   └── format.ts              — formatEngagementRate utility
├── middleware.ts               — Auth + onboarding route guards
└── types/database.ts          — TypeScript types, plan constants, credit limits
docs/
├── README.md                  ← You are here
└── superpowers/
    ├── specs/
    │   └── 2026-03-12-promotely-design.md   — Full design spec
    └── plans/
        ├── 2026-03-12-promotely-plan-1-foundation.md       ✅ Complete
        ├── 2026-03-12-promotely-plan-2-tiktok-dashboard.md ✅ Complete
        ├── (plan-3-ai-chat)           — To be written
        ├── (plan-4-calendar)          — To be written
        └── (plan-5-billing)           — To be written
supabase/
└── migrations/
    └── 20260312000000_initial_schema.sql   — All tables + RLS policies
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API routes (`src/app/api/`) |
| Database & Auth | Supabase (Postgres + Google OAuth + Row-Level Security) |
| AI | OpenAI SDK (`gpt-4o-mini`, `gpt-4.1-mini`, `gpt-4.1`) |
| Social API | TikTok Business API v2 |
| Payments | Stripe (subscriptions + webhooks) |
| Deployment | Vercel Pro (60s function timeout, Vercel Cron) |
| Testing | Vitest + Testing Library |

---

## Pricing Plans

| Plan | Model | Credits/month | Price |
|------|-------|---------------|-------|
| Starter | gpt-4o-mini | 50 | 29 kr/month |
| Growth | gpt-4.1-mini | 100 | 49 kr/month |
| Pro | gpt-4.1-mini + gpt-4.1 (premium, 2 credits) | 200 | 99 kr/month |

---

## Key Design Decisions

- **Single org per user** — enforced at DB level with `UNIQUE` on `organizations.user_id`
- **AES-256-GCM token encryption** — TikTok tokens encrypted at app layer before DB storage (`lib/crypto.ts`)
- **TDD throughout** — every plan follows write-failing-test → implement → verify pattern
- **Soft delete for calendar events** — `status = 'deleted'`, `deleted_at = now()`, filtered out by RLS SELECT policy
- **Credits deducted only on complete stream** — `aborted` flag prevents deduction on client disconnect or 30s server timeout
- **UF rules always in AI system prompt** — scraped weekly from ungforetagsamhet.se, hardcoded Swedish fallback if cache empty
- **No carryover credits** — reset monthly on `invoice.paid` Stripe webhook
- **Engagement rate stored as decimal** — `0.043` = 4.3%, displayed via `formatEngagementRate()` from `lib/format.ts`

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=http://localhost:3000/api/tiktok/callback

# Token encryption (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_PRO_PRICE_ID=

# Cron authentication
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Implementation Plans

Plans are located in `docs/superpowers/plans/`. Each plan is self-contained and produces working, testable software.

**How to execute a plan:** Open the plan file and use the `superpowers:subagent-driven-development` skill (Claude Code) or `superpowers:executing-plans` skill (no subagents).

---

### ✅ Plan 1 — Foundation
**File:** `docs/superpowers/plans/2026-03-12-promotely-plan-1-foundation.md`

**Covers:**
- Install dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `vitest`, `@testing-library/react`, etc.)
- Database migration: all tables + RLS policies + UF rules seed
- TypeScript types (`src/types/database.ts`) + plan/credit constants
- Supabase client factories (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- `formatEngagementRate` utility (`lib/format.ts`)
- Middleware: auth + onboarding route guards
- Auth callback route (`/api/auth/callback`)
- Org API route (`/api/org` — GET + PATCH)
- Login page (Google OAuth)
- Onboarding page (company form, auto-save on blur)
- Dashboard layout (sidebar, credit counter, billing banner)
- Dashboard, chat, calendar page placeholders

---

### ✅ Plan 2 — TikTok & Dashboard
**File:** `docs/superpowers/plans/2026-03-12-promotely-plan-2-tiktok-dashboard.md`

**Covers:**
- AES-256-GCM crypto utilities (`lib/crypto.ts`)
- TikTok API client: user info + video stats aggregation (`lib/tiktok/client.ts`)
- Token refresh with error handling (`lib/tiktok/refreshToken.ts`)
- Shared sync helper (`lib/tiktok/syncOrg.ts`) — used by both sync routes
- TikTok connect route: CSRF state cookie + OAuth redirect
- TikTok callback route: code exchange, encrypt tokens, upsert connection
- User-triggered sync route (`/api/tiktok/sync`)
- Cron sync-all route (`/api/tiktok/sync-all`, daily 06:00 UTC)
- `vercel.json` with cron config
- Dashboard components: `TikTokStatusWidget`, `AnalyticsStatsGrid`, `QuickActionsCard`, `ActivityFeed`
- `SyncTrigger` client component (fires sync on mount, calls `router.refresh()`)
- Live dashboard page replacing Plan 1 placeholder

---

### 🔲 Plan 3 — AI Chat *(to be written)*

**Spec reference:** `docs/superpowers/specs/2026-03-12-promotely-design.md` — sections 3, 8

**Will cover:**
- Install `openai` SDK
- UF rules scraper + cache route (`/api/uf-rules`, weekly Vercel Cron)
- System prompt builder (company profile + latest analytics + UF rules)
- Streaming chat route (`/api/chat`) with:
  - Credit pre-check (reject 402 if 0 credits)
  - Model validation against user's plan
  - 30s server-side abort controller
  - Client disconnect detection via `request.signal`
  - `onFinish` credit deduction + `chat_messages` save (skipped if aborted)
- `<post-suggestion>` XML tag parsing (regex) → "Spara till kalender" button
- Hashtag parsing from `HASHTAGS:` line → `string[]`
- Chat page UI: message list, input, Pro model toggle, UF disclaimer
- Add `maxDuration = 60` to `vercel.json` for `/api/chat`
- Add weekly `/api/uf-rules` cron to `vercel.json`

---

### 🔲 Plan 4 — Content Calendar *(to be written)*

**Spec reference:** `docs/superpowers/specs/2026-03-12-promotely-design.md` — section 9

**Will cover:**
- Calendar CRUD route (`/api/calendar` — GET, POST, PATCH, DELETE with `?id=` query param)
- Soft delete: `status = 'deleted'`, `deleted_at = now()`
- Calendar page UI: monthly grid, day click → side panel
- Status chips: Draft (grey), Scheduled (blue), Posted (green)
- Create/Edit modal: date, platform, caption, hashtags, video idea
- AI Assist button: POST to `/api/chat` with context (company profile + ±7 day events), pre-fill form
- "Generera igen" = 1 more credit
- Update `ActivityFeed` component to show recent calendar events
- Save-to-calendar flow from chat's "Spara till kalender" button (date picker modal)

---

### 🔲 Plan 5 — Billing *(to be written)*

**Spec reference:** `docs/superpowers/specs/2026-03-12-promotely-design.md` — sections 3, 10

**Will cover:**
- Stripe setup: `stripe` npm package, customer + subscription creation
- Stripe Checkout route (create session, redirect)
- Stripe Customer Portal route (manage subscription)
- Stripe webhook handler (`/api/stripe/webhook`):
  - `invoice.paid` → reset credits to plan limit, `billing_status = active`
  - `invoice.payment_failed` → `billing_status = past_due`
  - `customer.subscription.updated` → sync plan, adjust credits (upgrade = full reset, downgrade = cap)
  - `customer.subscription.deleted` → `plan = starter`, `billing_status = cancelled`
- Settings page: current plan display, upgrade/manage button, credits remaining + reset date
- Past-due banner in dashboard layout (already has placeholder in Plan 1 layout)
- Billing status gating: AI chat returns 402 with Swedish message when `past_due`

---

## Running the Project

```bash
npm run dev    # Start dev server at http://localhost:3000
npm run build  # Production build
npm run start  # Start production server
npx vitest run # Run all tests
```

---

## Design Spec

For full technical detail on any feature — data models, RLS policies, API contracts, error handling, credit rules — read:

**`docs/superpowers/specs/2026-03-12-promotely-design.md`**
