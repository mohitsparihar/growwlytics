/**
 * Instagram Graph API client (v18.0).
 *
 * All functions throw on Graph API errors so callers can handle them
 * uniformly without checking every return value.
 */

const GRAPH = "https://graph.facebook.com/v18.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface IgTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number; // seconds; present on long-lived tokens
}

export interface IgAccount {
  id: string;
  name: string;
  username: string;
  followers_count: number;
  profile_picture_url?: string;
}

export interface IgMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
  media_url?: string;
  permalink?: string;
}

export interface IgInsights {
  impressions: number;
  reach: number;
  saved: number;
  video_views: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function graphError(body: Record<string, unknown>): string {
  const e = body.error as Record<string, unknown> | undefined;
  return String(e?.message ?? JSON.stringify(body));
}

async function graphGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json()) as Record<string, unknown>;
  if (body.error) throw new Error(graphError(body));
  return body as T;
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for a short-lived user access token.
 * Short-lived tokens expire in ~1 hour; call exchangeForLongLivedToken next.
 */
export async function exchangeCodeForToken(
  code: string
): Promise<IgTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.IG_APP_ID!,
    client_secret: process.env.IG_APP_SECRET!,
    redirect_uri: process.env.IG_REDIRECT_URI!,
    code,
  });
  return graphGet<IgTokenResponse>(`${GRAPH}/oauth/access_token?${params}`);
}

/**
 * Exchange a short-lived user token for a long-lived token (~60 days).
 * expires_in is in seconds.
 */
export async function exchangeForLongLivedToken(
  shortToken: string
): Promise<IgTokenResponse & { expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.IG_APP_ID!,
    client_secret: process.env.IG_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
  return graphGet<IgTokenResponse & { expires_in: number }>(
    `${GRAPH}/oauth/access_token?${params}`
  );
}

// ---------------------------------------------------------------------------
// Account discovery
// ---------------------------------------------------------------------------

/**
 * Finds the Instagram Business/Creator account connected to the user's
 * Facebook Pages. Returns the IG account info plus the page-scoped access
 * token needed for media/insights calls.
 *
 * Throws if no Instagram Business Account is found on any page.
 */
export async function getInstagramAccount(
  userToken: string
): Promise<IgAccount & { pageAccessToken: string }> {
  type PagesResponse = {
    data: Array<{ id: string; access_token: string }>;
    error?: unknown;
  };

  const pages = await graphGet<PagesResponse>(
    `${GRAPH}/me/accounts?access_token=${encodeURIComponent(userToken)}`
  );

  if (!pages.data?.length) {
    throw new Error(
      "No Facebook Pages found. Please connect a Business or Creator account first."
    );
  }

  for (const page of pages.data) {
    type PageIgResponse = {
      instagram_business_account?: { id: string };
      error?: unknown;
    };

    const pageData = await graphGet<PageIgResponse>(
      `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(page.access_token)}`
    );

    if (!pageData.instagram_business_account) continue;

    const igId = pageData.instagram_business_account.id;
    const account = await graphGet<IgAccount>(
      `${GRAPH}/${igId}?fields=id,name,username,followers_count,profile_picture_url` +
        `&access_token=${encodeURIComponent(page.access_token)}`
    );

    return { ...account, pageAccessToken: page.access_token };
  }

  throw new Error(
    "No Instagram Business Account found. Connect an Instagram Business or Creator account to your Facebook Page and try again."
  );
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/**
 * Fetches the most recent media items (up to `limit`) for the given
 * Instagram account.
 */
export async function fetchMedia(
  igAccountId: string,
  accessToken: string,
  limit = 50
): Promise<IgMedia[]> {
  const fields = [
    "id",
    "caption",
    "media_type",
    "timestamp",
    "like_count",
    "comments_count",
    "thumbnail_url",
    "media_url",
    "permalink",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    limit: String(limit),
    access_token: accessToken,
  });

  type MediaResponse = { data?: IgMedia[]; error?: unknown };
  const body = await graphGet<MediaResponse>(
    `${GRAPH}/${igAccountId}/media?${params}`
  );

  return body.data ?? [];
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

/**
 * Fetches lifetime insights for a single media item.
 * Silently returns zero values if the media type doesn't support a metric
 * (e.g., video_views on an IMAGE post).
 */
export async function fetchMediaInsights(
  mediaId: string,
  accessToken: string,
  mediaType: string
): Promise<IgInsights> {
  const isVideo = mediaType === "VIDEO";
  const metrics = isVideo
    ? "impressions,reach,saved,video_views"
    : "impressions,reach,saved";

  const params = new URLSearchParams({
    metric: metrics,
    access_token: accessToken,
  });

  try {
    type InsightMetric = {
      name: string;
      period: string;
      values: Array<{ value: number }>;
    };
    type InsightsResponse = { data?: InsightMetric[]; error?: unknown };

    const body = await graphGet<InsightsResponse>(
      `${GRAPH}/${mediaId}/insights?${params}`
    );

    const get = (name: string) =>
      body.data?.find((m) => m.name === name)?.values[0]?.value ?? 0;

    return {
      impressions: get("impressions"),
      reach: get("reach"),
      saved: get("saved"),
      video_views: get("video_views"),
    };
  } catch {
    // Insights unavailable for this post (e.g., too old, or unsupported type)
    return { impressions: 0, reach: 0, saved: 0, video_views: 0 };
  }
}
