/**
 * Instagram account routes.
 *
 * GET  /api/instagram/status  — returns whether an Instagram account is connected
 * POST /api/instagram/sync    — fetches last 50 posts + insights, upserts to DB
 */

import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { decrypt } from "../lib/encryption.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { fetchMedia, fetchMediaInsights } from "../lib/instagram.js";

const router = Router();

router.use(requireAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run an array of async tasks in parallel batches of `size`. */
async function inBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn));
    results.push(...batch);
  }
  return results;
}

// ---------------------------------------------------------------------------
// GET /api/instagram/status
// Returns whether the user has a connected Instagram account.
// ---------------------------------------------------------------------------
router.get(
  "/status",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthRequest;

    const { data: account } = await supabase
      .from("connected_accounts")
      .select("id, username, follower_count, token_expires_at, updated_at")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .maybeSingle();

    if (!account) {
      res.json({ data: { connected: false } });
      return;
    }

    res.json({
      data: {
        connected: true,
        account: {
          username: account.username,
          follower_count: account.follower_count,
          token_expires_at: account.token_expires_at,
          last_synced_at: account.updated_at,
        },
      },
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/instagram/sync
// Fetches the last 50 posts + per-post insights and upserts them.
// Also writes a sync_log entry.
// ---------------------------------------------------------------------------
router.post(
  "/sync",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthRequest;

    // 1. Load the connected account
    const { data: account, error: accountError } = await supabase
      .from("connected_accounts")
      .select("id, external_id, access_token, username, follower_count")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .maybeSingle();

    if (accountError || !account) {
      res.status(404).json({ error: "No Instagram account connected" });
      return;
    }

    if (!account.access_token) {
      res.status(400).json({ error: "No access token stored for this account" });
      return;
    }

    // 2. Create a sync_log entry (status: pending)
    const { data: syncLog } = await supabase
      .from("sync_logs")
      .insert({
        user_id: userId,
        connected_account_id: account.id,
        type: "posts",
        status: "pending",
      })
      .select("id")
      .single();

    const syncLogId = syncLog?.id;

    try {
      // 3. Decrypt the stored access token
      const accessToken = decrypt(account.access_token as string);

      // 4. Fetch latest 50 media items
      const media = await fetchMedia(account.external_id as string, accessToken, 50);

      if (media.length === 0) {
        await supabase
          .from("sync_logs")
          .update({ status: "success", records_synced: 0, completed_at: new Date().toISOString() })
          .eq("id", syncLogId);

        res.json({ data: { synced: 0, message: "No posts found on this account" } });
        return;
      }

      // 5. Fetch insights for each post (5 at a time to respect rate limits)
      type PostRow = {
        user_id: string;
        connected_account_id: string;
        platform: "instagram";
        external_post_id: string;
        caption: string | null;
        media_url: string | null;
        media_type: string;
        likes: number;
        comments: number;
        views: number;
        impressions: number;
        reach: number;
        saved: number;
        permalink: string | null;
        posted_at: string;
        synced_at: string;
      };

      const posts = await inBatches(media, 5, async (item) => {
        const insights = await fetchMediaInsights(
          item.id,
          accessToken,
          item.media_type
        );

        const row: PostRow = {
          user_id: userId,
          connected_account_id: account.id as string,
          platform: "instagram",
          external_post_id: item.id,
          caption: item.caption ?? null,
          // Videos use thumbnail_url; images use media_url
          media_url:
            item.media_type === "VIDEO"
              ? (item.thumbnail_url ?? item.media_url ?? null)
              : (item.media_url ?? null),
          media_type: item.media_type,
          likes: item.like_count ?? 0,
          comments: item.comments_count ?? 0,
          views: insights.video_views,
          impressions: insights.impressions,
          reach: insights.reach,
          saved: insights.saved,
          permalink: item.permalink ?? null,
          posted_at: item.timestamp,
          synced_at: new Date().toISOString(),
        };

        return row;
      });

      // 6. Upsert posts (update engagement fields on re-sync)
      const { error: upsertError } = await supabase
        .from("posts")
        .upsert(posts, {
          onConflict: "connected_account_id,external_post_id",
          ignoreDuplicates: false, // always update engagement counts
        });

      if (upsertError) throw upsertError;

      // 7. Update follower count on the connected account
      await supabase
        .from("connected_accounts")
        .update({ follower_count: account.follower_count })
        .eq("id", account.id);

      // 8. Mark sync complete
      await supabase
        .from("sync_logs")
        .update({
          status: "success",
          records_synced: posts.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);

      res.json({
        data: {
          synced: posts.length,
          account: {
            username: account.username,
            follower_count: account.follower_count,
          },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      console.error("Instagram sync error:", msg);

      await supabase
        .from("sync_logs")
        .update({
          status: "failed",
          error: msg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);

      res.status(500).json({ error: msg });
    }
  }
);

export default router;
