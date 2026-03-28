-- =============================================================================
-- Growwlytics — Initial Schema
-- =============================================================================
-- Run order matters: tables with foreign keys come after their parents.
-- All tables enable RLS; policies restrict every row to its owning user.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Automatically stamp updated_at on any table that has the column.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 1. profiles
-- Mirrors auth.users; created automatically on first sign-up (see trigger).
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  name          text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 2. connected_accounts
-- OAuth tokens for Instagram / YouTube connections.
-- ---------------------------------------------------------------------------
CREATE TYPE public.platform_type AS ENUM ('instagram', 'youtube');

CREATE TABLE public.connected_accounts (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform        platform_type   NOT NULL,
  external_id     text            NOT NULL,          -- platform-side account/channel id
  username        text            NOT NULL,
  access_token    text,                              -- encrypted at rest via Vault in prod
  refresh_token   text,
  token_expires_at timestamptz,
  follower_count  integer         NOT NULL DEFAULT 0,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, external_id)
);

CREATE INDEX idx_connected_accounts_user_id ON public.connected_accounts(user_id);

CREATE TRIGGER trg_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connected_accounts: owner all"
  ON public.connected_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 3. posts
-- The authenticated user's own synced posts.
-- ---------------------------------------------------------------------------
CREATE TABLE public.posts (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connected_account_id  uuid            NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
  platform              platform_type   NOT NULL,
  external_post_id      text            NOT NULL,    -- id on the platform
  caption               text,
  media_url             text,
  media_type            text,                        -- image | video | carousel | short
  likes                 integer         NOT NULL DEFAULT 0,
  comments              integer         NOT NULL DEFAULT 0,
  views                 integer         NOT NULL DEFAULT 0,
  shares                integer         NOT NULL DEFAULT 0,
  posted_at             timestamptz,
  synced_at             timestamptz     NOT NULL DEFAULT now(),
  created_at            timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (connected_account_id, external_post_id)
);

CREATE INDEX idx_posts_user_id   ON public.posts(user_id);
CREATE INDEX idx_posts_posted_at ON public.posts(posted_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts: owner all"
  ON public.posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 4. competitors
-- Competitor accounts the user wants to track.
-- ---------------------------------------------------------------------------
CREATE TABLE public.competitors (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform        platform_type   NOT NULL,
  external_id     text            NOT NULL,
  username        text            NOT NULL,
  display_name    text,
  avatar_url      text,
  follower_count  integer         NOT NULL DEFAULT 0,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, external_id)
);

CREATE INDEX idx_competitors_user_id ON public.competitors(user_id);

CREATE TRIGGER trg_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitors: owner all"
  ON public.competitors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 5. competitor_posts
-- Recent posts pulled from competitor accounts.
-- ---------------------------------------------------------------------------
CREATE TABLE public.competitor_posts (
  id               uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  competitor_id    uuid            NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  platform         platform_type   NOT NULL,
  external_post_id text            NOT NULL,
  caption          text,
  media_url        text,
  media_type       text,
  likes            integer         NOT NULL DEFAULT 0,
  comments         integer         NOT NULL DEFAULT 0,
  views            integer         NOT NULL DEFAULT 0,
  shares           integer         NOT NULL DEFAULT 0,
  posted_at        timestamptz,
  synced_at        timestamptz     NOT NULL DEFAULT now(),
  created_at       timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (competitor_id, external_post_id)
);

CREATE INDEX idx_competitor_posts_user_id       ON public.competitor_posts(user_id);
CREATE INDEX idx_competitor_posts_competitor_id ON public.competitor_posts(competitor_id);
CREATE INDEX idx_competitor_posts_posted_at     ON public.competitor_posts(posted_at DESC);

ALTER TABLE public.competitor_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitor_posts: owner all"
  ON public.competitor_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 6. credits
-- One row per user; tracks the running balance.
-- ---------------------------------------------------------------------------
CREATE TABLE public.credits (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_credits  integer     NOT NULL DEFAULT 0 CHECK (total_credits >= 0),
  used_credits   integer     NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- derived: available = total_credits - used_credits (always >= 0 enforced below)
  CONSTRAINT credits_available_non_negative CHECK (total_credits >= used_credits)
);

CREATE TRIGGER trg_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credits: owner read"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

-- Updates are done only through server-side functions (service role), not directly by clients.


-- ---------------------------------------------------------------------------
-- 7. content_briefs
-- AI-generated content plans; full plan stored as JSONB.
-- ---------------------------------------------------------------------------
-- Expected plan JSON shape:
-- {
--   "topic":          "string",
--   "hook":           "string",
--   "script_outline": ["string", ...],
--   "caption":        "string",
--   "hashtags":       ["string", ...],
--   "posting": {
--     "best_time":    "string",
--     "frequency":    "string"
--   }
-- }

CREATE TABLE public.content_briefs (
  id             uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform       platform_type   NOT NULL,
  niche          text            NOT NULL,
  goal           text,
  plan           jsonb           NOT NULL DEFAULT '{}',
  created_at     timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_briefs_user_id    ON public.content_briefs(user_id);
CREATE INDEX idx_content_briefs_created_at ON public.content_briefs(created_at DESC);
-- Allows efficient search within the plan JSON
CREATE INDEX idx_content_briefs_plan_gin   ON public.content_briefs USING gin(plan);

ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_briefs: owner all"
  ON public.content_briefs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 8. credit_transactions
-- Immutable ledger of every credit event (purchase, spend, free grant).
-- ---------------------------------------------------------------------------
CREATE TYPE public.credit_transaction_type AS ENUM ('purchase', 'use', 'free');

CREATE TABLE public.credit_transactions (
  id                       uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid                        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount                   integer                     NOT NULL,   -- positive = earned, negative = spent
  type                     credit_transaction_type     NOT NULL,
  plan_id                  uuid                        REFERENCES public.content_briefs(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,                                   -- set for 'purchase' rows
  description              text,
  created_at               timestamptz                 NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user_id    ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_plan_id    ON public.credit_transactions(plan_id);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_transactions: owner read"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates are done only through server-side functions (service role).


-- ---------------------------------------------------------------------------
-- 9. sync_logs
-- Audit trail for background data-sync jobs.
-- ---------------------------------------------------------------------------
CREATE TYPE public.sync_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE public.sync_type   AS ENUM ('posts', 'competitor_posts');

CREATE TABLE public.sync_logs (
  id                   uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connected_account_id uuid            REFERENCES public.connected_accounts(id) ON DELETE SET NULL,
  type                 sync_type       NOT NULL,
  status               sync_status     NOT NULL DEFAULT 'pending',
  records_synced       integer         NOT NULL DEFAULT 0,
  error                text,
  started_at           timestamptz     NOT NULL DEFAULT now(),
  completed_at         timestamptz,
  created_at           timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_user_id    ON public.sync_logs(user_id);
CREATE INDEX idx_sync_logs_started_at ON public.sync_logs(started_at DESC);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_logs: owner read"
  ON public.sync_logs FOR SELECT
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- Bootstrap trigger
-- Creates a profile + credits row the moment a user signs up via Supabase Auth.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.credits (user_id, total_credits, used_credits)
  VALUES (NEW.id, 3, 0);   -- every new user gets 3 free credits

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Credit spend helper (called by the API with service role)
-- Deducts one credit and records the transaction atomically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_credit(
  p_user_id  uuid,
  p_plan_id  uuid,
  p_desc     text DEFAULT 'Content plan generation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock the credits row to prevent double-spend races
  UPDATE public.credits
  SET used_credits = used_credits + 1
  WHERE user_id = p_user_id
    AND total_credits - used_credits >= 1;  -- available >= 1

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, plan_id, description)
  VALUES
    (p_user_id, -1, 'use', p_plan_id, p_desc);
END;
$$;


-- ---------------------------------------------------------------------------
-- Credit top-up helper (called by the API after Stripe webhook confirms payment)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id                  uuid,
  p_amount                   integer,
  p_type                     credit_transaction_type DEFAULT 'purchase',
  p_stripe_payment_intent_id text    DEFAULT NULL,
  p_desc                     text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.credits
  SET total_credits = total_credits + p_amount
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, stripe_payment_intent_id, description)
  VALUES
    (p_user_id, p_amount, p_type, p_stripe_payment_intent_id, p_desc);
END;
$$;
