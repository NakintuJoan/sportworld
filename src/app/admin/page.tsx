import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { IngestButton, SourceManager } from "@/components/AdminPanels";
import LogoutButton from "@/components/LogoutButton";
import RefreshButton from "@/components/RefreshButton";
import { ADMIN_COOKIE, isAdminConfigured, verifySessionToken } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import { getRecentRuns, getStats, getSources } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Collection controls, feed health and database statistics for SportWorld.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Guard the page itself, not just the API routes it calls. Without this the
  // statistics below are readable by anyone who guesses the URL, and the page
  // would render controls that then fail with a 401.
  const jar = await cookies();
  const session = verifySessionToken(jar.get(ADMIN_COOKIE.name)?.value);
  if (!session.authenticated) {
    redirect(`/admin/login?reason=${isAdminConfigured() ? (session.reason ?? "missing") : "unconfigured"}`);
  }

  const stats = getStats();
  const sources = getSources(true);
  const runs = getRecentRuns(6);
  const failing = sources.filter((s) => s.consecutive_failures > 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            <span aria-hidden>⚙️</span> Admin
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Collection controls, feed health and database statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LogoutButton />
          <RefreshButton />
        </div>
      </header>

      <section aria-label="Database statistics" className="mb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Stories stored", value: stats.total.toLocaleString() },
            { label: "Last hour", value: stats.last1h.toLocaleString() },
            { label: "Last 24 hours", value: stats.last24h.toLocaleString() },
            { label: "Transfer stories", value: stats.transfers.toLocaleString() },
            { label: "Feeds enabled", value: `${stats.sourcesEnabled}/${stats.sourcesTotal}` },
            { label: "Feeds failing", value: stats.sourcesFailing.toLocaleString(), alert: stats.sourcesFailing > 0 },
          ].map((item) => (
            <div key={item.label} className="card px-4 py-3">
              <p className={`font-display text-2xl font-black ${item.alert ? "text-flame" : "text-white"}`}>{item.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6">
        <IngestButton />

        <SourceManager />

        {failing.length > 0 && (
          <section className="card p-5">
            <h2 className="font-display text-lg font-black text-white">Feed warnings</h2>
            <p className="mt-1 text-xs text-slate-400">
              These feeds failed their most recent run. Publishers sometimes change feed URLs or block unknown user
              agents, so check the URL still returns XML.
            </p>
            <ul className="mt-3 space-y-2 text-xs">
              {failing.map((source) => (
                <li key={source.id} className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2">
                  <span className="font-semibold text-slate-200">{source.name}</span>
                  <span className="block break-all text-slate-500">{source.url}</span>
                  <span className="block text-flame">{source.last_error}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-black text-white">Articles by sport</h2>
            {stats.byCategory.length === 0 ? (
              <p className="text-xs text-slate-500">No data yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {stats.byCategory.map((row) => {
                  const max = stats.byCategory[0].count || 1;
                  const category = getCategory(row.category);
                  const percent = Math.round((row.count / max) * 100);
                  return (
                    <li key={row.category}>
                      <Link href={`/category/${row.category}`} className="group flex items-center gap-3 text-xs">
                        <span className="w-28 shrink-0 truncate text-slate-300 group-hover:text-white">
                          <span aria-hidden>{category.emoji}</span> {category.label}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                          <span className="block h-full rounded-full bg-brand-500/70" style={{ width: `${percent}%` }} />
                        </span>
                        <span className="w-10 shrink-0 text-right font-semibold text-slate-400">{row.count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-black text-white">Recent runs</h2>
            {runs.length === 0 ? (
              <p className="text-xs text-slate-500">No runs recorded yet. Use the button above.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {runs
                  .slice()
                  .reverse()
                  .map((run, index) => (
                    <li key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2">
                      <span className="text-slate-400">{timeAgo(run.startedAt)}</span>
                      <span className="flex gap-3">
                        <span className="text-brand-400">+{run.inserted} new</span>
                        <span className="text-slate-500">{run.duplicates} dupes</span>
                        <span className="text-slate-500">{(run.durationMs / 1000).toFixed(1)}s</span>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card p-5">
          <h2 className="font-display text-lg font-black text-white">Keep it running automatically</h2>
          <p className="mt-1 text-sm text-slate-400">
            A scheduled job should call the ingest endpoint so the site stays current without you touching it.
          </p>

          <h3 className="mt-4 text-sm font-bold text-white">Vercel</h3>
          <p className="mt-1 text-xs text-slate-400">
            Add <code className="rounded bg-ink-800 px-1.5 py-0.5 text-brand-300">vercel.json</code> to run it every 10
            minutes. Vercel Cron sends a GET request, which is why the route accepts GET.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 text-[11px] text-slate-300">
{`{
  "crons": [{ "path": "/api/ingest", "schedule": "*/10 * * * *" }]
}`}
          </pre>

          <h3 className="mt-4 text-sm font-bold text-white">Anywhere else</h3>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 text-[11px] text-slate-300">
{`*/10 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-site.com/api/ingest`}
          </pre>

          <h3 className="mt-4 text-sm font-bold text-white">From this machine</h3>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 text-[11px] text-slate-300">
{`npm run ingest                    # one-off
npm run ingest -- --source bbc-football   # single feed
npm run check:feeds               # health-check every feed`}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/" className="btn btn-primary">
              ← Back to the site
            </Link>
            <Link href="/latest" className="btn">
              View latest
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
