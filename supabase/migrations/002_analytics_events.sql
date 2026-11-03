-- =============================================================================
-- Migration: Visitor Analytics Events
-- Run in Supabase Dashboard → SQL Editor → New query
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          bigserial PRIMARY KEY,
  session_id  text        NOT NULL,             -- random UUID generated client-side per browser session
  user_id     uuid        REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL = anonymous
  event_type  text        NOT NULL,             -- 'pageview' | 'click'
  path        text        NOT NULL,             -- e.g. '/dashboard', '/tenders/some-slug'
  target      text,                             -- for clicks: data-track attr or element label
  referrer    text,                             -- document.referrer
  user_agent  text,
  country     text,                             -- future: populated via edge function or header
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for the queries the admin dashboard will run
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx  ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx  ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS analytics_events_path_idx        ON analytics_events (path);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx     ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx     ON analytics_events (user_id);

-- RLS: only service-role (API route) can insert; admins can read all via API route
-- We do NOT expose this table directly to the browser anon key.
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- No browser-level policies — all reads/writes go through the /api/analytics route
-- which uses the service-role key.  This keeps the data completely private.
-- =============================================================================
