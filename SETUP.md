# External Setup Guide

Everything you need to configure outside the codebase before running Growwlytics locally.

---

## 1. Supabase

**Create a project**

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to you, set a strong DB password (save it)
3. Wait for provisioning (~2 min)

**Get credentials**

Go to Project Settings → API:

| `.env` variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL (e.g. `https://abcdef.supabase.co`) |
| `SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the same values as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

**Run migrations**

Supabase does not create app tables automatically. You must apply the SQL in this repo.

**Option A — one paste (easiest):** open `supabase/apply_all_migrations.sql` in your editor, copy everything, then in the Supabase dashboard go to **SQL Editor** → paste → **Run**. Use this on a **new** project (or before any Growwlytics tables exist).

**Option B — three steps:** in **SQL Editor**, run each file **in order**, one at a time:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_razorpay_credits.sql
supabase/migrations/003_instagram_posts_insights.sql
```

After success, **Table Editor** should list tables such as `profiles`, `credits`, `content_briefs`, `connected_accounts`, etc.

If you **signed up before** running migrations, your user may exist in **Authentication** but have no `profiles` row yet. After migrations, either sign up again with a new email or run a backfill (ask in chat / see SQL comments in migration 001 for the trigger that normally creates `profiles` + `credits`).

**Enable email auth**

Authentication → Providers → Email → make sure it's enabled. You can disable "Confirm email" during development so sign-ups work without an inbox.

---

## 2. Instagram / Facebook

Instagram's API requires a Facebook App and a Business/Creator account linked to a Facebook Page.

**Create a Facebook App**

1. Go to [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App
2. Use case: **Other** → App type: **Business**
3. Give it a name (e.g. "Growwlytics Dev")

**Add Instagram Graph API**

Inside your app dashboard:

1. Add Product → **Instagram Graph API** → Set Up (or the dashboard flow that adds **Instagram API with Facebook Login**)
2. Add **Facebook Login** (or **Facebook Login for Business** if the dashboard offers it) and complete its settings
3. You do not need Instagram Basic Display for this app

If OAuth shows **Invalid Scopes** for `instagram_*` / `pages_*`, your app is not allowed to request those permissions yet. This repo only requests `instagram_basic` and `pages_read_engagement` (per Meta’s get-started). Ensure the app type is **Business**, the Instagram + Facebook Login products are added, and your Meta **Use cases** include access to Instagram / Pages APIs for development. After App Review you can extend scopes (e.g. insights) in `apps/api/src/routes/auth.ts`.

**Configure OAuth redirect URI**

Meta often requires **HTTPS** for valid OAuth redirect URIs (not plain `http://` except sometimes for `localhost` in older setups). Use an HTTPS URL that matches how you run the app.

**Option A — HTTPS on localhost (recommended when Meta enforces SSL)**

1. In `.env`: `APP_URL=https://localhost:3000`, `NEXT_PUBLIC_API_URL=https://localhost:3000`, and `IG_REDIRECT_URI=https://localhost:3000/api/auth/instagram/callback`.
2. Run the app with **`npm run dev:https`** from the repo root (Next.js serves HTTPS; `/api/*` is proxied to Express on port 4000).
3. App Dashboard → Facebook Login → Settings → Valid OAuth Redirect URIs → add exactly: `https://localhost:3000/api/auth/instagram/callback`
4. Save changes. Trust the local certificate in your browser when prompted.

**Option B — HTTP to API on port 4000** (only if Meta still accepts it for your app)

1. Add: `http://localhost:4000/api/auth/instagram/callback`
2. Set `IG_REDIRECT_URI` to the same string and keep `NEXT_PUBLIC_API_URL=http://localhost:4000`
3. Save changes

**Get credentials**

App Dashboard → Settings → Basic:

| `.env` variable | Where to find it |
|---|---|
| `IG_APP_ID` | App ID (top of the page) |
| `IG_APP_SECRET` | App Secret → click Show |

Set `IG_REDIRECT_URI` to the **exact** redirect URI you registered (HTTPS vs HTTP, host, port, and path must match).

**Add test users**

While your app is in Development mode, only users explicitly added as testers can connect.

1. App Roles → Roles → Add Testers
2. Add your own Facebook account
3. Accept the tester invite at [developers.facebook.com/async/registration/dialog](https://developers.facebook.com/async/registration/dialog)

Your Instagram account must be a **Business or Creator** account linked to a Facebook Page. Personal accounts won't work.

To link: Instagram app → Settings → Account type and tools → Switch to Professional Account, then link a Facebook Page.

---

## 3. Razorpay

1. Sign up at [razorpay.com](https://razorpay.com) — free account is fine for testing
2. Dashboard → Settings → API Keys → Generate Test Key
3. Copy both keys

| `.env` variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | Starts with `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Shown once at creation |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` |

In test mode you can use Razorpay's test card numbers to simulate payments — no real money is charged.

---

## 4. Anthropic

You need an API key from [console.anthropic.com](https://console.anthropic.com).

| `.env` variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

Each content plan generation call uses `claude-opus-4-6` and costs roughly $0.01–0.05 depending on post history length.

---

## 5. Generate local secrets

These are not tied to any external service — just generate them locally.

**ENCRYPTION_KEY** — 64 hex characters (32 bytes), used to encrypt stored Instagram tokens:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**JWT_SECRET** — any long random string, used to sign OAuth state tokens:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. Complete `.env`

After all of the above, your `.env` at the repo root should look like:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

ANTHROPIC_API_KEY=sk-ant-...

IG_APP_ID=123456789
IG_APP_SECRET=abc123...
IG_REDIRECT_URI=http://localhost:4000/api/auth/instagram/callback

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

ENCRYPTION_KEY=<64 hex chars>
JWT_SECRET=<random string>

APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000

# If Meta requires HTTPS for OAuth, use dev:https and instead e.g.:
# APP_URL=https://localhost:3000
# NEXT_PUBLIC_API_URL=https://localhost:3000
# IG_REDIRECT_URI=https://localhost:3000/api/auth/instagram/callback
```

---

## 7. Running the app

```bash
# Install dependencies
npm install

# Build shared types (required before starting the API)
npm run build --workspace=packages/types

# Start both Next.js and Express in parallel
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- API health check: http://localhost:4000/health
