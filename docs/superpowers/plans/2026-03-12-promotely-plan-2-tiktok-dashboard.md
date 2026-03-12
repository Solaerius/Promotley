# Promotely Dashboard & TikTok Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build TikTok OAuth connection, AES-256 token encryption, analytics sync (user-triggered + daily cron), and the live dashboard page with connection status, stats grid, and quick actions.

**Architecture:** TikTok tokens are AES-256-GCM encrypted at the application layer before DB storage. Sync logic is extracted into a shared helper (`syncOrg.ts`) used by both the user-triggered route and the cron route to keep them DRY. The dashboard is a Next.js Server Component that fetches the latest snapshot; a tiny `'use client'` component (`SyncTrigger`) fires the sync on mount and calls `router.refresh()` to reload server data.

**Tech Stack:** Next.js 16 App Router, Supabase (`@supabase/ssr`), Node.js built-in `crypto` (AES-256-GCM), TikTok Business API v2, Vercel Cron, Vitest + Testing Library.

---

## Environment Variables

Add to `.env.local` (and Vercel project settings):

```env
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/api/tiktok/callback
TOKEN_ENCRYPTION_KEY=<64 hex chars — generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_APP_URL=http://localhost:3000
# CRON_SECRET already set in Plan 1
```

Register your app at https://developers.tiktok.com. Set redirect URI to match `TIKTOK_REDIRECT_URI`. Required scopes: `user.info.basic,video.list`.

---

## File Map

**New files:**
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt for TikTok tokens
- `src/lib/__tests__/crypto.test.ts` — unit tests
- `src/lib/tiktok/client.ts` — TikTok API: user info + video stats aggregation
- `src/lib/tiktok/refreshToken.ts` — token refresh, throws on failure
- `src/lib/tiktok/syncOrg.ts` — shared sync logic (refresh check + analytics upsert)
- `src/lib/__tests__/tiktok/client.test.ts` — unit tests
- `src/lib/__tests__/tiktok/refreshToken.test.ts` — unit tests
- `src/lib/__tests__/tiktok/syncOrg.test.ts` — unit tests
- `src/app/api/tiktok/connect/route.ts` — redirect to TikTok OAuth with CSRF state cookie
- `src/app/api/tiktok/callback/route.ts` — exchange code, encrypt tokens, upsert connection
- `src/app/api/tiktok/sync/route.ts` — user-triggered org sync (authenticated)
- `src/app/api/tiktok/sync-all/route.ts` — cron: sync all connected orgs (service role)
- `src/app/api/tiktok/__tests__/connect.test.ts` — tests for connect route
- `src/app/api/tiktok/__tests__/callback.test.ts` — tests for callback route
- `src/app/api/tiktok/__tests__/sync.test.ts` — tests for sync + sync-all routes
- `src/components/dashboard/TikTokStatusWidget.tsx` — connection status card
- `src/components/dashboard/AnalyticsStatsGrid.tsx` — 8-stat display grid
- `src/components/dashboard/QuickActionsCard.tsx` — navigation quick links
- `src/components/dashboard/ActivityFeed.tsx` — empty state (populated in Plan 4)
- `src/components/dashboard/SyncTrigger.tsx` — client component fires sync on mount
- `src/components/dashboard/__tests__/TikTokStatusWidget.test.tsx`
- `src/components/dashboard/__tests__/AnalyticsStatsGrid.test.tsx`
- `src/components/dashboard/__tests__/SyncTrigger.test.tsx`
- `vercel.json` — cron for `sync-all` at 06:00 UTC

**Modified files:**
- `src/app/(dashboard)/page.tsx` — replace placeholder with live dashboard

---

## Chunk 1: Crypto & TikTok Libraries

### Task 1: AES-256-GCM Crypto Utilities

**Files:**
- Create: `src/lib/crypto.ts`
- Create: `src/lib/__tests__/crypto.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/crypto.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'

// Set TOKEN_ENCRYPTION_KEY before the module is loaded
beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = '0'.repeat(64) // 32 zero-bytes as hex
})

// Lazy import after env is set
let encrypt: (p: string) => string
let decrypt: (c: string) => string

beforeAll(async () => {
  const mod = await import('../crypto')
  encrypt = mod.encrypt
  decrypt = mod.decrypt
})

describe('encrypt / decrypt', () => {
  it('round-trips plaintext correctly', () => {
    const plaintext = 'access_token_abc123'
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const plaintext = 'same_token'
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext))
  })

  it('throws on tampered ciphertext (auth tag mismatch)', () => {
    const encrypted = encrypt('token')
    const [iv, tag, data] = encrypted.split(':')
    const tampered = `${iv}:${tag}:0000${data.slice(4)}`
    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws on malformed ciphertext (missing segments)', () => {
    expect(() => decrypt('not-valid-format')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/crypto.test.ts
```

Expected: FAIL — `Cannot find module '../crypto'`

- [ ] **Step 3: Implement crypto utilities**

Create `src/lib/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

// Returns: "ivHex:authTagHex:ciphertextHex"
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, authTagHex, encryptedHex] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/crypto.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto.ts src/lib/__tests__/crypto.test.ts
git commit -m "feat: add AES-256-GCM token encryption utilities"
```

---

### Task 2: TikTok API Client

**Files:**
- Create: `src/lib/tiktok/client.ts`
- Create: `src/lib/__tests__/tiktok/client.test.ts`

TikTok Business API v2 endpoints:
- `GET /v2/user/info/?fields=display_name,follower_count` — handle + followers
- `POST /v2/video/list/` — recent videos with play/like/comment/share counts (max 20, no pagination for MVP)

`impressions` = `views` (play_count) for MVP — TikTok doesn't expose a separate impressions field in the standard API tier.
`profile_views` = 0 for MVP — requires an additional scope not needed for core analytics.

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/tiktok/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTikTokAnalytics } from '@/lib/tiktok/client'

const mockUserInfo = {
  data: { user: { display_name: 'testcompany', follower_count: 1000 } },
  error: { code: 'ok', message: '' },
}

const mockVideoList = {
  data: {
    videos: [
      { statistics: { play_count: 500, digg_count: 50, comment_count: 10, share_count: 5 } },
      { statistics: { play_count: 300, digg_count: 30, comment_count: 5, share_count: 3 } },
    ],
    has_more: false,
  },
  error: { code: 'ok', message: '' },
}

describe('fetchTikTokAnalytics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('aggregates user info and video stats correctly', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockUserInfo } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => mockVideoList } as Response)

    const result = await fetchTikTokAnalytics('access_token_123')

    expect(result.followers).toBe(1000)
    expect(result.account_handle).toBe('testcompany')
    expect(result.views).toBe(800)       // 500 + 300
    expect(result.likes).toBe(80)        // 50 + 30
    expect(result.comments).toBe(15)     // 10 + 5
    expect(result.shares).toBe(8)        // 5 + 3
    expect(result.impressions).toBe(800) // same as views
    expect(result.profile_views).toBe(0) // not available in basic tier
  })

  it('throws when user info API returns non-ok HTTP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    await expect(fetchTikTokAnalytics('bad_token')).rejects.toThrow(
      'TikTok user info request failed: 401'
    )
  })

  it('throws when video list API returns non-ok HTTP', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockUserInfo } as Response)
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
    await expect(fetchTikTokAnalytics('token')).rejects.toThrow(
      'TikTok video list request failed: 429'
    )
  })

  it('returns zero stats when video list is empty', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockUserInfo } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videos: [], has_more: false }, error: { code: 'ok' } }),
      } as Response)

    const result = await fetchTikTokAnalytics('token')
    expect(result.views).toBe(0)
    expect(result.likes).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/__tests__/tiktok/client.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tiktok/client'`

- [ ] **Step 3: Implement TikTok API client**

Create `src/lib/tiktok/client.ts`:

```typescript
const TIKTOK_BASE = 'https://open.tiktokapis.com'

export interface TikTokAnalytics {
  account_handle: string
  followers: number
  views: number
  likes: number
  comments: number
  shares: number
  impressions: number
  profile_views: number
}

export async function fetchTikTokAnalytics(accessToken: string): Promise<TikTokAnalytics> {
  const headers = { Authorization: `Bearer ${accessToken}` }

  // Fetch user info
  const userRes = await fetch(
    `${TIKTOK_BASE}/v2/user/info/?fields=display_name,follower_count`,
    { headers }
  )
  if (!userRes.ok) {
    throw new Error(`TikTok user info request failed: ${userRes.status}`)
  }
  const userData = await userRes.json()
  const user = userData.data?.user ?? {}

  // Fetch recent videos (last 20, no pagination for MVP)
  const videoRes = await fetch(`${TIKTOK_BASE}/v2/video/list/`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: ['statistics'], max_count: 20 }),
  })
  if (!videoRes.ok) {
    throw new Error(`TikTok video list request failed: ${videoRes.status}`)
  }
  const videoData = await videoRes.json()
  const videos: Array<{
    statistics: { play_count: number; digg_count: number; comment_count: number; share_count: number }
  }> = videoData.data?.videos ?? []

  const views = videos.reduce((sum, v) => sum + (v.statistics?.play_count ?? 0), 0)
  const likes = videos.reduce((sum, v) => sum + (v.statistics?.digg_count ?? 0), 0)
  const comments = videos.reduce((sum, v) => sum + (v.statistics?.comment_count ?? 0), 0)
  const shares = videos.reduce((sum, v) => sum + (v.statistics?.share_count ?? 0), 0)

  return {
    account_handle: user.display_name ?? '',
    followers: user.follower_count ?? 0,
    views,
    likes,
    comments,
    shares,
    impressions: views, // play_count = impressions for MVP
    profile_views: 0,   // requires additional scope, not in MVP
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/tiktok/client.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tiktok/client.ts src/lib/__tests__/tiktok/client.test.ts
git commit -m "feat: add TikTok API client for user info and video stats"
```

---

### Task 3: Token Refresh & Shared Sync Helper

**Files:**
- Create: `src/lib/tiktok/refreshToken.ts`
- Create: `src/lib/tiktok/syncOrg.ts`
- Create: `src/lib/__tests__/tiktok/refreshToken.test.ts`
- Create: `src/lib/__tests__/tiktok/syncOrg.test.ts`

- [ ] **Step 1: Write failing refresh token test**

Create `src/lib/__tests__/tiktok/refreshToken.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { refreshTikTokToken } from '@/lib/tiktok/refreshToken'

describe('refreshTikTokToken', () => {
  beforeEach(() => {
    process.env.TIKTOK_CLIENT_KEY = 'test_key'
    process.env.TIKTOK_CLIENT_SECRET = 'test_secret'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns new tokens on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new_access', refresh_token: 'new_refresh', expires_in: 86400 }),
    } as Response)

    const result = await refreshTikTokToken('old_refresh_token')

    expect(result.access_token).toBe('new_access')
    expect(result.refresh_token).toBe('new_refresh')
    expect(result.expires_in).toBe(86400)
  })

  it('throws "Token refresh failed" on non-ok HTTP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    await expect(refreshTikTokToken('bad_token')).rejects.toThrow('Token refresh failed: 401')
  })

  it('sends correct form body with refresh_token grant', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'a', refresh_token: 'b', expires_in: 3600 }),
    } as Response)

    await refreshTikTokToken('my_refresh')

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://open.tiktokapis.com/v2/oauth/token/')
    expect(init?.method).toBe('POST')
    const body = new URLSearchParams(init?.body as string)
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('my_refresh')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/__tests__/tiktok/refreshToken.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tiktok/refreshToken'`

- [ ] **Step 3: Implement refreshToken**

Create `src/lib/tiktok/refreshToken.ts`:

```typescript
export interface RefreshedTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function refreshTikTokToken(refreshToken: string): Promise<RefreshedTokens> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/tiktok/refreshToken.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Write failing syncOrg tests**

Create `src/lib/__tests__/tiktok/syncOrg.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = '0'.repeat(64)
})

// Mock all external dependencies using module aliases (must match how syncOrg.ts imports them)
vi.mock('@/lib/tiktok/client', () => ({
  fetchTikTokAnalytics: vi.fn(),
}))
vi.mock('@/lib/tiktok/refreshToken', () => ({
  refreshTikTokToken: vi.fn(),
}))
vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn((s: string) => `enc:${s}`),
  decrypt: vi.fn((s: string) => s.replace('enc:', '')),
}))

import { syncConnectionRecord } from '@/lib/tiktok/syncOrg'
import { fetchTikTokAnalytics } from '@/lib/tiktok/client'
import { refreshTikTokToken } from '@/lib/tiktok/refreshToken'

const makeSupabase = () => {
  const mockEq = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  const mockUpsert = vi.fn().mockResolvedValue({ error: null })
  const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate, upsert: mockUpsert })
  return { from: mockFrom, _mockUpsert: mockUpsert }
}

const connectedConn = {
  id: 'conn1',
  org_id: 'org1',
  access_token: 'enc:real_token',
  refresh_token: 'enc:real_refresh',
  token_expires_at: new Date(Date.now() + 7_200_000).toISOString(), // 2h future
  status: 'connected',
}

describe('syncConnectionRecord', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns needs_reauth immediately without calling TikTok API', async () => {
    const supabase = makeSupabase()
    const conn = { ...connectedConn, status: 'needs_reauth' }

    const result = await syncConnectionRecord(supabase as any, conn)

    expect(result).toEqual({ synced: false, reason: 'needs_reauth' })
    expect(fetchTikTokAnalytics).not.toHaveBeenCalled()
  })

  it('syncs successfully and calls upsert with analytics data', async () => {
    const { from, _mockUpsert } = makeSupabase()
    const supabase = { from } as any

    vi.mocked(fetchTikTokAnalytics).mockResolvedValue({
      account_handle: 'myco',
      followers: 500,
      views: 1000,
      likes: 100,
      comments: 20,
      shares: 10,
      impressions: 1000,
      profile_views: 0,
    })

    const result = await syncConnectionRecord(supabase, connectedConn)

    expect(result).toEqual({ synced: true })
    expect(fetchTikTokAnalytics).toHaveBeenCalledWith('real_token')
    expect(_mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org1',
        platform: 'tiktok',
        followers: 500,
        engagement_rate: expect.any(Number),
      }),
      { onConflict: 'org_id,platform,date' }
    )
  })

  it('sets status to needs_reauth and returns needs_reauth when refresh fails', async () => {
    const { from } = makeSupabase()
    const supabase = { from } as any

    vi.mocked(refreshTikTokToken).mockRejectedValue(new Error('Token refresh failed: 401'))

    // Token expires within 1 hour — triggers refresh
    const expiringConn = {
      ...connectedConn,
      token_expires_at: new Date(Date.now() + 1_800_000).toISOString(), // 30min future
    }

    const result = await syncConnectionRecord(supabase, expiringConn)

    expect(result).toEqual({ synced: false, reason: 'needs_reauth' })
    expect(from).toHaveBeenCalledWith('social_connections')
  })

  it('calculates engagement_rate as (likes+comments+shares)/followers', async () => {
    const { from, _mockUpsert } = makeSupabase()
    const supabase = { from } as any

    vi.mocked(fetchTikTokAnalytics).mockResolvedValue({
      account_handle: 'co',
      followers: 1000,
      views: 5000,
      likes: 200,
      comments: 50,
      shares: 25,
      impressions: 5000,
      profile_views: 0,
    })

    await syncConnectionRecord(supabase, connectedConn)

    expect(_mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ engagement_rate: 0.275 }), // (200+50+25)/1000
      expect.anything()
    )
  })

  it('stores engagement_rate as 0 when followers is 0', async () => {
    const { from, _mockUpsert } = makeSupabase()
    const supabase = { from } as any

    vi.mocked(fetchTikTokAnalytics).mockResolvedValue({
      account_handle: 'co',
      followers: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      impressions: 0,
      profile_views: 0,
    })

    await syncConnectionRecord(supabase, connectedConn)

    expect(_mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ engagement_rate: 0 }),
      expect.anything()
    )
  })
})
```

- [ ] **Step 6: Run to verify failure**

```bash
npx vitest run src/lib/__tests__/tiktok/syncOrg.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tiktok/syncOrg'`

- [ ] **Step 7: Implement syncOrg shared helper**

Create `src/lib/tiktok/syncOrg.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { decrypt, encrypt } from '@/lib/crypto'
import { fetchTikTokAnalytics } from './client'
import { refreshTikTokToken } from './refreshToken'

export type SyncResult =
  | { synced: true }
  | { synced: false; reason: 'needs_reauth' | 'api_error' | 'not_connected' }

export interface SocialConnectionRecord {
  id: string
  org_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  status: string
}

/**
 * Core sync logic — accepts a pre-fetched connection record.
 * Used by both /api/tiktok/sync (user-triggered) and /api/tiktok/sync-all (cron).
 */
export async function syncConnectionRecord(
  supabase: SupabaseClient,
  connection: SocialConnectionRecord
): Promise<SyncResult> {
  if (connection.status === 'needs_reauth') {
    return { synced: false, reason: 'needs_reauth' }
  }

  let accessToken = decrypt(connection.access_token)
  const tokenExpiresAt = new Date(connection.token_expires_at)
  const oneHourFromNow = new Date(Date.now() + 3_600_000)

  // Refresh token if expiring within 1 hour
  if (tokenExpiresAt <= oneHourFromNow) {
    try {
      const refreshed = await refreshTikTokToken(decrypt(connection.refresh_token))
      accessToken = refreshed.access_token
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000)
      await supabase
        .from('social_connections')
        .update({
          access_token: encrypt(refreshed.access_token),
          refresh_token: encrypt(refreshed.refresh_token),
          token_expires_at: newExpiry.toISOString(),
          status: 'connected',
        })
        .eq('id', connection.id)
    } catch {
      await supabase
        .from('social_connections')
        .update({ status: 'needs_reauth' })
        .eq('id', connection.id)
      return { synced: false, reason: 'needs_reauth' }
    }
  }

  try {
    const analytics = await fetchTikTokAnalytics(accessToken)
    const today = new Date().toISOString().split('T')[0]
    const engagementRate =
      analytics.followers > 0
        ? (analytics.likes + analytics.comments + analytics.shares) / analytics.followers
        : 0

    await supabase.from('analytics_snapshots').upsert(
      {
        org_id: connection.org_id,
        platform: 'tiktok',
        date: today,
        followers: analytics.followers,
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        impressions: analytics.impressions,
        profile_views: analytics.profile_views,
        engagement_rate: engagementRate,
      },
      { onConflict: 'org_id,platform,date' }
    )

    return { synced: true }
  } catch {
    return { synced: false, reason: 'api_error' }
  }
}
```

- [ ] **Step 8: Run all Chunk 1 tests**

```bash
npx vitest run src/lib/__tests__/
```

Expected: PASS (all tests in the `__tests__` directory)

- [ ] **Step 9: Commit**

```bash
git add src/lib/tiktok/refreshToken.ts src/lib/tiktok/syncOrg.ts \
        src/lib/__tests__/tiktok/refreshToken.test.ts src/lib/__tests__/tiktok/syncOrg.test.ts
git commit -m "feat: add TikTok token refresh and shared sync helper"
```

---

## Chunk 2: TikTok OAuth Routes

### Task 4: TikTok Connect Route

**Files:**
- Create: `src/app/api/tiktok/connect/route.ts`
- Create: `src/app/api/tiktok/__tests__/connect.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/tiktok/__tests__/connect.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { GET } from '../connect/route'
import { createClient } from '@/lib/supabase/server'

describe('GET /api/tiktok/connect', () => {
  beforeEach(() => {
    process.env.TIKTOK_CLIENT_KEY = 'test_key'
    process.env.TIKTOK_REDIRECT_URI = 'http://localhost:3000/api/tiktok/callback'
  })

  afterEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    const res = await GET(new Request('http://localhost/api/tiktok/connect'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('unauthorized')
  })

  it('redirects to TikTok OAuth URL when authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user1' } }, error: null }) },
    } as any)

    const res = await GET(new Request('http://localhost/api/tiktok/connect'))

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('tiktok.com/v2/auth/authorize')
    expect(location).toContain('client_key=test_key')
    expect(location).toContain('state=')
  })

  it('sets tiktok_oauth_state HttpOnly cookie on redirect', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user1' } }, error: null }) },
    } as any)

    const res = await GET(new Request('http://localhost/api/tiktok/connect'))

    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('tiktok_oauth_state=')
    expect(setCookie.toLowerCase()).toContain('httponly')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/app/api/tiktok/__tests__/connect.test.ts
```

Expected: FAIL — `Cannot find module '../connect/route'`

- [ ] **Step 3: Implement connect route**

Create `src/app/api/tiktok/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: 'user.info.basic,video.list',
    response_type: 'code',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    state,
  })

  const response = NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  )

  // CSRF protection: validate state in callback
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/api/tiktok/__tests__/connect.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tiktok/connect/route.ts src/app/api/tiktok/__tests__/connect.test.ts
git commit -m "feat: add TikTok OAuth connect route with CSRF state cookie"
```

---

### Task 5: TikTok OAuth Callback Route

**Files:**
- Create: `src/app/api/tiktok/callback/route.ts`
- Create: `src/app/api/tiktok/__tests__/callback.test.ts`

The callback handles: OAuth error/missing params → `/?error=tiktok_auth_failed`, CSRF mismatch → same, no session → `/login`, token exchange, encrypt + upsert connection, clear cookie → redirect `/`.

- [ ] **Step 1: Write failing test**

Create `src/app/api/tiktok/__tests__/callback.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn((s: string) => `enc:${s}`),
}))

import { GET } from '../callback/route'
import { createClient } from '@/lib/supabase/server'

describe('GET /api/tiktok/callback', () => {
  afterEach(() => vi.clearAllMocks())

  it('redirects to /?error=tiktok_auth_failed when OAuth error param present', async () => {
    const req = new Request(
      'http://localhost/api/tiktok/callback?error=access_denied&state=abc'
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=tiktok_auth_failed')
  })

  it('redirects to /?error=tiktok_auth_failed when code is missing', async () => {
    const req = new Request('http://localhost/api/tiktok/callback?state=abc')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=tiktok_auth_failed')
  })

  it('redirects to /?error=tiktok_auth_failed when state cookie is missing', async () => {
    // No cookie on the request — state mismatch
    const req = new Request(
      'http://localhost/api/tiktok/callback?code=CODE123&state=abc'
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=tiktok_auth_failed')
  })

  it('redirects to /login when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    // State matches cookie: manually set cookie header
    const req = new Request(
      'http://localhost/api/tiktok/callback?code=CODE123&state=valid_state',
      { headers: { Cookie: 'tiktok_oauth_state=valid_state' } }
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/app/api/tiktok/__tests__/callback.test.ts
```

Expected: FAIL — `Cannot find module '../callback/route'`

- [ ] **Step 3: Implement callback route**

Create `src/app/api/tiktok/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam || !code || !state) {
    return NextResponse.redirect(`${origin}/?error=tiktok_auth_failed`)
  }

  // Validate CSRF state
  const cookieState = request.cookies.get('tiktok_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${origin}/?error=tiktok_auth_failed`)
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!org) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/?error=tiktok_token_failed`)
  }

  const tokens = await tokenRes.json()

  // Fetch display name for account handle (non-fatal)
  let accountHandle: string = tokens.open_id ?? ''
  try {
    const userInfoRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json()
      accountHandle = userInfo.data?.user?.display_name ?? accountHandle
    }
  } catch {
    // Fall back to open_id as handle
  }

  const now = new Date()
  const tokenExpiresAt = new Date(now.getTime() + (tokens.expires_in ?? 86400) * 1000)

  await supabase.from('social_connections').upsert(
    {
      org_id: org.id,
      platform: 'tiktok',
      access_token: encrypt(tokens.access_token),
      refresh_token: encrypt(tokens.refresh_token),
      token_expires_at: tokenExpiresAt.toISOString(),
      account_handle: accountHandle,
      connected_at: now.toISOString(),
      status: 'connected',
    },
    { onConflict: 'org_id,platform' }
  )

  const response = NextResponse.redirect(`${origin}/`)
  response.cookies.delete('tiktok_oauth_state')
  return response
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/api/tiktok/__tests__/callback.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tiktok/callback/route.ts src/app/api/tiktok/__tests__/callback.test.ts
git commit -m "feat: add TikTok OAuth callback route"
```

---

## Chunk 3: Sync Routes & Cron Config

### Task 6: User-Triggered Sync Route

**Files:**
- Create: `src/app/api/tiktok/sync/route.ts`
- Create: `src/app/api/tiktok/__tests__/sync.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/tiktok/__tests__/sync.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/tiktok/syncOrg', () => ({
  syncConnectionRecord: vi.fn(),
}))

import { GET } from '../sync/route'
import { createClient } from '@/lib/supabase/server'
import { syncConnectionRecord } from '@/lib/tiktok/syncOrg'

const mockConn = {
  id: 'conn1',
  org_id: 'org1',
  access_token: 'enc:token',
  refresh_token: 'enc:refresh',
  token_expires_at: new Date(Date.now() + 7_200_000).toISOString(),
  status: 'connected',
}

function makeSupabase(user: object | null, org: object | null, connection: object | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : new Error('no user') }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: connection, error: null }),
          }),
          single: vi.fn().mockResolvedValue({ data: org, error: null }),
        }),
      }),
    }),
  }
}

describe('GET /api/tiktok/sync', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(null, null, null) as any)

    const res = await GET(new Request('http://localhost/api/tiktok/sync'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('unauthorized')
  })

  it('returns not_connected when no TikTok connection exists', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'org1' }, null) as any
    )

    const res = await GET(new Request('http://localhost/api/tiktok/sync'))
    const body = await res.json()

    expect(body).toEqual({ synced: false, reason: 'not_connected' })
  })

  it('delegates to syncConnectionRecord and returns its result', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'org1' }, mockConn) as any
    )
    vi.mocked(syncConnectionRecord).mockResolvedValue({ synced: true })

    const res = await GET(new Request('http://localhost/api/tiktok/sync'))
    const body = await res.json()

    expect(body).toEqual({ synced: true })
    expect(syncConnectionRecord).toHaveBeenCalledWith(expect.anything(), mockConn)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/app/api/tiktok/__tests__/sync.test.ts
```

Expected: FAIL — `Cannot find module '../sync/route'`

- [ ] **Step 3: Implement user sync route**

Create `src/app/api/tiktok/sync/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncConnectionRecord } from '@/lib/tiktok/syncOrg'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!org) {
    return NextResponse.json({ error: 'Organization not found', code: 'not_found' }, { status: 404 })
  }

  const { data: connection } = await supabase
    .from('social_connections')
    .select('id, org_id, access_token, refresh_token, token_expires_at, status')
    .eq('org_id', org.id)
    .eq('platform', 'tiktok')
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({ synced: false, reason: 'not_connected' })
  }

  const result = await syncConnectionRecord(supabase, connection)
  return NextResponse.json(result)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/api/tiktok/__tests__/sync.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tiktok/sync/route.ts src/app/api/tiktok/__tests__/sync.test.ts
git commit -m "feat: add user-triggered TikTok sync route"
```

---

### Task 7: Cron Sync-All Route

**Files:**
- Create: `src/app/api/tiktok/sync-all/route.ts`

- [ ] **Step 1: Write failing test**

Add to `src/app/api/tiktok/__tests__/sync.test.ts` — append these at the **end of the file** (after all existing describe blocks):

```typescript
import { GET as syncAllGET } from '../sync-all/route'
import { createServiceClient } from '@/lib/supabase/server'

describe('GET /api/tiktok/sync-all', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns 403 when Authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'secret123'
    const req = new Request('http://localhost/api/tiktok/sync-all', {
      headers: { Authorization: 'Bearer wrong_secret' },
    })
    const res = await syncAllGET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('invalid_cron_secret')
  })

  it('returns 403 when Authorization header is missing', async () => {
    process.env.CRON_SECRET = 'secret123'
    const req = new Request('http://localhost/api/tiktok/sync-all')
    const res = await syncAllGET(req)
    expect(res.status).toBe(403)
  })

  it('returns { synced: 0 } when no connected TikTok connections', async () => {
    process.env.CRON_SECRET = 'secret123'
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as any)

    const req = new Request('http://localhost/api/tiktok/sync-all', {
      headers: { Authorization: 'Bearer secret123' },
    })
    const res = await syncAllGET(req)
    const body = await res.json()
    expect(body.synced).toBe(0)
  })
})
```

Note: The `import { GET as syncAllGET }` and `import { createServiceClient }` lines must be moved to the **top of the file** with the other imports. Move them there before running.

- [ ] **Step 2: Move the new imports to the top of the file**

Edit `src/app/api/tiktok/__tests__/sync.test.ts` to move the two new import lines to the top, alongside the existing imports:

```typescript
// At top of file, add:
import { GET as syncAllGET } from '../sync-all/route'
import { createServiceClient } from '@/lib/supabase/server'
```

Remove these lines from the bottom of the file (they were only placeholder instructions).

- [ ] **Step 3: Run to verify new tests fail**

```bash
npx vitest run src/app/api/tiktok/__tests__/sync.test.ts
```

Expected: existing 3 tests PASS, new 3 tests FAIL — `Cannot find module '../sync-all/route'`

- [ ] **Step 4: Implement sync-all cron route**

Create `src/app/api/tiktok/sync-all/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncConnectionRecord, type SocialConnectionRecord } from '@/lib/tiktok/syncOrg'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden', code: 'invalid_cron_secret' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const { data: connections } = await supabase
    .from('social_connections')
    .select('id, org_id, access_token, refresh_token, token_expires_at, status')
    .eq('platform', 'tiktok')
    .eq('status', 'connected')

  if (!connections?.length) {
    return NextResponse.json({ synced: 0 })
  }

  let synced = 0
  for (const connection of connections as SocialConnectionRecord[]) {
    try {
      const result = await syncConnectionRecord(supabase, connection)
      if (result.synced) synced++
    } catch (err) {
      console.error(`Failed to sync connection ${connection.id}:`, err)
    }
  }

  return NextResponse.json({ synced })
}
```

- [ ] **Step 5: Run all sync tests**

```bash
npx vitest run src/app/api/tiktok/__tests__/sync.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/tiktok/sync-all/route.ts src/app/api/tiktok/__tests__/sync.test.ts
git commit -m "feat: add cron sync-all route for daily TikTok analytics"
```

---

### Task 8: Vercel Cron Config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

Create `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/tiktok/sync-all",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Note: `/api/chat` `maxDuration` and the `/api/uf-rules` weekly cron will be added in Plan 3.

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "require('./vercel.json'); console.log('valid JSON')"
```

Expected: `valid JSON`

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel cron for TikTok daily sync at 06:00 UTC"
```

---

## Chunk 4: Dashboard UI

### Task 9: Dashboard Components

**Files:**
- Create: `src/components/dashboard/TikTokStatusWidget.tsx`
- Create: `src/components/dashboard/AnalyticsStatsGrid.tsx`
- Create: `src/components/dashboard/QuickActionsCard.tsx`
- Create: `src/components/dashboard/ActivityFeed.tsx`
- Create: `src/components/dashboard/__tests__/TikTokStatusWidget.test.tsx`
- Create: `src/components/dashboard/__tests__/AnalyticsStatsGrid.test.tsx`

All are Server Components (no `'use client'`).

- [ ] **Step 1: Write failing TikTokStatusWidget test**

Create `src/components/dashboard/__tests__/TikTokStatusWidget.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TikTokStatusWidget } from '../TikTokStatusWidget'

describe('TikTokStatusWidget', () => {
  it('shows connect link when no connection', () => {
    render(<TikTokStatusWidget connection={null} />)
    const link = screen.getByRole('link', { name: /anslut tiktok/i })
    expect(link).toHaveAttribute('href', '/api/tiktok/connect')
  })

  it('shows reconnect link when status is needs_reauth', () => {
    render(
      <TikTokStatusWidget
        connection={{ status: 'needs_reauth', account_handle: 'myco', connected_at: '' }}
      />
    )
    expect(screen.getByRole('link', { name: /återanslut/i })).toBeInTheDocument()
  })

  it('shows account handle when connected', () => {
    render(
      <TikTokStatusWidget
        connection={{ status: 'connected', account_handle: 'mycoolco', connected_at: '' }}
      />
    )
    expect(screen.getByText(/@mycoolco/)).toBeInTheDocument()
    expect(screen.getByText(/ansluten/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/components/dashboard/__tests__/TikTokStatusWidget.test.tsx
```

Expected: FAIL — `Cannot find module '../TikTokStatusWidget'`

- [ ] **Step 3: Implement TikTokStatusWidget**

Create `src/components/dashboard/TikTokStatusWidget.tsx`:

```typescript
interface Connection {
  status: string
  account_handle: string
  connected_at: string
}

interface Props {
  connection: Connection | null
}

export function TikTokStatusWidget({ connection }: Props) {
  if (!connection) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          TikTok
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Anslut ditt TikTok-konto för att analysera din data.
        </p>
        <a
          href="/api/tiktok/connect"
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Anslut TikTok
        </a>
      </div>
    )
  }

  if (connection.status === 'needs_reauth') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          TikTok
        </h2>
        <p className="mb-4 text-sm text-amber-800">Din TikTok-anslutning behöver förnyas.</p>
        <a
          href="/api/tiktok/connect"
          className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
        >
          Återanslut TikTok
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">TikTok</h2>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-gray-900">@{connection.account_handle}</span>
        <span className="text-xs text-gray-400">Ansluten</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write failing AnalyticsStatsGrid test**

Create `src/components/dashboard/__tests__/AnalyticsStatsGrid.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnalyticsStatsGrid } from '../AnalyticsStatsGrid'

const mockSnapshot = {
  followers: 1000,
  views: 5000,
  likes: 200,
  comments: 50,
  shares: 25,
  impressions: 5000,
  profile_views: 0,
  engagement_rate: 0.275, // (200+50+25)/1000
}

describe('AnalyticsStatsGrid', () => {
  it('shows placeholder when no snapshot', () => {
    render(<AnalyticsStatsGrid snapshot={null} />)
    expect(screen.getByText(/ansluter till tiktok/i)).toBeInTheDocument()
  })

  it('displays followers in sv-SE locale format', () => {
    render(<AnalyticsStatsGrid snapshot={mockSnapshot} />)
    // 1000 in sv-SE = "1 000" (non-breaking space)
    expect(screen.getByText('1\u00a0000')).toBeInTheDocument()
  })

  it('formats engagement_rate as percentage via formatEngagementRate', () => {
    render(<AnalyticsStatsGrid snapshot={mockSnapshot} />)
    expect(screen.getByText('27.5%')).toBeInTheDocument()
  })

  it('renders all 8 stat labels', () => {
    render(<AnalyticsStatsGrid snapshot={mockSnapshot} />)
    const labels = [
      'Följare', 'Visningar', 'Likes', 'Engagemangsgrad',
      'Profilvisningar', 'Kommentarer', 'Delningar', 'Impressioner',
    ]
    labels.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument())
  })
})
```

- [ ] **Step 5: Run to verify failure**

```bash
npx vitest run src/components/dashboard/__tests__/AnalyticsStatsGrid.test.tsx
```

Expected: FAIL — `Cannot find module '../AnalyticsStatsGrid'`

- [ ] **Step 6: Implement AnalyticsStatsGrid**

Create `src/components/dashboard/AnalyticsStatsGrid.tsx`:

```typescript
import { formatEngagementRate } from '@/lib/format'

interface Snapshot {
  followers: number
  views: number
  likes: number
  comments: number
  shares: number
  impressions: number
  profile_views: number
  engagement_rate: number
}

interface Props {
  snapshot: Snapshot | null
}

type SnapshotKey = keyof Snapshot

const STATS: { key: SnapshotKey; label: string; format: (v: number) => string }[] = [
  { key: 'followers', label: 'Följare', format: (v) => v.toLocaleString('sv-SE') },
  { key: 'views', label: 'Visningar', format: (v) => v.toLocaleString('sv-SE') },
  { key: 'likes', label: 'Likes', format: (v) => v.toLocaleString('sv-SE') },
  { key: 'engagement_rate', label: 'Engagemangsgrad', format: formatEngagementRate },
  { key: 'profile_views', label: 'Profilvisningar', format: (v) => v.toLocaleString('sv-SE') },
  { key: 'comments', label: 'Kommentarer', format: (v) => v.toLocaleString('sv-SE') },
  { key: 'shares', label: 'Delningar', format: (v) => v.toLocaleString('sv-SE') },
  { key: 'impressions', label: 'Impressioner', format: (v) => v.toLocaleString('sv-SE') },
]

export function AnalyticsStatsGrid({ snapshot }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Statistik
      </h2>
      {!snapshot ? (
        <p className="text-sm text-gray-500">Ansluter till TikTok...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(({ key, label, format }) => (
            <div key={key} className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {format(snapshot[key] as number)}
              </p>
              <p className="mt-1 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create QuickActionsCard and ActivityFeed**

Create `src/components/dashboard/QuickActionsCard.tsx`:

```typescript
import Link from 'next/link'

const ACTIONS = [
  { href: '/chat', label: 'AI-chatt', description: 'Generera innehåll med AI' },
  { href: '/calendar', label: 'Kalender', description: 'Planera dina inlägg' },
  { href: '/settings', label: 'Inställningar', description: 'Hantera ditt konto' },
]

export function QuickActionsCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Snabbåtgärder
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ACTIONS.map(({ href, label, description }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

Create `src/components/dashboard/ActivityFeed.tsx`:

```typescript
// Populated with calendar events in Plan 4. Shows empty state until then.
export function ActivityFeed() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Aktivitet
      </h2>
      <p className="py-8 text-center text-sm text-gray-500">Inga aktiviteter än.</p>
    </div>
  )
}
```

- [ ] **Step 8: Run component tests**

```bash
npx vitest run src/components/dashboard/__tests__/
```

Expected: PASS (6 tests across 2 files)

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: add dashboard UI components — TikTok status, analytics grid, quick actions, activity feed"
```

---

### Task 10: SyncTrigger Client Component

**Files:**
- Create: `src/components/dashboard/SyncTrigger.tsx`
- Create: `src/components/dashboard/__tests__/SyncTrigger.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/dashboard/__tests__/SyncTrigger.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}))

import { SyncTrigger } from '../SyncTrigger'
import { useRouter } from 'next/navigation'

describe('SyncTrigger', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('calls /api/tiktok/sync on mount', async () => {
    render(<SyncTrigger />)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tiktok/sync')
    })
  })

  it('calls router.refresh() after sync completes', async () => {
    const mockRefresh = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ refresh: mockRefresh } as any)

    render(<SyncTrigger />)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('renders nothing — returns null', () => {
    const { container } = render(<SyncTrigger />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/components/dashboard/__tests__/SyncTrigger.test.tsx
```

Expected: FAIL — `Cannot find module '../SyncTrigger'`

- [ ] **Step 3: Implement SyncTrigger**

Create `src/components/dashboard/SyncTrigger.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SyncTrigger() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/tiktok/sync')
      .then(() => router.refresh())
      .catch(() => {
        // Silent fail — dashboard keeps showing last known snapshot
      })
  }, [router])

  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/dashboard/__tests__/SyncTrigger.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/SyncTrigger.tsx \
        src/components/dashboard/__tests__/SyncTrigger.test.tsx
git commit -m "feat: add SyncTrigger client component for background TikTok sync on dashboard mount"
```

---

### Task 11: Dashboard Page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

Replace the Plan 1 placeholder with the live dashboard. Server Component fetches org, TikTok connection, and latest analytics snapshot.

- [ ] **Step 1: Read the current placeholder**

Open `src/app/(dashboard)/page.tsx` and note its current content.

- [ ] **Step 2: Replace with live dashboard**

Overwrite `src/app/(dashboard)/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TikTokStatusWidget } from '@/components/dashboard/TikTokStatusWidget'
import { AnalyticsStatsGrid } from '@/components/dashboard/AnalyticsStatsGrid'
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { SyncTrigger } from '@/components/dashboard/SyncTrigger'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/onboarding')

  const { data: connection } = await supabase
    .from('social_connections')
    .select('status, account_handle, connected_at')
    .eq('org_id', org.id)
    .eq('platform', 'tiktok')
    .maybeSingle()

  const { data: snapshot } = await supabase
    .from('analytics_snapshots')
    .select(
      'followers, views, likes, comments, shares, impressions, profile_views, engagement_rate'
    )
    .eq('org_id', org.id)
    .eq('platform', 'tiktok')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <SyncTrigger />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Här är din översikt</p>
      </div>

      <TikTokStatusWidget connection={connection} />
      <AnalyticsStatsGrid snapshot={snapshot} />
      <QuickActionsCard />
      <ActivityFeed />
    </div>
  )
}
```

- [ ] **Step 3: Check for TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 5: Start dev server and visually verify**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. Expected:
- Org name in heading
- TikTok widget shows "Anslut TikTok" button (no connection yet)
- Analytics grid shows "Ansluter till TikTok..."
- Quick actions: AI-chatt, Kalender, Inställningar
- Activity feed: "Inga aktiviteter än."
- No console errors

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/page.tsx
git commit -m "feat: replace dashboard placeholder with live data — TikTok status, analytics, quick actions"
```

---

## Remaining Plans

- **Plan 3:** AI Chat — OpenAI streaming, UF rules scraper + weekly cron (`/api/uf-rules`), credit deduction, `<post-suggestion>` structured output parsing, chat page UI
- **Plan 4:** Content Calendar — monthly grid, CRUD, AI-assisted event generation, activity feed population
- **Plan 5:** Billing — Stripe Checkout, webhook handlers, plan gating, Customer Portal link, settings page
