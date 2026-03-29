/**
 * Validates public Supabase env for browser/server clients.
 * Placeholders or typos here cause net::ERR_NAME_NOT_RESOLVED in the browser.
 */
function readPublicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { url, anonKey };
}

/** True when URL + anon key are set, non-placeholder, and URL is valid. */
export function hasPublicSupabaseEnv(): boolean {
  const { url, anonKey } = readPublicSupabaseEnv();
  if (
    !url ||
    !anonKey ||
    url.includes("your-project") ||
    anonKey.includes("your-anon-key")
  ) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  const { url, anonKey } = readPublicSupabaseEnv();

  const looksPlaceholder =
    !url ||
    !anonKey ||
    url.includes("your-project") ||
    anonKey.includes("your-anon-key");

  if (looksPlaceholder) {
    throw new Error(
      "Supabase URL or anon key is missing or still a placeholder. In the repo root .env, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your project (Supabase Dashboard → Settings → API), matching SUPABASE_URL and SUPABASE_ANON_KEY. Then stop and restart `npm run dev`."
    );
  }

  try {
    new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL (got: ${url.slice(0, 64)}…). It should look like https://xxxx.supabase.co`
    );
  }

  return { url, anonKey };
}
