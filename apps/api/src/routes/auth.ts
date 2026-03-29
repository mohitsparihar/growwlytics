/**
 * Instagram OAuth routes.
 *
 * Flow:
 *   1. GET /api/auth/instagram?token=<supabase_jwt>
 *      Verifies the JWT, creates a signed state token, redirects the browser
 *      to the Facebook OAuth dialog.
 *
 *   2. GET /api/auth/instagram/callback?code=...&state=...
 *      Facebook redirects back here after the user grants permission.
 *      Verifies the state HMAC, exchanges the code for a long-lived token,
 *      saves the connected account to the DB (encrypted token), then
 *      redirects the user back to the frontend onboarding page.
 *
 * State token format:
 *   base64(JSON({userId, ts})) + "." + HMAC-SHA256(data, JWT_SECRET)
 *   → stateless, no DB table required, expires after 10 minutes.
 *
 * Access token storage:
 *   Encrypted with AES-256-CBC via lib/encryption.ts before DB insert.
 */

import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabase.js";
import { encrypt } from "../lib/encryption.js";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramAccount,
} from "../lib/instagram.js";
import {
  getIgAppId,
  getIgRedirectUri,
  isValidFacebookAppId,
} from "../lib/instagram-config.js";

const router = Router();

// ---------------------------------------------------------------------------
// Env (read per OAuth request so .env changes apply without restart)
// ---------------------------------------------------------------------------
const STATE_SECRET = process.env.JWT_SECRET!;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// Minimal scopes per Meta "Instagram API with Facebook Login" get-started:
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started
// pages_show_list was removed by Meta; pages_read_engagement is its replacement.
// Requesting instagram_manage_insights before it is enabled on your app (App Review / Use cases)
// makes Meta reject the whole list as "Invalid Scopes".
// Insights calls in the API fail soft without those permissions (zeros returned).
const IG_SCOPES = ["instagram_basic", "pages_read_engagement"].join(",");

// ---------------------------------------------------------------------------
// State helpers (HMAC-signed, stateless)
// ---------------------------------------------------------------------------
function createState(userId: string): string {
  const data = Buffer.from(
    JSON.stringify({ userId, ts: Date.now() })
  ).toString("base64");
  const sig = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(data)
    .digest("hex");
  return `${data}.${sig}`;
}

/**
 * Returns the userId if the state is valid and not expired (<10 min),
 * or null if it has been tampered with or is stale.
 */
function verifyState(state: string): string | null {
  const dot = state.lastIndexOf(".");
  if (dot === -1) return null;

  const data = state.slice(0, dot);
  const sig = state.slice(dot + 1);

  const expected = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(data)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expected, "hex")
      )
    ) {
      return null;
    }
  } catch {
    return null; // buffer lengths differ → invalid
  }

  const { userId, ts } = JSON.parse(
    Buffer.from(data, "base64").toString("utf8")
  ) as { userId: string; ts: number };

  // Expire after 10 minutes
  if (Date.now() - ts > 10 * 60 * 1000) return null;

  return userId;
}

// ---------------------------------------------------------------------------
// GET /api/auth/instagram
// Accepts the Supabase JWT as ?token= (browser redirect — can't set headers).
// Verifies the token, then redirects to the Facebook OAuth dialog.
// ---------------------------------------------------------------------------
router.get("/instagram", async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string | undefined;

  if (!token) {
    res.status(400).json({ error: "Missing token query parameter" });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const appId = getIgAppId();
  const redirectUri = getIgRedirectUri();

  if (!isValidFacebookAppId(appId)) {
    res.status(500).json({
      error: "Instagram login is not configured correctly",
      hint:
        "IG_APP_ID must be the numeric Facebook App ID from developers.facebook.com → Your App → App settings → Basic. " +
        "Do not use the Instagram Basic Display \"Instagram App ID\" (different product). " +
        "Remove quotes/spaces. If you deploy the API separately, set IG_APP_ID on the API host.",
    });
    return;
  }

  if (!redirectUri) {
    res.status(500).json({
      error: "Instagram login is not configured correctly",
      hint:
        "IG_REDIRECT_URI is missing. It must exactly match a valid OAuth redirect URI in Meta → Facebook Login → Settings. " +
        "Meta often requires HTTPS (e.g. https://localhost:3000/api/auth/instagram/callback with `npm run dev:https` and NEXT_PUBLIC_API_URL set to that origin).",
    });
    return;
  }

  const state = createState(user.id);

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: IG_SCOPES,
    response_type: "code",
    state,
  });

  res.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
});

// ---------------------------------------------------------------------------
// GET /api/auth/instagram/callback
// Facebook posts the authorization code here after the user grants access.
// ---------------------------------------------------------------------------
router.get(
  "/instagram/callback",
  async (req: Request, res: Response): Promise<void> => {
    const { code, state, error: oauthError } = req.query as Record<
      string,
      string | undefined
    >;

    // --- User denied access ---
    if (oauthError) {
      console.warn("Instagram OAuth denied:", oauthError);
      res.redirect(`${APP_URL}/onboarding?error=instagram_denied`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${APP_URL}/onboarding?error=instagram_invalid_callback`);
      return;
    }

    // --- Verify state HMAC ---
    const userId = verifyState(state);
    if (!userId) {
      res.redirect(`${APP_URL}/onboarding?error=instagram_state_mismatch`);
      return;
    }

    try {
      // 1. Exchange code → short-lived token
      const shortToken = await exchangeCodeForToken(code);

      // 2. Exchange → long-lived token (~60 days)
      const longToken = await exchangeForLongLivedToken(shortToken.access_token);

      // 3. Discover the connected Instagram Business/Creator account
      const igAccount = await getInstagramAccount(longToken.access_token);

      // 4. Encrypt the token before storage
      const encryptedToken = encrypt(longToken.access_token);

      // 5. Compute expiry timestamp
      const expiresAt = new Date(
        Date.now() + (longToken.expires_in ?? 5_184_000) * 1000
      ).toISOString(); // default 60 days

      // 6. Upsert connected_account (handles reconnects gracefully)
      const { error: upsertError } = await supabase
        .from("connected_accounts")
        .upsert(
          {
            user_id: userId,
            platform: "instagram",
            external_id: igAccount.id,
            username: igAccount.username,
            access_token: encryptedToken,
            refresh_token: null,
            token_expires_at: expiresAt,
            follower_count: igAccount.followers_count,
          },
          { onConflict: "user_id,platform,external_id" }
        );

      if (upsertError) {
        console.error("Failed to save connected account:", upsertError);
        res.redirect(`${APP_URL}/onboarding?error=instagram_save_failed`);
        return;
      }

      res.redirect(`${APP_URL}/onboarding?instagram=connected`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Instagram OAuth callback error:", msg);
      res.redirect(
        `${APP_URL}/onboarding?error=instagram_failed&detail=${encodeURIComponent(msg)}`
      );
    }
  }
);

export default router;
