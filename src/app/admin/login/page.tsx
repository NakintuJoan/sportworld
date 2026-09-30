import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, isAdminConfigured, verifySessionToken } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "Sign in to the SportWorld admin area.",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  unconfigured:
    "Admin access is not configured on this server. Set ADMIN_PASSWORD in your environment and restart.",
  expired: "Your session expired. Sign in again.",
  invalid: "Your session was not valid. Sign in again.",
  missing: "Sign in to manage feeds and collection.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const configured = isAdminConfigured();

  // Already signed in? Skip the form.
  const jar = await cookies();
  const existing = verifySessionToken(jar.get(ADMIN_COOKIE.name)?.value);
  if (existing.authenticated) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">Admin sign in</h1>
      <p className="mt-2 text-sm text-slate-400">
        The admin area controls collection runs and the feed list.
      </p>

      <div className="card mt-6 p-6">
        {configured ? (
          <LoginForm message={params.reason ? MESSAGES[params.reason] : undefined} />
        ) : (
          <div className="rounded-lg border border-flame/40 bg-flame/5 p-4">
            <h2 className="font-display text-sm font-black text-flame">Not configured</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{MESSAGES.unconfigured}</p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 text-[11px] text-slate-300">
{"ADMIN_PASSWORD=choose-a-long-password\nSESSION_SECRET=choose-a-long-random-string"}
            </pre>
            <p className="mt-3 text-xs text-slate-400">
              Write them to a <code className="rounded bg-ink-800 px-1.5 py-0.5 text-brand-300">.env</code> file beside{" "}
              <code className="rounded bg-ink-800 px-1.5 py-0.5 text-brand-300">package.json</code>, then restart the
              server.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Everything else on this site is public and needs no account.
      </p>
    </div>
  );
}
