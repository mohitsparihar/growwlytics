/**
 * Normalizes `next` after auth so we only redirect to same-origin app routes.
 * Prevents open redirects and broken URLs like `http://localhost:3000onboarding`.
 */
export function sanitizeAfterAuthRedirect(raw: string | null): string {
  const fallback = "/dashboard";
  if (raw == null || raw === "") return fallback;

  let p = raw.trim();
  try {
    p = decodeURIComponent(p);
  } catch {
    return fallback;
  }

  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  if (p.includes("..") || p.includes("\\")) return fallback;
  if (p.includes("://")) return fallback;

  const pathOnly = p.split("?")[0] ?? "";

  const ok =
    pathOnly === "/login" ||
    pathOnly === "/signup" ||
    pathOnly === "/onboarding" ||
    pathOnly.startsWith("/onboarding/") ||
    pathOnly === "/dashboard" ||
    pathOnly.startsWith("/dashboard/");

  if (!ok) return fallback;
  return p;
}
