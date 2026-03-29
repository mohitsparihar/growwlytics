import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import dotenv from "dotenv";
import type { NextConfig } from "next";

/** Walk up from `start` until a directory contains `.env`. */
function findEnvDir(start: string): string | null {
  let dir = path.resolve(start);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, ".env"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function pick(primary: string | undefined, fallback: string | undefined): string {
  const p = primary?.trim();
  if (p) return p;
  const f = fallback?.trim();
  return f ?? "";
}

// `apps/web` — prefer cwd when it is this app (npm workspace), else config file dir.
const configFileDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot =
  ["next.config.ts", "next.config.mjs", "next.config.js"].some((name) =>
    fs.existsSync(path.join(process.cwd(), name))
  )
    ? process.cwd()
    : configFileDir;

const repoEnvDir = findEnvDir(webRoot) ?? findEnvDir(process.cwd());
const isDev = process.env.NODE_ENV !== "production";

loadEnvConfig(webRoot, isDev, undefined, true);

// Next pre-seeds empty NEXT_PUBLIC_*; @next/env will not override existing keys.
// Load monorepo root `.env` with override so real values win.
if (repoEnvDir) {
  dotenv.config({ path: path.join(repoEnvDir, ".env"), override: true });
}

const NEXT_PUBLIC_SUPABASE_URL = pick(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL
);
const NEXT_PUBLIC_SUPABASE_ANON_KEY = pick(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY
);

process.env.NEXT_PUBLIC_SUPABASE_URL = NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Edge Middleware inlines `env` here — it cannot read `.env` at runtime.
const nextConfig: NextConfig = {
  transpilePackages: ["@growwlytics/types"],
  env: {
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
