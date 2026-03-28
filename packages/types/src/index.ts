// =============================================================================
// Growwlytics — Shared Types
// Keep in sync with supabase/migrations/
// =============================================================================

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
export type Platform = "instagram" | "youtube";
export type CreditTransactionType = "purchase" | "use" | "free";
export type SyncStatus = "pending" | "success" | "failed";
export type SyncType = "posts" | "competitor_posts";

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: Platform;
  external_id: string;
  username: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  follower_count: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  connected_account_id: string;
  platform: Platform;
  external_post_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  posted_at: string | null;
  synced_at: string;
  created_at: string;
}

export interface Competitor {
  id: string;
  user_id: string;
  platform: Platform;
  external_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompetitorPost {
  id: string;
  user_id: string;
  competitor_id: string;
  platform: Platform;
  external_post_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  posted_at: string | null;
  synced_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// ContentPlan — the JSONB blob stored in content_briefs.plan
// ---------------------------------------------------------------------------
export interface ScriptSegment {
  timestamp: string;   // e.g. "0:00–0:15"
  label: string;       // e.g. "Hook"
  instruction: string; // what to do in this segment
  example: string;     // a concrete line or action to use
}

export interface ContentPlan {
  topic: string;
  why_now: string;           // why this topic is timely right now
  trend_signals: string[];   // 2–3 signals supporting the timing
  format: string;            // e.g. "60-second Reel", "YouTube Short", "Carousel"
  hook: {
    primary: string;
    alternatives: [string, string];
  };
  script_outline: ScriptSegment[];
  caption: string;
  hashtags: {
    primary: string[];    // 5 high-reach tags
    secondary: string[];  // 5 mid-range tags
    niche: string[];      // 5 community-specific tags
  };
  posting: {
    best_day: string;
    best_time: string;
    after_post_tips: string[];
  };
  thumbnail_tips: string[];
}

export interface ContentBrief {
  id: string;
  user_id: string;
  platform: Platform;
  niche: string;
  goal: string | null;
  plan: ContentPlan;
  created_at: string;
}

export interface Credits {
  id: string;
  user_id: string;
  total_credits: number;
  used_credits: number;
  /** Derived: total_credits - used_credits */
  available_credits?: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number; // positive = earned, negative = spent
  type: CreditTransactionType;
  plan_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  description: string | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  user_id: string;
  connected_account_id: string | null;
  type: SyncType;
  status: SyncStatus;
  records_synced: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------
export interface RecentPostSummary {
  caption: string | null;
  likes: number;
  comments: number;
  views: number;
  media_type: string | null;
  posted_at: string | null;
}

export interface AccountData {
  username: string;
  follower_count: number;
}

export interface GeneratePlanRequest {
  platform: Platform;
  niche: string;
  goal?: string;
  accountData: AccountData;
  recentPosts: RecentPostSummary[];
}

export interface GeneratePlanResponse {
  brief: ContentBrief;
  credits_remaining: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
}
