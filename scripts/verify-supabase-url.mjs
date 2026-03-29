#!/usr/bin/env node
/**
 * Verifies the Supabase URL in repo-root .env resolves in DNS and responds over HTTPS.
 * Run: node scripts/verify-supabase-url.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:dns/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function parseEnvFile(file) {
  const out = {};
  if (!existsSync(file)) {
    console.error("Missing .env at", file);
    process.exit(1);
  }
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = parseEnvFile(envPath);
const raw =
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  "";
let hostname = "";
try {
  hostname = new URL(raw).hostname;
} catch {
  console.error("Invalid SUPABASE / NEXT_PUBLIC_SUPABASE_URL in .env:", raw.slice(0, 80));
  process.exit(1);
}

console.log("Checking hostname:", hostname);

try {
  const v4 = await resolve(hostname, "A");
  console.log("DNS A OK:", v4.join(", "));
} catch (e) {
  console.error("DNS lookup FAILED (browser will show Failed to fetch / ERR_NAME_NOT_RESOLVED):");
  console.error(" ", e.message);
  console.error("\nThis hostname is not on the public internet. Fix:");
  console.error("  1. Supabase Dashboard → your project → Settings → API");
  console.error("  2. Copy Project URL exactly (https://xxxx.supabase.co)");
  console.error("  3. Paste into .env for SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL");
  console.error("  4. Restart npm run dev\n");
  process.exit(1);
}

try {
  const res = await fetch(`${raw.replace(/\/$/, "")}/auth/v1/health`, {
    signal: AbortSignal.timeout(10000),
  });
  console.log("HTTPS /auth/v1/health:", res.status, res.ok ? "OK" : "(non-200 is still reachable)");
} catch (e) {
  console.error("HTTPS request failed:", e.message);
  process.exit(1);
}

console.log("\nSupabase URL looks reachable from this machine.");
