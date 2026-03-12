# Promotely — Design Spec

**Date:** 2026-03-12
**Vision:** "Från UF till UF" — an AI-powered social media marketing platform built by a UF company, for UF companies and young Swedish startup founders.

---

## 1. Overview

Promotely helps Swedish UF (Ung Företagsamhet) companies grow their social media presence using AI. It connects to TikTok (Instagram later), analyzes engagement data, and gives users an AI chat assistant that generates UF-compliant content strategies, captions, hashtags, and video ideas — all within a content calendar.

### MVP Scope
- Authentication & onboarding
- Dashboard (activity feed, TikTok connection status, quick actions)
- AI chat (context-aware: company profile + live analytics)
- Content calendar (create/edit/delete events, AI-assisted post generation)

**Out of scope for MVP:** analytics charts/history, Instagram integration, direct social posting.

---

## 2. Architecture & Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Backend | Next.js API routes (`src/app/api/`) |
| Database & Auth | Supabase (Postgres + Google OAuth + Row-Level Security) |
| AI | OpenAI SDK (model per plan) |
| Social API | TikTok API for Business (OAuth + analytics pull) |
| Deployment | Vercel |

No separate backend server. Everything runs as a Next.js monolith.

---

## 3. Pricing & Plans

| Plan | Model | Credits/month | Price |
|------|-------|---------------|-------|
| Starter | gpt-4o-mini | 50 | 29 kr/month |
| Growth | gpt-4.1-mini | 100 | 49 kr/month |
| Pro | gpt-4.1-mini (1 credit) + gpt-4.1 (2 credits) | 200 | 99 kr/month |

Credits are deducted per AI message. Standard model = 1 credit, premium model (Pro only, gpt-4.1) = 2 credits. Credits reset monthly. If credits hit 0, the user sees an upgrade prompt.

---

## 4. Data Models

### `users`
Managed by Supabase Auth (Google OAuth). Stores email, name, avatar.

### `organizations`
One per user for MVP.
- `id`, `user_id`, `name`, `industry`, `target_audience`, `description`
- `plan` (starter | growth | pro)
- `credits_remaining`, `credits_reset_at`

### `social_connections`
TikTok OAuth tokens per org.
- `id`, `org_id`, `platform` (tiktok | instagram)
- `access_token`, `refresh_token`, `account_handle`, `connected_at`

### `analytics_snapshots`
Daily analytics pulled from TikTok API and cached.
- `id`, `org_id`, `platform`, `date`
- `followers`, `views`, `likes`, `comments`, `shares`, `impressions`, `engagement_rate`, `profile_views`

### `calendar_events`
Content calendar posts.
- `id`, `org_id`, `platform`, `scheduled_date`
- `caption`, `hashtags`, `video_idea`
- `status` (draft | scheduled | posted)
- `ai_generated` (bool)

### `chat_messages`
AI conversation history.
- `id`, `org_id`, `role` (user | assistant)
- `content`, `credits_used`, `model_used`, `created_at`

### `uf_rules_cache`
Scraped UF compliance rules. Single row, refreshed weekly.
- `id`, `content`, `fetched_at`

---

## 5. Page Structure & Routes

```
src/app/
├── (auth)/
│   ├── login/page.tsx               — Google sign-in
│   └── callback/page.tsx            — Supabase OAuth callback
├── onboarding/page.tsx              — Company setup (name, industry, audience)
├── (dashboard)/
│   ├── layout.tsx                   — Sidebar nav, credit counter
│   ├── page.tsx                     — Dashboard home (activity feed, quick actions, TikTok status)
│   ├── chat/page.tsx                — AI chat with company + analytics context
│   ├── calendar/page.tsx            — Content calendar
│   └── settings/page.tsx           — Plan, billing, TikTok connection, org details
└── api/
    ├── auth/callback/route.ts       — Supabase auth handler
    ├── tiktok/connect/route.ts      — TikTok OAuth initiation
    ├── tiktok/callback/route.ts     — TikTok OAuth callback + token storage
    ├── tiktok/sync/route.ts         — Pull latest analytics, store snapshot
    ├── chat/route.ts                — OpenAI streaming chat with context injection
    ├── calendar/route.ts            — CRUD for calendar events
    └── uf-rules/route.ts            — Fetch + cache UF rules from website
```

**Route guards:**
- Unauthenticated → redirect to `/login`
- Authenticated but no org → redirect to `/onboarding`
- Authenticated with org → access to all dashboard routes

---

## 6. AI Chat & UF Compliance

### System Prompt Construction (per request)
1. Company profile — name, industry, target audience, description
2. Latest analytics snapshot — followers, views, engagement rate, etc.
3. UF rules — from `uf_rules_cache` (scraped weekly from UF website)
4. Instructions — respond in Swedish, generate UF-compliant content only, flag borderline suggestions

### Credit Deduction
- Deducted after response completes
- Stored in `chat_messages` with `credits_used` and `model_used`
- 0 credits → API returns 402 → UI shows upgrade prompt

### UF Compliance
- UF rules injected into every system prompt
- AI refuses to generate misleading claims, exaggerated revenue promises, or non-compliant marketing
- Persistent disclaimer in chat UI (Swedish): *"Promotely genererar innehåll baserat på UF:s regler. Granska alltid innehåll innan publicering."*
- UF rules cache refreshed weekly via cron hitting `/api/uf-rules`

### Content Generation Output
When user requests post ideas, AI returns:
- Video concept / idea
- Caption (ready to copy-paste)
- 5–10 hashtags (Swedish + niche relevant)
- "Save to Calendar" button to drop directly into the content calendar

---

## 7. Content Calendar

### Views & Interactions
- Monthly grid with chips on days that have scheduled content
- Clicking a day opens a side panel for that day's events

### Event CRUD
- **Create** — pick date, platform (TikTok), enter or AI-generate content
- **Edit** — update any field, change date
- **Delete** — soft delete (status → deleted)

### AI Assist Flow
1. User clicks "Generate with AI" in event form
2. Request sent to `/api/chat` with company profile + chosen date + nearby existing events
3. AI returns video idea + caption + hashtags pre-filled into form
4. Costs 1 credit (2 if Pro premium model)
5. User can regenerate or edit before saving

### Status Chips
- **Draft** (grey) — saved, not ready
- **Scheduled** (blue) — confirmed, ready to post
- **Posted** (green) — manually marked by user (no auto-posting)

---

## 8. Out of Scope (Future Iterations)
- Analytics charts and historical data views
- Instagram integration
- Direct posting to social platforms
- Team/multi-user organizations
- Email notifications
