import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env-public";

export default async function RootPage() {
  if (!hasPublicSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
