/** Base URL for the Express API. Empty in production unified deploy = same-origin relative paths. */
export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return "";
  return "http://localhost:4000";
}

/** Absolute URL for browser redirects (OAuth, etc.). Uses current origin when API is same-origin. */
export function getBrowserApiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base) return `${base}${p}`;
  if (typeof window !== "undefined") return `${window.location.origin}${p}`;
  return p;
}

const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "Request failed");
  }

  return body as T;
}
