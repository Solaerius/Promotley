import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the server Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock next/headers (needed by Supabase server client internally)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

import { GET, PATCH } from '../route'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createClient)

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    ...overrides,
  }
  // Ensure chained methods return the mock itself for fluent chaining
  ;(mock.from as ReturnType<typeof vi.fn>).mockReturnValue(mock)
  ;(mock.select as ReturnType<typeof vi.fn>).mockReturnValue(mock)
  ;(mock.eq as ReturnType<typeof vi.fn>).mockReturnValue(mock)
  ;(mock.insert as ReturnType<typeof vi.fn>).mockReturnValue(mock)
  ;(mock.update as ReturnType<typeof vi.fn>).mockReturnValue(mock)
  ;(mock.upsert as ReturnType<typeof vi.fn>).mockReturnValue(mock)
  return mock
}

describe('GET /api/org', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const mock = makeSupabaseMock()
    mockCreateClient.mockResolvedValue(mock as any)

    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('unauthorized')
  })

  it('returns existing org for authenticated user', async () => {
    const fakeOrg = { id: 'org-1', user_id: 'user-1', name: 'Test AB' }
    const mock = makeSupabaseMock({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    })
    mock.single = vi.fn().mockResolvedValue({ data: fakeOrg, error: null })
    ;(mock.eq as ReturnType<typeof vi.fn>).mockReturnValue(mock)
    mockCreateClient.mockResolvedValue(mock as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('org-1')
  })

  it('creates org when none exists', async () => {
    const newOrg = { id: 'org-new', user_id: 'user-1', name: '' }
    const mock = makeSupabaseMock({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    })
    // First call: org not found; second call: newly created org
    mock.single = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: newOrg, error: null })
    ;(mock.eq as ReturnType<typeof vi.fn>).mockReturnValue(mock)
    mockCreateClient.mockResolvedValue(mock as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('org-new')
  })
})

describe('PATCH /api/org', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const mock = makeSupabaseMock()
    mockCreateClient.mockResolvedValue(mock as any)

    const req = new Request('http://localhost/api/org', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('unauthorized')
  })

  it('updates allowed fields and returns updated org', async () => {
    const updatedOrg = { id: 'org-1', name: 'New Name', industry: 'Tech' }
    const mock = makeSupabaseMock({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    })
    mock.single = vi.fn().mockResolvedValue({ data: updatedOrg, error: null })
    ;(mock.eq as ReturnType<typeof vi.fn>).mockReturnValue(mock)
    mockCreateClient.mockResolvedValue(mock as any)

    const req = new Request('http://localhost/api/org', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name', industry: 'Tech' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('New Name')
  })

  it('strips disallowed fields like credits_remaining', async () => {
    const updatedOrg = { id: 'org-1', name: 'Test' }
    const mock = makeSupabaseMock({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    })
    mock.single = vi.fn().mockResolvedValue({ data: updatedOrg, error: null })
    ;(mock.eq as ReturnType<typeof vi.fn>).mockReturnValue(mock)
    mockCreateClient.mockResolvedValue(mock as any)

    const req = new Request('http://localhost/api/org', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Test', credits_remaining: 999 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    // Verify upsert was NOT called with credits_remaining
    const upsertCall = (mock.upsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(upsertCall).not.toHaveProperty('credits_remaining')
  })
})
