import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeAfterAuthRedirect } from "@/lib/safe-redirect";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env-public";

/**
 * Handles the redirect back from Supabase after email confirmation.
 * Supabase appends ?code=... to the URL; we exchange it for a session.
 */
export async function GET(request: Request) {
  if (!hasPublicSupabaseEnv()) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", request.url)
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeAfterAuthRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Something went wrong — send back to login with an error hint.
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", request.url)
  );
}
