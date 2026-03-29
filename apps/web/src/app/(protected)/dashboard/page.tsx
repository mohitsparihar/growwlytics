import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-brand-bg text-white p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <p className="font-heading text-sm font-semibold text-brand-purple mb-1">
          Growwlytics
        </p>
        <h1 className="font-heading text-3xl font-bold text-white tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Signed in as{" "}
          <span className="text-white">{user?.email ?? "—"}</span>
        </p>

        <section className="mt-10 rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
          <h2 className="font-heading text-lg font-semibold text-white mb-2">
            Get started
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            Connect your Instagram account and generate AI content plans tailored
            to your audience. You can always return here from the onboarding flow.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Onboarding &amp; Instagram
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
