"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth";
import { apiFetch, ApiError } from "@/lib/api";
import type { ContentBrief } from "@growwlytics/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = "why" | "script" | "caption" | "results";

interface ResultsData {
  has_posts_since_plan: boolean;
  plan_created_at: string;
  account_baseline: {
    avg_likes: number;
    avg_comments: number;
    avg_views: number;
    post_count: number;
    period_days: number;
  };
  posts_since_plan: {
    count: number;
    avg_likes: number;
    avg_comments: number;
    avg_views: number;
  };
  change: {
    likes_pct: number | null;
    comments_pct: number | null;
    views_pct: number | null;
  };
}

interface CreditsData {
  data: { available_credits: number };
}

interface PlanData {
  data: { brief: ContentBrief };
}

interface ResultsResponse {
  data: ResultsData;
}

// ---------------------------------------------------------------------------
// Credit packs (mirrored from API config)
// ---------------------------------------------------------------------------
const PACKS = [
  { id: "pack_1", label: "Starter", credits: 1, price: "₹99" },
  { id: "pack_5", label: "Creator", credits: 5, price: "₹399", popular: true },
  { id: "pack_10", label: "Pro", credits: 10, price: "₹699" },
  { id: "pack_20", label: "Agency", credits: 20, price: "₹1199" },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function pctLabel(pct: number | null): string {
  if (pct === null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function pctColor(pct: number | null): string {
  if (pct === null) return "text-brand-muted";
  return pct >= 0 ? "text-emerald-400" : "text-red-400";
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// ---------------------------------------------------------------------------
// Tab: Why This Topic
// ---------------------------------------------------------------------------
function WhyTab({ brief }: { brief: ContentBrief }) {
  const { plan } = brief;
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Why now */}
      <section className="bg-brand-card border border-brand-border rounded-xl p-6">
        <p className="text-xs font-medium tracking-widest uppercase text-brand-purple mb-3">
          Why now
        </p>
        <p className="text-white text-lg leading-relaxed">{plan.why_now}</p>
      </section>

      {/* Trend signals */}
      <section>
        <p className="text-xs font-medium tracking-widest uppercase text-brand-muted mb-3">
          Trend signals
        </p>
        <ul className="space-y-3">
          {plan.trend_signals.map((signal, i) => (
            <li
              key={i}
              className="flex gap-3 bg-brand-card border border-brand-border rounded-xl p-4"
            >
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-brand-purple/20 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
              </span>
              <span className="text-white/90 leading-relaxed">{signal}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Thumbnail tips */}
      <section>
        <p className="text-xs font-medium tracking-widest uppercase text-brand-muted mb-3">
          Thumbnail &amp; cover tips
        </p>
        <ul className="space-y-2">
          {plan.thumbnail_tips.map((tip, i) => (
            <li
              key={i}
              className="flex gap-3 text-white/80 bg-brand-elevated border border-brand-border rounded-lg px-4 py-3 text-sm"
            >
              <span className="text-brand-purple font-mono">{i + 1}.</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Script Guide
// ---------------------------------------------------------------------------
function ScriptTab({ brief }: { brief: ContentBrief }) {
  const { plan } = brief;
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(text: string, key: string) {
    await copyText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Hook */}
      <section>
        <p className="text-xs font-medium tracking-widest uppercase text-brand-muted mb-4">
          Hook options
        </p>
        <div className="space-y-3">
          {/* Primary */}
          <div className="relative bg-brand-card border border-brand-purple/40 rounded-xl p-5 glow-purple">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold tracking-widest uppercase bg-brand-purple text-white px-2 py-0.5 rounded-full">
                Primary
              </span>
            </div>
            <p className="text-white text-base leading-relaxed">
              &ldquo;{plan.hook.primary}&rdquo;
            </p>
            <button
              onClick={() => handleCopy(plan.hook.primary, "hook-primary")}
              className="absolute top-4 right-4 text-brand-muted hover:text-brand-purple transition-colors text-xs"
            >
              {copied === "hook-primary" ? "Copied ✓" : "Copy"}
            </button>
          </div>

          {/* Alternatives */}
          {plan.hook.alternatives.map((alt, i) => (
            <div
              key={i}
              className="relative bg-brand-card border border-brand-border rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-brand-muted bg-brand-elevated px-2 py-0.5 rounded-full">
                  Alt {i + 1}
                </span>
              </div>
              <p className="text-white/80 leading-relaxed">&ldquo;{alt}&rdquo;</p>
              <button
                onClick={() => handleCopy(alt, `hook-alt-${i}`)}
                className="absolute top-4 right-4 text-brand-muted hover:text-brand-purple transition-colors text-xs"
              >
                {copied === `hook-alt-${i}` ? "Copied ✓" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Script outline timeline */}
      <section>
        <p className="text-xs font-medium tracking-widest uppercase text-brand-muted mb-4">
          Script outline
        </p>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-brand-border" />

          <ol className="space-y-4">
            {plan.script_outline.map((segment, i) => (
              <li key={i} className="flex gap-4">
                {/* Dot */}
                <div className="relative flex-shrink-0 w-10 h-10 rounded-full bg-brand-elevated border border-brand-border flex items-center justify-center z-10">
                  <span className="text-brand-purple font-mono text-xs font-bold">
                    {i + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 bg-brand-card border border-brand-border rounded-xl p-4 mb-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-xs font-mono text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded">
                      {segment.timestamp}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {segment.label}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed mb-3">
                    {segment.instruction}
                  </p>
                  <div className="bg-brand-elevated rounded-lg px-3 py-2 border border-brand-border">
                    <p className="text-xs text-brand-muted mb-1">Example</p>
                    <p className="text-white/90 text-sm italic">
                      &ldquo;{segment.example}&rdquo;
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Caption & Hashtags
// ---------------------------------------------------------------------------
function CaptionTab({ brief }: { brief: ContentBrief }) {
  const { plan } = brief;
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(text: string, key: string) {
    await copyText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  const hashtagGroups = [
    { key: "primary", label: "High reach", sublabel: "1M+ posts", tags: plan.hashtags.primary },
    { key: "secondary", label: "Mid range", sublabel: "100K–1M posts", tags: plan.hashtags.secondary },
    { key: "niche", label: "Niche", sublabel: "Under 100K", tags: plan.hashtags.niche },
  ];

  const allHashtags = [
    ...plan.hashtags.primary,
    ...plan.hashtags.secondary,
    ...plan.hashtags.niche,
  ].join(" ");

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Caption */}
      <section className="bg-brand-card border border-brand-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">
            Caption
          </p>
          <button
            onClick={() => handleCopy(plan.caption, "caption")}
            className="text-xs text-brand-purple hover:text-white transition-colors border border-brand-purple/30 hover:border-brand-purple px-3 py-1 rounded-lg"
          >
            {copied === "caption" ? "Copied ✓" : "Copy caption"}
          </button>
        </div>
        <pre className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {plan.caption}
        </pre>
      </section>

      {/* Hashtag groups */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium tracking-widest uppercase text-brand-muted">
            Hashtags
          </p>
          <button
            onClick={() => handleCopy(allHashtags, "all-tags")}
            className="text-xs text-brand-purple hover:text-white transition-colors border border-brand-purple/30 hover:border-brand-purple px-3 py-1 rounded-lg"
          >
            {copied === "all-tags" ? "Copied ✓" : "Copy all (15)"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hashtagGroups.map(({ key, label, sublabel, tags }) => (
            <div
              key={key}
              className="bg-brand-card border border-brand-border rounded-xl p-4"
            >
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-brand-muted">{sublabel}</p>
              </div>
              <ul className="space-y-1.5 mb-4">
                {tags.map((tag, i) => (
                  <li key={i} className="text-brand-purple text-sm font-medium">
                    {tag}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCopy(tags.join(" "), `tags-${key}`)}
                className="w-full text-xs text-center text-brand-muted hover:text-brand-purple transition-colors py-1.5 border border-brand-border hover:border-brand-purple/40 rounded-lg"
              >
                {copied === `tags-${key}` ? "Copied ✓" : "Copy group"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Posting tips */}
      <section className="bg-brand-card border border-brand-border rounded-xl p-5">
        <p className="text-xs font-medium tracking-widest uppercase text-brand-muted mb-4">
          Posting schedule
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-brand-muted mb-1">Best day</p>
            <p className="text-white font-semibold">{plan.posting.best_day}</p>
          </div>
          <div>
            <p className="text-xs text-brand-muted mb-1">Best time</p>
            <p className="text-white font-semibold">{plan.posting.best_time}</p>
          </div>
        </div>
        <p className="text-xs text-brand-muted mb-2">After you post</p>
        <ul className="space-y-2">
          {plan.posting.after_post_tips.map((tip, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-white/80"
            >
              <span className="text-brand-purple mt-0.5">→</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results stat card
// ---------------------------------------------------------------------------
function StatCard({
  icon,
  label,
  recent,
  baseline,
  pct,
}: {
  icon: string;
  label: string;
  recent: number;
  baseline: number;
  pct: number | null;
}) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-5">
      <p className="text-brand-muted text-sm mb-3">
        {icon} {label}
      </p>
      <p className="font-heading text-3xl font-bold text-white mb-1">
        {recent.toLocaleString()}
      </p>
      <p className="text-xs text-brand-muted mb-2">
        avg since plan · baseline {baseline.toLocaleString()}
      </p>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-elevated ${pctColor(pct)}`}
      >
        {pctLabel(pct)} vs baseline
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credit pack upsell
// ---------------------------------------------------------------------------
function CreditUpsell({ token }: { token: string }) {
  const [purchasing, setPurchasing] = useState<string | null>(null);

  async function handleBuy(packId: string) {
    setPurchasing(packId);
    try {
      const res = await apiFetch<{
        data: { order_id: string; amount: number; currency: string; key_id: string };
      }>("/api/credits/purchase", token, {
        method: "POST",
        body: JSON.stringify({ pack_id: packId }),
      });

      // Open Razorpay checkout
      const { order_id, amount, currency, key_id } = res.data;
      const options = {
        key: key_id,
        amount,
        currency,
        order_id,
        name: "Growwlytics",
        description: "Content plan credits",
        theme: { color: "#7c6af7" },
      };
      // @ts-expect-error — Razorpay is loaded via script tag in production
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      // silent — user sees Razorpay error natively
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-brand-border" />
        <p className="text-xs font-medium tracking-widest uppercase text-brand-muted whitespace-nowrap">
          Get more credits
        </p>
        <div className="flex-1 h-px bg-brand-border" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`relative bg-brand-card rounded-xl p-4 flex flex-col gap-3 border transition-colors ${
              pack.popular
                ? "border-brand-purple glow-purple"
                : "border-brand-border hover:border-brand-purple/40"
            }`}
          >
            {pack.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase bg-brand-purple text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Popular
              </span>
            )}
            <div>
              <p className="font-heading text-sm font-bold text-white">
                {pack.label}
              </p>
              <p className="text-2xl font-heading font-bold text-brand-purple mt-1">
                {pack.credits}
                <span className="text-sm font-sans font-normal text-brand-muted ml-1">
                  {pack.credits === 1 ? "credit" : "credits"}
                </span>
              </p>
            </div>
            <div className="mt-auto">
              <p className="text-brand-muted text-xs mb-2">{pack.price}</p>
              <button
                onClick={() => handleBuy(pack.id)}
                disabled={purchasing === pack.id}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                  pack.popular
                    ? "bg-brand-purple hover:bg-[#6b5ae0] text-white"
                    : "bg-brand-elevated hover:bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
                } disabled:opacity-50`}
              >
                {purchasing === pack.id ? "…" : "Buy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tab: Track Results
// ---------------------------------------------------------------------------
function ResultsTab({
  brief,
  token,
}: {
  brief: ContentBrief;
  token: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [results, setResults] = useState<ResultsData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function checkResults() {
    setStatus("loading");
    try {
      const res = await apiFetch<ResultsResponse>(
        `/api/plans/${brief.id}/results`,
        token
      );
      setResults(res.data);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  const planDate = new Date(brief.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="animate-slide-up">
      {status === "idle" && (
        <div className="flex flex-col items-center text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-brand-purple/15 border border-brand-purple/30 flex items-center justify-center mb-5 text-2xl">
            📊
          </div>
          <h3 className="font-heading text-xl font-bold text-white mb-2">
            Check your post performance
          </h3>
          <p className="text-brand-muted text-sm max-w-sm mb-1">
            After posting the content from this plan, come back here to see how
            it performed compared to your baseline.
          </p>
          <p className="text-xs text-brand-muted mb-8">
            Plan created {planDate} · comparing posts synced since then
          </p>
          <button
            onClick={checkResults}
            className="bg-brand-purple hover:bg-[#6b5ae0] text-white font-semibold px-8 py-3 rounded-xl transition-all glow-purple"
          >
            Check my results
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-brand-muted text-sm">Analyzing your performance…</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{errorMsg}</p>
          <button
            onClick={() => setStatus("idle")}
            className="text-brand-purple text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {status === "done" && results && (
        <div className="space-y-6">
          {results.has_posts_since_plan ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-medium">
                  {results.posts_since_plan.count} post
                  {results.posts_since_plan.count !== 1 ? "s" : ""} since this plan
                </span>
                <span className="text-xs text-brand-muted">
                  vs {results.account_baseline.post_count}-post, {results.account_baseline.period_days}-day baseline
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  icon="❤️"
                  label="Likes"
                  recent={results.posts_since_plan.avg_likes}
                  baseline={results.account_baseline.avg_likes}
                  pct={results.change.likes_pct}
                />
                <StatCard
                  icon="💬"
                  label="Comments"
                  recent={results.posts_since_plan.avg_comments}
                  baseline={results.account_baseline.avg_comments}
                  pct={results.change.comments_pct}
                />
                <StatCard
                  icon="👁"
                  label="Views"
                  recent={results.posts_since_plan.avg_views}
                  baseline={results.account_baseline.avg_views}
                  pct={results.change.views_pct}
                />
              </div>

              {results.account_baseline.post_count === 0 && (
                <p className="text-xs text-brand-muted text-center">
                  No baseline posts found in the 30 days before this plan — sync
                  your account for richer comparisons.
                </p>
              )}
            </>
          ) : (
            <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center">
              <p className="text-2xl mb-3">📭</p>
              <p className="text-white font-semibold mb-1">No posts synced yet</p>
              <p className="text-brand-muted text-sm">
                Post your content, then sync your account. Your performance data
                will appear here once posts are synced.
              </p>
            </div>
          )}

          <CreditUpsell token={token} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const TABS: { id: Tab; label: string }[] = [
  { id: "why", label: "Why This Topic" },
  { id: "script", label: "Script Guide" },
  { id: "caption", label: "Caption" },
  { id: "results", label: "Track Results" },
];

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { session, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("why");
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = session?.access_token ?? "";

  const fetchData = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const [planRes, creditsRes] = await Promise.all([
        apiFetch<PlanData>(`/api/plans/${id}`, token),
        apiFetch<CreditsData>("/api/credits", token),
      ]);
      setBrief(planRes.data.brief);
      setCredits(creditsRes.data.available_credits);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  // ---------- loading ----------
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-brand-muted text-sm">Loading plan…</p>
        </div>
      </div>
    );
  }

  // ---------- error ----------
  if (error || !brief) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Plan not found"}</p>
          <Link href="/dashboard" className="text-brand-purple hover:underline text-sm">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { plan } = brief;

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-brand-muted hover:text-white transition-colors text-sm"
          >
            <span>←</span>
            <span className="font-heading font-bold text-brand-purple text-base">
              Growwlytics
            </span>
          </Link>

          {credits !== null && (
            <div className="flex items-center gap-1.5 bg-brand-purple/15 border border-brand-purple/30 text-brand-purple text-xs font-semibold px-3 py-1.5 rounded-full">
              <span>⚡</span>
              <span>
                {credits} {credits === 1 ? "credit" : "credits"}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Plan header ── */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-6">
        <div className="mb-3">
          <span className="text-xs font-medium tracking-widest uppercase bg-brand-purple/15 text-brand-purple border border-brand-purple/25 px-2.5 py-1 rounded-full">
            {plan.format}
          </span>
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-white leading-tight mb-3">
          {plan.topic}
        </h1>
        <p className="text-brand-muted text-sm leading-relaxed max-w-2xl">
          {plan.why_now}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex gap-1 bg-brand-card border border-brand-border rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 whitespace-nowrap text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-brand-purple text-white shadow-sm"
                  : "text-brand-muted hover:text-white hover:bg-brand-elevated"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="pb-16">
          {activeTab === "why" && <WhyTab brief={brief} />}
          {activeTab === "script" && <ScriptTab brief={brief} />}
          {activeTab === "caption" && <CaptionTab brief={brief} />}
          {activeTab === "results" && (
            <ResultsTab brief={brief} token={token} />
          )}
        </div>
      </div>
    </div>
  );
}
