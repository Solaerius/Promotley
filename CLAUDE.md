# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skills
Before starting any significant task, check if a relevant skill applies and read it fully before proceeding.

## Project Overview

**Promotely** — AI-powered social media marketing platform for Swedish UF (Ung Företagsamhet) companies. Vision: "Från UF till UF".

Read `docs/README.md` for full project context before starting any work. It contains the repo structure, tech stack, design decisions, environment variables, and plan status.

Full design spec: `docs/superpowers/specs/2026-03-12-promotely-design.md`

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npx vitest run   # Run all tests
npx tsc --noEmit # Type-check without building
```

## Architecture

**Next.js 16** App Router monolith. No separate backend — all server logic lives in `src/app/api/`.

- **Auth & DB:** Supabase (Postgres + Google OAuth + Row-Level Security)
- **AI:** OpenAI SDK — model per plan (`gpt-4o-mini` / `gpt-4.1-mini` / `gpt-4.1`)
- **Social:** TikTok Business API v2
- **Payments:** Stripe subscriptions + webhooks
- **Deployment:** Vercel Pro (`vercel.json` has cron jobs + `maxDuration` for `/api/chat`)

**Path alias:** `@/*` maps to `./src/*`

**Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`.

All new pages/layouts go under `src/app/`. Server Components by default — add `"use client"` only for interactivity or browser APIs.

## Key Conventions

- **UI language:** Swedish throughout — all copy, labels, errors, AI responses
- **Tests:** Vitest + Testing Library. TDD: write failing test first, then implement. Tests live in `__tests__/` directories next to the code they test.
- **Token encryption:** TikTok tokens are AES-256-GCM encrypted via `src/lib/crypto.ts` before DB storage. Never store plaintext tokens.
- **Supabase clients:**
  - `createClient()` from `@/lib/supabase/server` — async, uses session cookies (user routes)
  - `createServiceClient()` from `@/lib/supabase/server` — sync, no-op cookies (cron routes only, bypasses RLS)
- **Cron auth:** All cron routes validate `Authorization: Bearer <CRON_SECRET>` before any DB access. Return 403 on failure.
- **API auth:** All `/api/*` routes (except `stripe/webhook` and `auth/callback`) validate the Supabase session. Return `{ error, code: 'unauthorized' }` with HTTP 401 if missing.
- **Engagement rate:** Stored as decimal (e.g. `0.043` = 4.3%). Always display via `formatEngagementRate()` from `@/lib/format.ts`.
- **Soft delete:** Calendar events use `status = 'deleted'` + `deleted_at = now()`. Never hard-delete. RLS SELECT policy filters these out.
- **Credits:** Deducted only on completed AI stream. An `aborted` flag (set by client disconnect OR 30s server timeout) prevents deduction in `onFinish`.

## Data Models (summary)

- `organizations` — one per user (UNIQUE `user_id`), holds `plan`, `credits_remaining`, `billing_status`, `onboarding_completed`
- `social_connections` — TikTok/Instagram tokens (encrypted), `status: connected | needs_reauth`
- `analytics_snapshots` — daily stats per org+platform, unique on `(org_id, platform, date)`
- `calendar_events` — `status: draft | scheduled | posted | deleted`, soft-deleted
- `chat_messages` — `role: user | assistant`, `credits_used`, `model_used`
- `uf_rules_cache` — single row (`id = 1`), upserted weekly

## Plan Status

| Plan | File | Status |
|------|------|--------|
| 1 — Foundation | `docs/superpowers/plans/2026-03-12-promotely-plan-1-foundation.md` | ✅ Written |
| 2 — TikTok & Dashboard | `docs/superpowers/plans/2026-03-12-promotely-plan-2-tiktok-dashboard.md` | ✅ Written |
| 3 — AI Chat | *(to be written)* | 🔲 Pending |
| 4 — Content Calendar | *(to be written)* | 🔲 Pending |
| 5 — Billing | *(to be written)* | 🔲 Pending |

To execute a written plan, use the `superpowers:subagent-driven-development` skill.
To write a new plan, use the `superpowers:writing-plans` skill and reference the design spec.
