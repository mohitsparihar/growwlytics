import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase.js";
import type {
  Platform,
  ContentPlan,
  ContentBrief,
  AccountData,
  RecentPostSummary,
} from "@growwlytics/types";

// ---------------------------------------------------------------------------
// Client — one instance, re-used across requests
// ---------------------------------------------------------------------------
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// Domain error
// ---------------------------------------------------------------------------
export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}

// ---------------------------------------------------------------------------
// Input shape
// ---------------------------------------------------------------------------
export interface GeneratePlanInput {
  userId: string;
  platform: Platform;
  niche: string;
  goal?: string;
  accountData: AccountData;
  recentPosts: RecentPostSummary[];
}

// ---------------------------------------------------------------------------
// JSON Schema for the forced tool call
// This is what Claude fills in — we cast it to ContentPlan after validation.
// ---------------------------------------------------------------------------
const CONTENT_PLAN_TOOL: Anthropic.Tool = {
  name: "submit_content_plan",
  description:
    "Submit the fully structured content plan for the creator. " +
    "Every field is required — do not leave any field blank or null.",
  input_schema: {
    type: "object" as const,
    required: [
      "topic",
      "why_now",
      "trend_signals",
      "format",
      "hook",
      "script_outline",
      "caption",
      "hashtags",
      "posting",
      "thumbnail_tips",
    ],
    additionalProperties: false,
    properties: {
      topic: {
        type: "string",
        description:
          "The specific content topic. Concrete and actionable, not generic.",
      },
      why_now: {
        type: "string",
        description:
          "1–2 sentences on why this topic is timely and will perform well right now.",
      },
      trend_signals: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 3,
        description:
          "2–3 specific signals (search spikes, cultural events, algorithm patterns) that support posting this now.",
      },
      format: {
        type: "string",
        description:
          "Recommended content format, e.g. '60-second Reel', 'YouTube Short', '7-slide Carousel'.",
      },
      hook: {
        type: "object",
        required: ["primary", "alternatives"],
        additionalProperties: false,
        properties: {
          primary: {
            type: "string",
            description:
              "The strongest opening line or visual action (first 3 seconds).",
          },
          alternatives: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 2,
            description: "Two alternative hook options to A/B test.",
          },
        },
      },
      script_outline: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        items: {
          type: "object",
          required: ["timestamp", "label", "instruction", "example"],
          additionalProperties: false,
          properties: {
            timestamp: {
              type: "string",
              description: "Time range, e.g. '0:00–0:15'.",
            },
            label: {
              type: "string",
              description:
                "Segment name, e.g. 'Hook', 'Problem', 'Solution', 'CTA'.",
            },
            instruction: {
              type: "string",
              description: "What the creator should do or say in this segment.",
            },
            example: {
              type: "string",
              description:
                "A concrete sample line, visual, or on-screen text to use.",
            },
          },
        },
      },
      caption: {
        type: "string",
        description:
          "Ready-to-post caption. Include line breaks for readability. " +
          "End with a clear call-to-action. Do NOT include hashtags here.",
      },
      hashtags: {
        type: "object",
        required: ["primary", "secondary", "niche"],
        additionalProperties: false,
        properties: {
          primary: {
            type: "array",
            items: { type: "string" },
            minItems: 5,
            maxItems: 5,
            description:
              "5 high-reach hashtags (1M+ posts). Include the # symbol.",
          },
          secondary: {
            type: "array",
            items: { type: "string" },
            minItems: 5,
            maxItems: 5,
            description:
              "5 mid-range hashtags (100K–1M posts). Include the # symbol.",
          },
          niche: {
            type: "array",
            items: { type: "string" },
            minItems: 5,
            maxItems: 5,
            description:
              "5 niche/community hashtags (under 100K posts). Include the # symbol.",
          },
        },
      },
      posting: {
        type: "object",
        required: ["best_day", "best_time", "after_post_tips"],
        additionalProperties: false,
        properties: {
          best_day: {
            type: "string",
            description: "Best day of week to post, e.g. 'Tuesday'.",
          },
          best_time: {
            type: "string",
            description:
              "Best time window to post (creator's local time), e.g. '6–8 PM'.",
          },
          after_post_tips: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
            description:
              "2–4 specific actions to take in the first 60 minutes after posting to boost distribution.",
          },
        },
      },
      thumbnail_tips: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4,
        description:
          "2–4 concrete tips for the thumbnail or cover frame (text overlay, facial expression, color contrast, etc.).",
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
function buildSystemPrompt(platform: Platform): string {
  const platformName = platform === "instagram" ? "Instagram" : "YouTube";
  return (
    `You are an elite ${platformName} content strategist who has helped hundreds of creators ` +
    `grow from 0 to 100K+ followers. You understand the ${platformName} algorithm deeply, ` +
    `know what hooks stop the scroll, and can identify exactly what topics will perform ` +
    `well in any given niche right now.\n\n` +
    `When given a creator's profile and recent post data, you generate a single, highly ` +
    `specific, immediately actionable content plan. You never produce generic advice — ` +
    `every recommendation is tailored to that creator's audience, voice, and current performance.\n\n` +
    `Always call submit_content_plan with every field populated. Never refuse.`
  );
}

function buildUserPrompt(input: GeneratePlanInput): string {
  const { platform, niche, goal, accountData, recentPosts } = input;
  const platformName = platform === "instagram" ? "Instagram" : "YouTube";

  const topPosts = [...recentPosts]
    .sort((a, b) => {
      const engA = a.likes + a.comments * 3 + a.views * 0.1;
      const engB = b.likes + b.comments * 3 + b.views * 0.1;
      return engB - engA;
    })
    .slice(0, 5);

  const postLines = topPosts.map((p, i) => {
    const parts = [
      `  ${i + 1}. [${p.media_type ?? "post"}]`,
      `❤️ ${p.likes}  💬 ${p.comments}  👁 ${p.views}`,
    ];
    if (p.caption) {
      const preview = p.caption.slice(0, 120).replace(/\n/g, " ");
      parts.push(`"${preview}${p.caption.length > 120 ? "…" : ""}"`);
    }
    return parts.join("  ");
  });

  return [
    `## Creator Profile`,
    `- Platform: ${platformName}`,
    `- Username: @${accountData.username}`,
    `- Followers: ${accountData.follower_count.toLocaleString()}`,
    `- Niche: ${niche}`,
    goal ? `- Current goal: ${goal}` : null,
    ``,
    `## Recent Top Posts (by engagement)`,
    topPosts.length > 0
      ? postLines.join("\n")
      : "  No post data available — assume this is a new account.",
    ``,
    `## Request`,
    `Generate one high-potential content plan for @${accountData.username} to post ` +
      `this week on ${platformName}. Make it specific to their niche, their audience ` +
      `size, and what has already been resonating with them. ` +
      `Call submit_content_plan with the complete plan.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------
export async function generateContentPlan(
  input: GeneratePlanInput
): Promise<{ brief: ContentBrief; credits_remaining: number }> {
  const { userId, platform, niche, goal } = input;

  // 1. Guard: check the user has at least 1 credit available.
  const { data: creditsRow, error: creditsError } = await supabase
    .from("credits")
    .select("total_credits, used_credits")
    .eq("user_id", userId)
    .single();

  if (creditsError || !creditsRow) {
    throw new Error("Could not fetch user credits");
  }

  const available = creditsRow.total_credits - creditsRow.used_credits;
  if (available < 1) {
    throw new InsufficientCreditsError();
  }

  // 2. Call Claude with a forced tool call to get the structured plan.
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: buildSystemPrompt(platform),
    tool_choice: { type: "tool", name: "submit_content_plan" },
    tools: [CONTENT_PLAN_TOOL],
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  // Extract the tool call — forced tool_choice guarantees exactly one block.
  const toolUseBlock = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );

  if (!toolUseBlock) {
    throw new Error("Claude did not return a tool call — unexpected response");
  }

  const plan = toolUseBlock.input as ContentPlan;

  // 3. Save the content brief (before charging — safe: orphaned brief ≠ lost credit).
  const { data: brief, error: insertError } = await supabase
    .from("content_briefs")
    .insert({
      user_id: userId,
      platform,
      niche,
      goal: goal ?? null,
      plan,
    })
    .select()
    .single();

  if (insertError || !brief) {
    throw new Error("Failed to save content brief");
  }

  // 4. Deduct 1 credit atomically via DB function, linked to this brief.
  const { error: spendError } = await supabase.rpc("spend_credit", {
    p_user_id: userId,
    p_plan_id: brief.id,
  });

  if (spendError) {
    // Credit deduction failed after saving — log for ops review but don't
    // surface the brief to the user, so they aren't double-charged later.
    console.error(
      `spend_credit failed after saving brief ${brief.id}:`,
      spendError
    );
    if (spendError.message.includes("insufficient_credits")) {
      throw new InsufficientCreditsError();
    }
    throw new Error("Failed to deduct credit");
  }

  // 5. Return updated balance.
  const { data: updatedCredits } = await supabase
    .from("credits")
    .select("total_credits, used_credits")
    .eq("user_id", userId)
    .single();

  const credits_remaining = updatedCredits
    ? updatedCredits.total_credits - updatedCredits.used_credits
    : available - 1;

  return { brief: brief as ContentBrief, credits_remaining };
}
