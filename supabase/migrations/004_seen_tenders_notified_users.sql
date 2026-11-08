-- Migration: track per-user notification state on seen_tenders
-- Run in Supabase SQL editor

-- 1. Add notified_user_ids column (array of user UUIDs who have already been notified)
alter table seen_tenders
  add column if not exists notified_user_ids uuid[] not null default '{}';

-- 2. Helper RPC function to atomically append a user_id to the array
--    Used by the cron route to mark a user as notified without race conditions.
create or replace function append_notified_user(tender_id text, user_id uuid)
returns void
language sql
security definer
as $$
  update seen_tenders
  set notified_user_ids = array_append(notified_user_ids, user_id)
  where id = tender_id
    and not (notified_user_ids @> array[user_id]);
$$;

-- 3. Clear notified_user_ids for ALL existing tenders so every active user
--    gets a fresh notification on the next cron run.
--    Safe to run — it just resets who has been told about which tender.
update seen_tenders set notified_user_ids = '{}';
