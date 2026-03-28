import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server component guard — wrap any layout or page that requires auth.
 * The middleware already handles redirects, but this provides a
 * defense-in-depth check and gives access to the verified user object
 * for downstream server components.
 */
export default async function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
