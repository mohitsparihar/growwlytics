-- =============================================================================
-- 003 — Add Instagram insight columns to posts table
-- =============================================================================
-- These fields come from the /{media_id}/insights Graph API endpoint.
-- Views already exists and maps to video_views; adding the rest here.
-- =============================================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saved       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS permalink   text;
