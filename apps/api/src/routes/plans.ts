import { Router, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import {
  generateContentPlan,
  InsufficientCreditsError,
} from "../services/plan-generator.service.js";
import type { GeneratePlanRequest } from "@growwlytics/types";

const router = Router();

router.use(requireAuth);

// ---------------------------------------------------------------------------
// POST /api/plans/generate
// ---------------------------------------------------------------------------
router.post(
  "/generate",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthRequest;
    const body = req.body as Partial<GeneratePlanRequest>;

    if (!body.platform || !body.niche) {
      res.status(400).json({ error: "platform and niche are required" });
      return;
    }

    if (body.platform !== "instagram" && body.platform !== "youtube") {
      res
        .status(400)
        .json({ error: "platform must be 'instagram' or 'youtube'" });
      return;
    }

    if (!body.accountData?.username) {
      res.status(400).json({ error: "accountData.username is required" });
      return;
    }

    try {
      const result = await generateContentPlan({
        userId,
        platform: body.platform,
        niche: body.niche,
        goal: body.goal,
        accountData: {
          username: body.accountData.username,
          follower_count: body.accountData.follower_count ?? 0,
        },
        recentPosts: body.recentPosts ?? [],
      });

      res.json({ data: result });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        res.status(402).json({
          error: "Insufficient credits. Purchase more to generate plans.",
        });
        return;
      }

      if (err instanceof Anthropic.RateLimitError) {
        res.status(429).json({
          error: "AI service is busy. Please try again in a moment.",
        });
        return;
      }

      if (err instanceof Anthropic.APIError) {
        console.error("Anthropic API error:", err.status, err.message);
        res.status(502).json({ error: "AI service error. Please try again." });
        return;
      }

      console.error("Plan generation error:", err);
      res.status(500).json({ error: "Failed to generate content plan" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/plans/:id
// Returns the full content brief for a plan owned by the authed user.
// ---------------------------------------------------------------------------
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const { data: brief, error } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !brief) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.json({ data: { brief } });
});

// ---------------------------------------------------------------------------
// GET /api/plans/:id/results
// Compares posts published after this plan was created vs the 30-day baseline.
// ---------------------------------------------------------------------------
router.get(
  "/:id/results",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthRequest;
    const { id } = req.params;

    // Verify plan ownership.
    const { data: brief, error: briefError } = await supabase
      .from("content_briefs")
      .select("id, platform, created_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (briefError || !brief) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const planCreatedAt = brief.created_at as string;
    const baselineStart = new Date(planCreatedAt);
    baselineStart.setDate(baselineStart.getDate() - 30);

    // Fetch baseline posts (30 days before plan).
    const { data: baselinePosts } = await supabase
      .from("posts")
      .select("likes, comments, views")
      .eq("user_id", userId)
      .eq("platform", brief.platform)
      .gte("posted_at", baselineStart.toISOString())
      .lt("posted_at", planCreatedAt);

    // Fetch posts since the plan was created.
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("likes, comments, views, posted_at")
      .eq("user_id", userId)
      .eq("platform", brief.platform)
      .gte("posted_at", planCreatedAt)
      .order("posted_at", { ascending: false });

    const hasPosts = (recentPosts ?? []).length > 0;

    function average(
      rows: Array<{ likes: number; comments: number; views: number }>,
      field: "likes" | "comments" | "views"
    ): number {
      if (!rows.length) return 0;
      return Math.round(rows.reduce((s, r) => s + r[field], 0) / rows.length);
    }

    function pctChange(baseline: number, recent: number): number | null {
      if (baseline === 0) return null; // no baseline to compare against
      return Math.round(((recent - baseline) / baseline) * 100);
    }

    const baseline = baselinePosts ?? [];
    const recent = recentPosts ?? [];

    const baselineAvg = {
      avg_likes: average(baseline, "likes"),
      avg_comments: average(baseline, "comments"),
      avg_views: average(baseline, "views"),
    };

    const recentAvg = {
      count: recent.length,
      avg_likes: average(recent, "likes"),
      avg_comments: average(recent, "comments"),
      avg_views: average(recent, "views"),
    };

    res.json({
      data: {
        has_posts_since_plan: hasPosts,
        plan_created_at: planCreatedAt,
        account_baseline: {
          ...baselineAvg,
          post_count: baseline.length,
          period_days: 30,
        },
        posts_since_plan: recentAvg,
        change: {
          likes_pct: pctChange(baselineAvg.avg_likes, recentAvg.avg_likes),
          comments_pct: pctChange(
            baselineAvg.avg_comments,
            recentAvg.avg_comments
          ),
          views_pct: pctChange(baselineAvg.avg_views, recentAvg.avg_views),
        },
      },
    });
  }
);

export default router;
