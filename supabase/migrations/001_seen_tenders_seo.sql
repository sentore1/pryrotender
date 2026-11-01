-- =============================================================================
-- Migration: Extend seen_tenders for SEO-friendly tender pages
-- =============================================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is idempotent: safe to run more than once.
-- =============================================================================

-- 1. Add new columns (ALTER TABLE … ADD COLUMN IF NOT EXISTS requires PG 9.6+,
--    which Supabase always provides).

ALTER TABLE seen_tenders
  ADD COLUMN IF NOT EXISTS slug           TEXT,
  ADD COLUMN IF NOT EXISTS organization   TEXT,
  ADD COLUMN IF NOT EXISTS category       TEXT,
  ADD COLUMN IF NOT EXISTS location       TEXT DEFAULT 'Rwanda',
  ADD COLUMN IF NOT EXISTS deadline       TEXT,
  ADD COLUMN IF NOT EXISTS source_url     TEXT,
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- 2. Unique index on slug — prevents two tenders sharing the same public URL.
--    CONCURRENTLY avoids locking; skip if running inside a transaction block.
CREATE UNIQUE INDEX IF NOT EXISTS seen_tenders_slug_unique
  ON seen_tenders (slug)
  WHERE slug IS NOT NULL;

-- 3. Index for the sitemap query (ordered by first_seen_at DESC, slug NOT NULL).
CREATE INDEX IF NOT EXISTS seen_tenders_sitemap_idx
  ON seen_tenders (first_seen_at DESC)
  WHERE slug IS NOT NULL;

-- 4. Index for category landing pages.
CREATE INDEX IF NOT EXISTS seen_tenders_category_idx
  ON seen_tenders (category)
  WHERE slug IS NOT NULL;

-- 5. Auto-update updated_at on every row change.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seen_tenders_updated_at ON seen_tenders;
CREATE TRIGGER seen_tenders_updated_at
  BEFORE UPDATE ON seen_tenders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Row-Level Security: public SELECT on seen_tenders rows that have a slug.
--    This allows the public /tenders pages to use the anon key.
--    The cron route already uses the service-role key (bypasses RLS).

ALTER TABLE seen_tenders ENABLE ROW LEVEL SECURITY;

-- Drop old policy if it exists, then recreate cleanly.
DROP POLICY IF EXISTS "Public read for indexed tenders" ON seen_tenders;
CREATE POLICY "Public read for indexed tenders"
  ON seen_tenders
  FOR SELECT
  USING (slug IS NOT NULL);

-- Service-role key bypasses RLS automatically; no additional policy needed
-- for INSERT / UPDATE / DELETE from the cron.

-- =============================================================================
-- Verification queries (run after migration to confirm)
-- =============================================================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'seen_tenders' ORDER BY ordinal_position;
--
-- SELECT COUNT(*) FROM seen_tenders WHERE slug IS NOT NULL;
-- =============================================================================
