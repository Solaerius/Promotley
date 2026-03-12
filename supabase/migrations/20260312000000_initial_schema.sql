-- =============================================================================
-- Promotely — Initial Schema Migration (idempotent — safe to re-run)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name                   TEXT        NOT NULL DEFAULT '',
  industry               TEXT        NOT NULL DEFAULT '',
  target_audience        TEXT        NOT NULL DEFAULT '',
  description            TEXT        NOT NULL DEFAULT '',
  plan                   TEXT        NOT NULL DEFAULT 'starter'
                           CHECK (plan IN ('starter', 'growth', 'pro')),
  credits_remaining      INTEGER     NOT NULL DEFAULT 50
                           CHECK (credits_remaining >= 0),
  credits_reset_at       TIMESTAMPTZ,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  billing_status         TEXT        NOT NULL DEFAULT 'active'
                           CHECK (billing_status IN ('active', 'past_due', 'cancelled')),
  onboarding_completed   BOOLEAN     NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_connections (
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

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform        TEXT          NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  date            DATE          NOT NULL,
  followers       INTEGER       NOT NULL DEFAULT 0,
  views           INTEGER       NOT NULL DEFAULT 0,
  likes           INTEGER       NOT NULL DEFAULT 0,
  comments        INTEGER       NOT NULL DEFAULT 0,
  shares          INTEGER       NOT NULL DEFAULT 0,
  impressions     INTEGER       NOT NULL DEFAULT 0,
  profile_views   INTEGER       NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, date)
);

CREATE TABLE IF NOT EXISTS calendar_events (
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

CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT        NOT NULL,
  credits_used INTEGER     NOT NULL DEFAULT 0,
  model_used   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uf_rules_cache (
  id         INTEGER     PRIMARY KEY CHECK (id = 1),
  content    TEXT        NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_organizations_user_id
  ON organizations (user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_org_platform_date
  ON analytics_snapshots (org_id, platform, date DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_date
  ON calendar_events (org_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_chat_messages_org_created
  ON chat_messages (org_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE uf_rules_cache      ENABLE ROW LEVEL SECURITY;

-- Drop policies first so re-runs don't error
DROP POLICY IF EXISTS "organizations_select_own"    ON organizations;
DROP POLICY IF EXISTS "organizations_insert_own"    ON organizations;
DROP POLICY IF EXISTS "organizations_update_own"    ON organizations;
DROP POLICY IF EXISTS "organizations_delete_own"    ON organizations;

DROP POLICY IF EXISTS "social_connections_select_own" ON social_connections;
DROP POLICY IF EXISTS "social_connections_insert_own" ON social_connections;
DROP POLICY IF EXISTS "social_connections_update_own" ON social_connections;
DROP POLICY IF EXISTS "social_connections_delete_own" ON social_connections;

DROP POLICY IF EXISTS "analytics_snapshots_select_own" ON analytics_snapshots;
DROP POLICY IF EXISTS "analytics_snapshots_insert_own" ON analytics_snapshots;
DROP POLICY IF EXISTS "analytics_snapshots_update_own" ON analytics_snapshots;
DROP POLICY IF EXISTS "analytics_snapshots_delete_own" ON analytics_snapshots;

DROP POLICY IF EXISTS "calendar_events_select_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_own" ON calendar_events;

DROP POLICY IF EXISTS "chat_messages_select_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_own" ON chat_messages;

DROP POLICY IF EXISTS "uf_rules_cache_select_authenticated" ON uf_rules_cache;

-- organizations
CREATE POLICY "organizations_select_own" ON organizations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "organizations_insert_own" ON organizations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "organizations_update_own" ON organizations
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "organizations_delete_own" ON organizations
  FOR DELETE USING (user_id = auth.uid());

-- social_connections
CREATE POLICY "social_connections_select_own" ON social_connections
  FOR SELECT USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "social_connections_insert_own" ON social_connections
  FOR INSERT WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "social_connections_update_own" ON social_connections
  FOR UPDATE
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "social_connections_delete_own" ON social_connections
  FOR DELETE USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- analytics_snapshots
CREATE POLICY "analytics_snapshots_select_own" ON analytics_snapshots
  FOR SELECT USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "analytics_snapshots_insert_own" ON analytics_snapshots
  FOR INSERT WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "analytics_snapshots_update_own" ON analytics_snapshots
  FOR UPDATE
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "analytics_snapshots_delete_own" ON analytics_snapshots
  FOR DELETE USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- calendar_events (SELECT hides soft-deleted rows)
CREATE POLICY "calendar_events_select_own" ON calendar_events
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
    AND status != 'deleted'
  );

CREATE POLICY "calendar_events_insert_own" ON calendar_events
  FOR INSERT WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "calendar_events_update_own" ON calendar_events
  FOR UPDATE
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "calendar_events_delete_own" ON calendar_events
  FOR DELETE USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- chat_messages
CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "chat_messages_update_own" ON chat_messages
  FOR UPDATE
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "chat_messages_delete_own" ON chat_messages
  FOR DELETE USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- uf_rules_cache (read-only via RLS; writes use service role)
CREATE POLICY "uf_rules_cache_select_authenticated" ON uf_rules_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

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
)
ON CONFLICT (id) DO NOTHING;
