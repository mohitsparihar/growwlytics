/**
 * Meta OAuth env: trim whitespace / CR and optional wrapping quotes from .env.
 * Use the Facebook "App ID" from developers.facebook.com → App → Settings → Basic — not the
 * Instagram Basic Display "Instagram App ID" (Meta treats those as different; wrong one → INVALID_APP_ID).
 */

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

export function getIgAppId(): string {
  return stripQuotes(process.env.IG_APP_ID ?? "");
}

export function getIgAppSecret(): string {
  return stripQuotes(process.env.IG_APP_SECRET ?? "");
}

export function getIgRedirectUri(): string {
  return (process.env.IG_REDIRECT_URI ?? "").trim();
}

/** Meta expects a numeric app ID (no spaces or letters). */
export function isValidFacebookAppId(id: string): boolean {
  return /^\d{5,20}$/.test(id);
}
