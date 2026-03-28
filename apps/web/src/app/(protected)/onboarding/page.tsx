"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { apiFetch, ApiError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface IgStatus {
  connected: boolean;
  account?: {
    username: string;
    follower_count: number;
    last_synced_at: string | null;
  };
}

type SyncState = "idle" | "syncing" | "done" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ERROR_MESSAGES: Record<string, string> = {
  instagram_denied: "You cancelled the Instagram connection. Try again when you're ready.",
  instagram_state_mismatch: "The connection attempt expired or was tampered with. Please try again.",
  instagram_invalid_callback: "Instagram returned an invalid response. Please try again.",
  instagram_save_failed: "We connected to Instagram but couldn't save the account. Please try again.",
  instagram_failed: "Something went wrong connecting to Instagram.",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({
  step,
  label,
  state,
}: {
  step: number;
  label: string;
  state: "pending" | "active" | "done";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
          state === "done"
            ? "bg-emerald-500 text-white"
            : state === "active"
              ? "bg-brand-purple text-white"
              : "bg-brand-elevated border border-brand-border text-brand-muted"
        }`}
      >
        {state === "done" ? "✓" : step}
      </div>
      <span
        className={`text-sm font-medium ${
          state === "active"
            ? "text-white"
            : state === "done"
              ? "text-emerald-400"
              : "text-brand-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ConnectButton({
  token,
  onError,
}: {
  token: string;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      // Redirect the browser to the API OAuth endpoint.
      // The token is passed as a query param because browser redirects
      // can't carry custom headers.
      window.location.href = `${API_URL}/api/auth/instagram?token=${encodeURIComponent(token)}`;
    } catch (err) {
      setLoading(false);
      onError(err instanceof Error ? err.message : "Failed to start connection");
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="group relative flex items-center justify-center gap-3 w-full rounded-xl px-6 py-4 font-semibold text-white bg-gradient-to-r from-[#f9435a] via-[#e23a8e] to-[#833ab4] hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#833ab4]/20"
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Connecting…
        </>
      ) : (
        <>
          {/* Instagram icon */}
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          Connect Instagram
        </>
      )}
    </button>
  );
}

function ConnectedCard({
  account,
  syncState,
  onSync,
  onContinue,
}: {
  account: IgStatus["account"] & object;
  syncState: SyncState;
  onSync: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="bg-brand-card border border-emerald-500/30 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f9435a] to-[#833ab4] flex items-center justify-center">
          <span className="text-white text-base font-bold">
            {account.username[0]?.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-white font-semibold">@{account.username}</p>
          <p className="text-xs text-brand-muted">
            {account.follower_count.toLocaleString()} followers
          </p>
        </div>
        <span className="ml-auto text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
          Connected ✓
        </span>
      </div>

      {syncState === "idle" && (
        <button
          onClick={onSync}
          className="w-full py-2.5 rounded-lg bg-brand-elevated border border-brand-border text-white text-sm font-medium hover:border-brand-purple/50 transition-colors"
        >
          Sync my posts (optional)
        </button>
      )}

      {syncState === "syncing" && (
        <div className="flex items-center justify-center gap-2 py-2.5 text-brand-muted text-sm">
          <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          Syncing your posts…
        </div>
      )}

      {syncState === "done" && (
        <p className="text-center text-sm text-emerald-400 py-2">
          ✓ Posts synced successfully
        </p>
      )}

      {syncState === "error" && (
        <p className="text-center text-sm text-red-400 py-2">
          Sync failed — you can retry from the dashboard
        </p>
      )}

      <button
        onClick={onContinue}
        className="mt-3 w-full py-2.5 rounded-lg bg-brand-purple hover:bg-[#6b5ae0] text-white font-semibold text-sm transition-colors"
      >
        Continue to dashboard →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function OnboardingPage() {
  const { session, loading: authLoading, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<IgStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const token = session?.access_token ?? "";

  // Map URL ?error= param to a human-readable message
  const urlError = searchParams.get("error");
  const urlConnected = searchParams.get("instagram") === "connected";

  // Fetch connection status from API
  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setStatusLoading(true);
    try {
      const res = await apiFetch<{ data: IgStatus }>(
        "/api/instagram/status",
        token
      );
      setStatus(res.data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setStatusLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading) fetchStatus();
  }, [authLoading, fetchStatus]);

  // If Instagram just connected (callback redirect), re-fetch status
  useEffect(() => {
    if (urlConnected && token) fetchStatus();
  }, [urlConnected, token, fetchStatus]);

  // Resolve error message
  const displayError =
    errorMsg ??
    (urlError ? (ERROR_MESSAGES[urlError] ?? "Something went wrong.") : null);

  async function handleSync() {
    setSyncState("syncing");
    try {
      await apiFetch("/api/instagram/sync", token, { method: "POST" });
      setSyncState("done");
    } catch (err) {
      console.error("Sync error:", err instanceof ApiError ? err.message : err);
      setSyncState("error");
    }
  }

  function handleContinue() {
    router.push("/dashboard");
  }

  // Determine which step we're on
  const isConnected = status?.connected ?? urlConnected;
  const step1State = isConnected ? "done" : "active";
  const step2State = isConnected
    ? syncState === "done"
      ? "done"
      : "active"
    : "pending";

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-heading text-2xl font-bold text-brand-purple mb-2">
            Growwlytics
          </p>
          <h1 className="font-heading text-3xl font-bold text-white mb-2">
            Set up your account
          </h1>
          <p className="text-brand-muted text-sm">
            Connect Instagram to unlock AI-powered content plans tailored to
            your audience.
          </p>
          {user?.email && (
            <p className="mt-2 text-xs text-brand-muted">
              Signed in as <span className="text-white">{user.email}</span>
            </p>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex flex-col gap-3 mb-8">
          <StepIndicator step={1} label="Connect Instagram" state={step1State} />
          <div className="ml-4 w-px h-4 bg-brand-border" />
          <StepIndicator step={2} label="Sync your posts" state={step2State} />
          <div className="ml-4 w-px h-4 bg-brand-border" />
          <StepIndicator
            step={3}
            label="Generate your first plan"
            state={isConnected && syncState === "done" ? "active" : "pending"}
          />
        </div>

        {/* Error banner */}
        {displayError && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            {displayError}
          </div>
        )}

        {/* Main card */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
          {!isConnected ? (
            <>
              <h2 className="font-heading text-lg font-bold text-white mb-1">
                Connect your Instagram
              </h2>
              <p className="text-brand-muted text-sm mb-6 leading-relaxed">
                We need access to your Instagram Business or Creator account
                to analyse your content and generate personalised plans.
              </p>

              <ConnectButton
                token={token}
                onError={(msg) => setErrorMsg(msg)}
              />

              <p className="mt-4 text-xs text-brand-muted text-center leading-relaxed">
                Requires an{" "}
                <span className="text-white">Instagram Business or Creator</span>{" "}
                account linked to a Facebook Page. We never post on your behalf.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-heading text-lg font-bold text-white mb-1">
                Instagram connected 🎉
              </h2>
              <p className="text-brand-muted text-sm mb-5">
                Sync your recent posts now so we can personalise your first
                content plan — or skip and do it later.
              </p>

              {status?.account && (
                <ConnectedCard
                  account={status.account}
                  syncState={syncState}
                  onSync={handleSync}
                  onContinue={handleContinue}
                />
              )}

              {/* Fallback if status wasn't refetched yet */}
              {!status?.account && (
                <div className="space-y-3">
                  <button
                    onClick={handleSync}
                    disabled={syncState === "syncing" || syncState === "done"}
                    className="w-full py-2.5 rounded-lg bg-brand-elevated border border-brand-border text-white text-sm font-medium hover:border-brand-purple/50 transition-colors disabled:opacity-50"
                  >
                    {syncState === "syncing"
                      ? "Syncing…"
                      : syncState === "done"
                        ? "✓ Synced"
                        : "Sync my posts"}
                  </button>
                  <button
                    onClick={handleContinue}
                    className="w-full py-2.5 rounded-lg bg-brand-purple text-white font-semibold text-sm hover:bg-[#6b5ae0] transition-colors"
                  >
                    Continue to dashboard →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Skip link for already-connected users */}
        {isConnected && (
          <p className="mt-4 text-center text-xs text-brand-muted">
            Already set up?{" "}
            <button
              onClick={handleContinue}
              className="text-brand-purple hover:underline"
            >
              Go to dashboard
            </button>
          </p>
        )}
      </div>
    </main>
  );
}
