import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Growwlytics",
  description:
    "How Growwlytics collects, uses, and protects your information when you use our content planning and Instagram analytics services.",
  openGraph: {
    title: "Privacy Policy | Growwlytics",
    description:
      "Privacy practices for Growwlytics — AI content plans and Instagram insights.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-muted">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <p className="font-heading text-sm font-semibold text-brand-purple">
          Growwlytics
        </p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-brand-muted">
          Last updated:{" "}
          <time dateTime="2026-03-28">28 March 2026</time>
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed">
          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              1. Who we are
            </h2>
            <p className="mt-3">
              Growwlytics (“we”, “us”) provides tools to help creators plan
              content and understand Instagram performance using AI-generated
              briefs and analytics. This policy describes how we handle personal
              information when you use our website and related services.
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              2. Information we collect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-purple">
              <li>
                <span className="text-white">Account data:</span> email address
                and authentication identifiers when you register or sign in
                (processed by our authentication provider).
              </li>
              <li>
                <span className="text-white">Profile data:</span> name or
                display information you choose to provide.
              </li>
              <li>
                <span className="text-white">Instagram / Meta data:</span> if
                you connect Instagram through Facebook Login, we access data
                permitted by the permissions you grant — for example account
                identifiers, follower counts, and content or metrics needed to
                sync posts and surface insights. We only request what the
                service needs to operate.
              </li>
              <li>
                <span className="text-white">Usage &amp; technical data:</span>{" "}
                IP address, browser type, device information, and cookies or
                similar technologies used to keep you signed in and secure our
                services.
              </li>
              <li>
                <span className="text-white">Payment data:</span> if you
                purchase credits, payment processing is handled by our payment
                provider; we do not store full card numbers on our servers.
              </li>
              <li>
                <span className="text-white">AI / content plans:</span> inputs
                you provide (such as niche or goals) and derived plan content
                may be sent to an AI provider to generate suggestions.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              3. How we use information
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-purple">
              <li>To create and manage your account and provide the service.</li>
              <li>
                To connect your Instagram Professional account via Meta’s
                platforms and sync permitted content and metrics.
              </li>
              <li>
                To generate personalised content plans and show performance
                summaries in the product.
              </li>
              <li>To process payments and fulfil credit purchases.</li>
              <li>
                To protect security, prevent abuse, and comply with legal
                obligations.
              </li>
              <li>
                To improve reliability and fix issues (including aggregated or
                de-identified analytics where appropriate).
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              4. Legal bases (EEA / UK users)
            </h2>
            <p className="mt-3">
              Where applicable, we rely on: performance of a contract (providing
              the service you request); legitimate interests (security,
              product improvement balanced against your rights); consent where
              required (for example certain cookies or marketing, if offered);
              and legal obligation where the law requires us to process data.
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              5. Sharing and subprocessors
            </h2>
            <p className="mt-3">
              We use trusted service providers who process data on our
              instructions. Categories include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-purple">
              <li>
                <span className="text-white">Supabase</span> — authentication
                and database hosting.
              </li>
              <li>
                <span className="text-white">Meta / Facebook</span> — when you
                use Instagram connection and related APIs, Meta’s terms and
                policies also apply to that data.
              </li>
              <li>
                <span className="text-white">Payment providers</span> — for
                secure payment processing.
              </li>
              <li>
                <span className="text-white">AI providers</span> — to generate
                content plans from inputs you provide.
              </li>
              <li>
                <span className="text-white">Hosting &amp; infrastructure</span>{" "}
                — to run our application and APIs.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information. We may disclose
              information if required by law or to protect rights and safety.
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              6. Retention
            </h2>
            <p className="mt-3">
              We keep information only as long as needed for the purposes above,
              unless a longer period is required by law. You may delete your
              account or request deletion where applicable; some records may be
              retained in anonymised form or as required for legal compliance.
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              7. Your choices and rights
            </h2>
            <p className="mt-3">
              Depending on where you live, you may have rights to access,
              correct, delete, or export your personal data, and to object to
              or restrict certain processing. You can disconnect Instagram in
              the product where supported, or contact us to exercise rights. You
              may also lodge a complaint with a supervisory authority.
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              8. International transfers
            </h2>
            <p className="mt-3">
              Our providers may process data in countries other than your own. We
              use appropriate safeguards where required (such as standard
              contractual clauses).
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              9. Children
            </h2>
            <p className="mt-3">
              The service is not directed at children under 13 (or the minimum
              age in your jurisdiction). We do not knowingly collect personal
              information from children.
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              10. Changes
            </h2>
            <p className="mt-3">
              We may update this policy from time to time. We will post the
              revised version on this page and update the “Last updated” date.
              Continued use after changes means you accept the updated policy,
              where permitted by law.
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-brand-card p-6 md:p-8">
            <h2 className="font-heading text-lg font-semibold text-white">
              11. Contact
            </h2>
            <p className="mt-3">
              For privacy questions or requests, contact us at:
            </p>
            <p className="mt-3">
              <a
                href="mailto:mohtpariharmech@gmail.com"
                className="font-medium text-brand-purple hover:underline"
              >
                mohtpariharmech@gmail.com
              </a>
            </p>
            <p className="mt-4 rounded-lg border border-brand-border bg-brand-elevated p-4 text-xs text-brand-muted">
              This policy is provided for transparency and app store /
              platform review. It is not legal advice. Have it reviewed by
              qualified counsel for your entity, regions, and data practices
              before relying on it in production.
            </p>
          </section>
        </div>

        <p className="mt-12 text-center text-sm text-brand-muted">
          <Link
            href="/login"
            className="font-medium text-brand-purple hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
