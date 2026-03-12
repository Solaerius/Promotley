# Promotely — Design Spec

**Date:** 2026-03-12
**Vision:** "Från UF till UF" — an AI-powered social media marketing platform built by a UF company, for UF companies and young Swedish startup founders.

---

## 1. Overview

Promotely helps Swedish UF (Ung Företagsamhet) companies grow their social media presence using AI. It connects to TikTok (Instagram later), analyzes engagement data, and gives users an AI chat assistant that generates UF-compliant content strategies, captions, hashtags, and video ideas — all within a content calendar.

**UI Language:** Swedish throughout. All copy, labels, error messages, and AI responses are in Swedish.

### MVP Scope
- Authentication & onboarding
- Dashboard (activity feed, TikTok connection status, quick actions)
- AI chat (context-aware: company profile + live analytics)
- Content calendar (create/edit/delete events, AI-assisted post generation)

**Out of scope for MVP:** analytics charts/history, Instagram integration, direct social posting, team/multi-user orgs, email notifications.

---

## 2. Architecture & Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Backend | Next.js API routes (`src/app/api/`) |
| Database & Auth | Supabase (Postgres + Google OAuth + Row-Level Security) |
| AI | OpenAI SDK (model per plan) |
| Social API | TikTok API for Business (OAuth + analytics pull) |
| Payments | Stripe (subscriptions, webhooks) |
| Deployment | Vercel Pro plan (60s function timeout, Vercel Cron) |

No separate backend server. Set `maxDuration = 60` in `vercel.json` for `/api/chat`.

---

## 3. Pricing & Plans

| Plan | Standard Model | Premium Model | Credits/month | Price |
|------|---------------|---------------|---------------|-------|
| Starter | gpt-4o-mini | — | 50 | 29 kr/month |
| Growth | gpt-4.1-mini | — | 100 | 49 kr/month |
| Pro | gpt-4.1-mini | gpt-4.1 (2 credits) | 200 | 99 kr/month |

**Model rationale:** Starter uses `gpt-4o-mini` intentionally (cheaper to serve at 29 kr/month). Growth and Pro use `gpt-4.1-mini` as their standard model (1 credit). Pro additionally unlocks `gpt-4.1` as a per-message premium option (2 credits) via toggle in chat UI only.

**Credit rules:**
- 1 credit = 1 AI message (standard model). 2 credits = 1 AI message (Pro premium gpt-4.1).
- Credits cannot go negative — rejected with HTTP 402 before calling OpenAI.
- No carryover between billing periods.
- `credits_reset_at` is informational — updated on each reset and displayed in the UI as "Credits återställs [date]".

**Plan changes (on `customer.subscription.updated` webhook):**
- **Upgrade:** set `plan` to new plan AND set `credits_remaining` to new plan's full monthly limit immediately. This effectively gives the user a full credit refill on upgrade — this is intentional product behavior (a reward for upgrading mid-cycle, simplifying billing logic).
- **Downgrade:** set `plan` to new plan AND cap `credits_remaining` to new plan's limit if current value exceeds it.

**Monthly credit reset (on `invoice.paid` webhook):**
- Set `credits_remaining` to current plan's monthly limit, update `credits_reset_at`.
- Also syncs `plan` from subscription metadata in case it wasn't updated (idempotent guard).

**Billing flow:**
- Stripe Checkout for new subscriptions
- Stripe Customer Portal for upgrades, downgrades, cancellations
- `organizations.stripe_customer_id`, `organizations.stripe_subscription_id` on org
- Cancellation: plan active until period end, then `plan = starter` on `customer.subscription.deleted`
- Failed payment: on `invoice.payment_failed`, set `billing_status = past_due`. Stripe retries for 7 days. If `invoice.paid` fires (resolved), set `billing_status = active`. If `customer.subscription.updated` fires with `status = unpaid` (after retry period), `billing_status` remains `past_due`.

**Stripe webhook events handled** (`/api/stripe/webhook`):
- `invoice.paid` → reset credits to plan limit, billing_status = active, sync plan (idempotent)
- `invoice.payment_failed` → billing_status = past_due
- `customer.subscription.updated` → sync plan, adjust credits (upgrade = full reset, downgrade = cap)
- `customer.subscription.deleted` → plan = starter, billing_status = cancelled

**Read-only mode (`billing_status = past_due`):** AI chat returns 402 with billing message. Calendar viewable/editable, no AI assist. TikTok stays connected, analytics sync continues. Dashboard shows banner: *"Din betalning misslyckades — uppdatera din betalningsmetod för att fortsätta använda AI."*

---

## 4. Data Models

### `users`
Managed by Supabase Auth (Google OAuth).

### `organizations`
- `id`, `user_id` (UNIQUE — one org per user enforced at DB level), `name`, `industry`, `target_audience`, `description`
- `plan` (starter | growth | pro), default: starter
- `credits_remaining` (integer, min 0), `credits_reset_at` (timestamp)
- `stripe_customer_id`, `stripe_subscription_id`
- `billing_status` (active | past_due | cancelled), default: active
- `onboarding_completed` (bool, default false)

### `social_connections`
- `id`, `org_id`, `platform` (tiktok | instagram)
- `access_token` (AES-256 encrypted at rest), `refresh_token` (AES-256 encrypted)
- `token_expires_at` (timestamp), `account_handle`, `connected_at`
- `status` (connected | needs_reauth), default: connected
- **Token refresh** (`lib/tiktok/refreshToken.ts`): if `token_expires_at` within 1 hour, refresh tokens. On failure, set `status = needs_reauth`. Surface reconnect prompt in dashboard widget and settings page.

### `analytics_snapshots`
- `id`, `org_id`, `platform`, `date`
- `followers`, `views`, `likes`, `comments`, `shares`, `impressions`, `profile_views` (all integer)
- `engagement_rate` (numeric): stored as decimal ratio (e.g. `0.043` = 4.3%). Formula: `(likes + comments + shares) / followers`. Displayed in UI multiplied by 100, 1 decimal place. If `followers = 0`, store `0`.
- Uniqueness: `(org_id, platform, date)` — upsert on conflict, update all fields.

### `calendar_events`
- `id`, `org_id`, `platform`, `scheduled_date` (date only — no time, MVP simplification)
- `caption` (text), `hashtags` (text array), `video_idea` (text)
- `status` (draft | scheduled | posted | deleted)
- `ai_generated` (bool), `deleted_at` (timestamp, nullable)
- Soft delete: `status = deleted`, `deleted_at = now()`. Queries filter `status != 'deleted'`.

### `chat_messages`
- `id`, `org_id`, `role` (user | assistant), `content`, `credits_used`, `model_used`, `created_at`

### `uf_rules_cache`
- `id` (fixed value: `1` — enforced with PRIMARY KEY; all writes use `UPSERT ON CONFLICT (id) DO UPDATE`), `content` (raw text), `fetched_at`
- Single row guaranteed by fixed primary key `id = 1`. Source: `https://www.ungforetagsamhet.se` (navigate to rules/regulations section at implementation to find exact path and CSS selector).
- On scrape failure: retain existing row (upsert only on success), log warning. First-deploy seed: if no row with `id = 1` exists, insert hardcoded fallback: *"UF-företag ska följa Ung Företagsamhets riktlinjer för marknadsföring. Innehåll ska vara sanningsenligt, inte vilseledande och följa svenska marknadsföringslagar. Överdrivna påståenden om intäkter, tillväxt eller resultat är inte tillåtna."*

---

## 5. Page Structure & Routes

```
src/app/
├── (auth)/
│   └── login/page.tsx
├── onboarding/page.tsx
├── (dashboard)/
│   ├── layout.tsx                   — Sidebar nav, credit counter, billing banner
│   ├── page.tsx                     — Dashboard
│   ├── chat/page.tsx
│   ├── calendar/page.tsx
│   └── settings/page.tsx
└── api/
    ├── auth/callback/route.ts       — Supabase exchangeCodeForSession
    ├── org/route.ts                 — GET + PATCH org
    ├── tiktok/connect/route.ts
    ├── tiktok/callback/route.ts
    ├── tiktok/sync/route.ts         — Sync current org (authenticated)
    ├── tiktok/sync-all/route.ts     — Cron: sync all orgs (service role)
    ├── chat/route.ts                — Streaming AI chat
    ├── calendar/route.ts            — Calendar CRUD
    ├── uf-rules/route.ts            — Scrape + cache UF rules
    └── stripe/webhook/route.ts
```

### `/api/org`
| Method | Body | Response |
|--------|------|----------|
| GET | — | `{ org: Organization }` |
| PATCH | `{ name?, industry?, target_audience?, description?, onboarding_completed? }` | `{ org: Organization }` |

### `/api/calendar`
| Method | Params/Body | Response |
|--------|------------|----------|
| GET | — | `{ events: CalendarEvent[] }` |
| POST | `{ platform, scheduled_date, caption, hashtags, video_idea, status, ai_generated }` | `{ event: CalendarEvent }` |
| PATCH | `{ id, platform?, scheduled_date?, caption?, hashtags?, video_idea?, status? }` | `{ event: CalendarEvent }` |
| DELETE | `?id=<uuid>` (URL param) | `{ success: true }` |

DELETE uses a URL query param to avoid HTTP body-in-DELETE compatibility issues. This inconsistency with other endpoints is intentional.

### API route authentication
All `/api/*` routes (except `stripe/webhook` and `auth/callback`) validate the Supabase session from the request cookie. If session is missing or expired, return `{ error: "Unauthorized", code: "unauthorized" }` with HTTP 401. The middleware matcher excludes `/api/*`, so API routes handle their own auth.

### Middleware (`middleware.ts`)
Matcher: all routes except `/api/*` and `/_next/*` and `/favicon.ico`.
- No session → redirect to `/login`
- Session + `onboarding_completed = false` → redirect to `/onboarding`
- Session + `onboarding_completed = true` → allow

### Onboarding
Single-page form (name, industry, target_audience, description). Auto-saves each field on `onBlur` via PATCH `/api/org`. `onboarding_completed = true` only on "Slutför" click with required fields (name, industry, target_audience) filled. On return, form pre-filled from existing org record.

---

## 6. Row-Level Security (RLS)

- **`organizations`**: `user_id = auth.uid()`
- **`social_connections`, `analytics_snapshots`, `chat_messages`**: `org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())`
- **`calendar_events`**: same org_id check; SELECT additionally filters `status != 'deleted'`
- **`uf_rules_cache`**: SELECT for all authenticated; writes via service role only
- **Service role** (used in cron routes) bypasses RLS by design — this is the mechanism for cron jobs to access all org data and for `/api/uf-rules` to write the cache. Deleted calendar events are not accessible to application code by design; service role cron jobs do not need to read them.

Cron routes (`tiktok/sync-all`, `uf-rules`) validate `Authorization: Bearer <CRON_SECRET>` header. Missing or invalid token → return `{ error: "Forbidden", code: "invalid_cron_secret" }` with HTTP 403 immediately, before any DB access.

---

## 7. Analytics Sync

- **User-triggered:** Dashboard load → client calls `/api/tiktok/sync` (authenticated, one org).
- **Cron:** `/api/tiktok/sync-all` at 06:00 UTC daily. Uses service role to query all `social_connections` where `platform = tiktok` AND `status = connected`. Syncs each org sequentially.
- **Failure:** retain last snapshot, show "Senast uppdaterad: [timestamp]". No snapshot yet: show "Ansluter till TikTok...".

---

## 8. AI Chat & UF Compliance

### System Prompt (constructed per request)
1. Company profile (name, industry, target_audience, description)
2. Latest analytics — if at least one snapshot exists. Format `engagement_rate` as percentage. Omit section silently if no data.
3. UF rules — always present (hardcoded fallback if cache empty)
4. Instructions: respond in Swedish, generate UF-compliant content only, flag borderline suggestions, never make exaggerated revenue or growth claims.

### Model Selection
- Starter: gpt-4o-mini, 1 credit (fixed)
- Growth: gpt-4.1-mini, 1 credit (fixed)
- Pro: toggle in chat UI — Standard (gpt-4.1-mini, 1 credit) or Premium (gpt-4.1, 2 credits). Default: Standard.
- Selected model string sent in POST body to `/api/chat`. Server validates against user's plan — if a non-Pro user sends a premium model, reject with 403.

### Credit Deduction & Stream Interruption

**Implementation (`/api/chat` using Vercel AI SDK `streamText`):**

```
const aborted = { value: false };
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => {
  aborted.value = true;   // server timeout also sets aborted
  timeoutController.abort();
}, 30_000);

// Client disconnect also sets aborted
request.signal.addEventListener('abort', () => { aborted.value = true; });

const combinedSignal = AbortSignal.any([request.signal, timeoutController.signal]);

const result = streamText({
  model: selectedModel,
  messages,
  abortSignal: combinedSignal,
  onFinish: async ({ text }) => {
    clearTimeout(timeoutId);
    if (aborted.value) return; // skip deduction — client disconnected or server timeout
    await deductCredits(org.id, creditCost);
    await saveChatMessage(org.id, text, creditCost, modelId);
  }
});
```

- Check credits before calling OpenAI — reject 402 immediately if 0.
- **Both abort sources (client disconnect and server-side 30s timeout) set `aborted.value = true`**, so `onFinish` never deducts credits on either type of interruption.
- **Server-side timeout:** 30s `AbortController` fires, sets `aborted = true`, aborts the OpenAI request. The stream ends; client receives a 504 chunk or connection close. Vercel's 60s limit is the outer bound.
- **Engagement rate formatting:** use a shared utility `lib/format.ts: formatEngagementRate(rate: number): string` (e.g. `0.043 → "4.3%"`). Used consistently in both the system prompt builder and the analytics display UI.

### Structured Output — "Spara till kalender"

AI instructed to wrap post suggestions in:
```
<post-suggestion>
VIDEOIDÉ: [idea]
TEXT: [caption]
HASHTAGS: #hashtag1 #hashtag2 #hashtag3
</post-suggestion>
```

UI parses assistant messages for `<post-suggestion>` tags using a simple regex. If found: render styled card + "Spara till kalender" button. If absent: plain chat text.

**Hashtag parsing:** split `HASHTAGS` line by whitespace, strip leading `#` from each token, filter empty strings. Store resulting array in `calendar_events.hashtags`.

**Save flow:** date picker modal → POST `/api/calendar` with `{ platform: 'tiktok', scheduled_date, caption, hashtags: string[], video_idea, status: 'draft', ai_generated: true }`. On success: toast "Sparat till kalender" with `/calendar` link. Multiple events per day allowed. Partial/empty fields saved as empty string or empty array.

### Error Handling
- Timeout >30s (app-level): 504, "AI svarar inte just nu, försök igen"
- Rate limit: 429, "För många förfrågningar, vänta en stund"
- Mid-stream error: close stream, "Något gick fel, meddelandet sparades inte", no credit deduction

### UF Compliance
- UF rules always in system prompt
- Persistent disclaimer in chat UI: *"Promotely genererar innehåll baserat på UF:s regler. Granska alltid innehåll innan publicering."*
- Weekly Vercel Cron refreshes UF rules cache
- Prompt-level compliance only for MVP

---

## 9. Content Calendar

### View
- Monthly grid, default current month, prev/next navigation (no limit)
- Days with events: colored chips (one per event, color = status)
- Click day → side panel listing events for that day in creation order (`created_at` asc)

### Event CRUD
- **Create:** date, platform (TikTok), content (manual or AI-assisted)
- **Edit:** any field or date
- **Delete:** soft delete (`status = deleted`, `deleted_at = now()`), immediate UI removal

### AI Assist
1. User clicks "Generera med AI" in event form
2. POST to `/api/chat` with: company profile + chosen date + up to 10 existing non-deleted events within ±7 days of chosen date (sorted by absolute date distance asc, ties by `created_at` desc). Fields included per event: `scheduled_date`, `caption`, `video_idea` (hashtags excluded to reduce tokens). Target date itself is included in the window.
3. AI returns `<post-suggestion>` tag; fields pre-filled into form
4. Standard model only (1 credit). No premium toggle in calendar for MVP.
5. "Generera igen" = 1 more credit

### Status Chips
- Draft (grey), Scheduled (blue), Posted (green)

### Errors
- CRUD failure: "Kunde inte spara, försök igen"
- AI assist failure: "AI-generering misslyckades, försök igen"

---

## 10. General Error Handling

- All API routes return `{ error: string, code?: string }`
- Network failures in UI: Swedish error toast with retry
- 401 from API: redirect to `/login`
- 403 / RLS violations: redirect to dashboard root with toast
- 500s: log to Vercel, show "Något gick fel" in UI

---

## 11. Out of Scope (Future Iterations)
- Analytics charts and historical data views
- Instagram integration
- Direct posting to social platforms
- Team/multi-user organizations
- Email notifications
- Time-of-day scheduling for calendar events
- Secondary AI compliance validation layer
