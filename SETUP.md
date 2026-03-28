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

In the Supabase dashboard go to SQL Editor and run each file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_razorpay_credits.sql
supabase/migrations/003_instagram_posts_insights.sql
```

Paste the contents of each file and click Run. Run them one at a time, in order.

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

1. Add Product → **Instagram Graph API** → Set Up
2. You do not need to add Instagram Basic Display — Graph API is what you want

**Configure OAuth redirect URI**

1. App Dashboard → Facebook Login → Settings (or App Settings → Basic → Valid OAuth Redirect URIs)
2. Add: `http://localhost:4000/api/auth/instagram/callback`
3. Save changes

**Get credentials**

App Dashboard → Settings → Basic:

| `.env` variable | Where to find it |
|---|---|
| `IG_APP_ID` | App ID (top of the page) |
| `IG_APP_SECRET` | App Secret → click Show |

Set `IG_REDIRECT_URI=http://localhost:4000/api/auth/instagram/callback` — this must exactly match what you registered above.

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
