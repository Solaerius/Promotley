-- =============================================================================
-- Promotely — Initial Schema Migration
-- Created: 2026-03-12
-- =============================================================================

-- ---------------------------------------------------------------------------
-- organizations
-- One row per user. Holds plan, credits, billing, and onboarding state.
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL DEFAULT '',
  industry              TEXT        NOT NULL DEFAULT '',
  target_audience       TEXT        NOT NULL DEFAULT '',
  description           TEXT        NOT NULL DEFAULT '',
  plan                  TEXT        NOT NULL DEFAULT 'starter'
                          CHECK (plan IN ('starter', 'growth', 'pro')),
  credits_remaining     INTEGER     NOT NULL DEFAULT 50
                          CHECK (credits_remaining >= 0),
  credits_reset_at      TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  billing_status        TEXT        NOT NULL DEFAULT 'active'
                          CHECK (billing_status IN ('active', 'past_due', 'cancelled')),
  onboarding_completed  BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- social_connections
-- TikTok / Instagram tokens (stored AES-256-GCM encrypted at app layer).
-- One connection per platform per org.
-- ---------------------------------------------------------------------------
CREATE TABLE social_connections (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform         TEXT        NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  access_token     TEXT        NOT NULL,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  account_handle   TEXT,
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status           TEXT        NOT NULL DEFAULT 'connected'
                     CHECK (status IN ('connected', 'needs_reauth')),
  UNIQUE (org_id, platform)
);

-- ---------------------------------------------------------------------------
-- analytics_snapshots
-- Daily stats per org + platform. One row per (org, platform, date).
-- engagement_rate stored as decimal (e.g. 0.043 = 4.3%).
-- ---------------------------------------------------------------------------
CREATE TABLE analytics_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  date            DATE        NOT NULL,
  followers       INTEGER     NOT NULL DEFAULT 0,
  views           INTEGER     NOT NULL DEFAULT 0,
  likes           INTEGER     NOT NULL DEFAULT 0,
  comments        INTEGER     NOT NULL DEFAULT 0,
  shares          INTEGER     NOT NULL DEFAULT 0,
  impressions     INTEGER     NOT NULL DEFAULT 0,
  profile_views   INTEGER     NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, date)
);

-- ---------------------------------------------------------------------------
-- calendar_events
-- Content calendar. Soft-deleted: status = 'deleted', deleted_at = now().
-- RLS SELECT policy filters out deleted rows.
-- ---------------------------------------------------------------------------
CREATE TABLE calendar_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform       TEXT        NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  scheduled_date DATE        NOT NULL,
  caption        TEXT        NOT NULL DEFAULT '',
  hashtags       TEXT[]      NOT NULL DEFAULT '{}',
  video_idea     TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'scheduled', 'posted', 'deleted')),
  ai_generated   BOOLEAN     NOT NULL DEFAULT false,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- chat_messages
-- Persisted AI chat history. credits_used = 0 for user messages.
-- ---------------------------------------------------------------------------
CREATE TABLE chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  credits_used INTEGER    NOT NULL DEFAULT 0,
  model_used  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- uf_rules_cache
-- Single-row table (id = 1). Scraped weekly from ungforetagsamhet.se.
-- Hardcoded fallback inserted as seed below.
-- ---------------------------------------------------------------------------
CREATE TABLE uf_rules_cache (
  id         INTEGER     PRIMARY KEY CHECK (id = 1),
  content    TEXT        NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Frequent lookups of org by user (used in every authenticated request)
CREATE INDEX idx_organizations_user_id ON organizations (user_id);

-- Analytics queries ordered by date
CREATE INDEX idx_analytics_snapshots_org_platform_date
  ON analytics_snapshots (org_id, platform, date DESC);

-- Calendar queries ordered by scheduled date (dashboard + calendar page)
CREATE INDEX idx_calendar_events_org_date
  ON calendar_events (org_id, scheduled_date);

-- Chat history ordered by creation time
CREATE INDEX idx_chat_messages_org_created
  ON chat_messages (org_id, created_at DESC);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE uf_rules_cache      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- organizations policies
-- Users can only access their own row (user_id = auth.uid()).
-- ---------------------------------------------------------------------------
CREATE POLICY "organizations_select_own"
  ON organizations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "organizations_insert_own"
  ON organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "organizations_update_own"
  ON organizations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "organizations_delete_own"
  ON organizations FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- social_connections policies
-- Access scoped through the user's org.
-- ---------------------------------------------------------------------------
CREATE POLICY "social_connections_select_own"
  ON social_connections FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "social_connections_insert_own"
  ON social_connections FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "social_connections_update_own"
  ON social_connections FOR UPDATE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "social_connections_delete_own"
  ON social_connections FOR DELETE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- analytics_snapshots policies
-- ---------------------------------------------------------------------------
CREATE POLICY "analytics_snapshots_select_own"
  ON analytics_snapshots FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_snapshots_insert_own"
  ON analytics_snapshots FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_snapshots_update_own"
  ON analytics_snapshots FOR UPDATE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_snapshots_delete_own"
  ON analytics_snapshots FOR DELETE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- calendar_events policies
-- SELECT filters out soft-deleted rows (status != 'deleted').
-- INSERT/UPDATE/DELETE do NOT filter by status — app layer handles soft delete.
-- ---------------------------------------------------------------------------
CREATE POLICY "calendar_events_select_own"
  ON calendar_events FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
    AND status != 'deleted'
  );

CREATE POLICY "calendar_events_insert_own"
  ON calendar_events FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_events_update_own"
  ON calendar_events FOR UPDATE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_events_delete_own"
  ON calendar_events FOR DELETE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- chat_messages policies
-- ---------------------------------------------------------------------------
CREATE POLICY "chat_messages_select_own"
  ON chat_messages FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_update_own"
  ON chat_messages FOR UPDATE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_delete_own"
  ON chat_messages FOR DELETE
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- uf_rules_cache policies
-- Any authenticated user can read (system-wide cache).
-- No write access via RLS — writes happen via service role only.
-- ---------------------------------------------------------------------------
CREATE POLICY "uf_rules_cache_select_authenticated"
  ON uf_rules_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- Seed Data
-- =============================================================================

-- Fallback UF marketing guidelines. Overwritten weekly by /api/uf-rules cron.
INSERT INTO uf_rules_cache (id, content, fetched_at)
VALUES (
  1,
  'UF (Ung Företagsamhet) marknadsföringsregler:
1. Var transparent med att du är ett UF-företag
2. Följ Konsumentverkets regler för marknadsföring
3. Undvik vilseledande påståenden
4. Använd tydliga call-to-actions
5. Anpassa innehåll för din målgrupp
6. Var konsekvent med din varumärkesidentitet
7. Engagera din publik med autentiskt innehåll
8. Mät och analysera dina resultat regelbundet',
  now()
);
