import type { Metadata } from "next";

import { ArticleCard, ArticleRow, EmptyState } from "@/components/ArticleCard";
import { FollowTeamButton } from "@/components/FollowButtons";
import { countArticles, queryArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transfer news",
  description: "Football transfer news, signings, deals and contract stories from every source SportWorld follows.",
};

export default function TransfersPage() {
  const articles = queryArticles({ transferOnly: true, limit: 48, sort: "latest" });
  const total = countArticles({});

  const teamCounts = new Map<string, number>();
  for (const article of articles) {
    for (const team of article.teams) teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
  }
  const busyTeams = [...teamCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          <span aria-hidden>🔁</span> Transfer News
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {articles.length} transfer {articles.length === 1 ? "story" : "stories"} detected, newest first.
        </p>
      </header>

      {articles.length === 0 ? (
        <EmptyState message="No transfer stories detected yet. They are identified from headlines and summaries mentioning signings, deals, contracts and fees." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {articles.slice(0, 6).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            <div className="card divide-y divide-ink-800 px-4">
              {articles.slice(6, 40).map((article) => (
                <ArticleRow key={article.id} article={article} />
              ))}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[85px] lg:self-start">
            {busyTeams.length > 0 && (
              <section className="card p-4">
                <h2 className="mb-1 font-display text-base font-black text-white">Most active clubs</h2>
                <p className="mb-3 text-xs text-slate-500">Follow a club to fill your personal feed.</p>
                <div className="flex flex-wrap gap-2">
                  {busyTeams.map(([team, count]) => (
                    <span key={team} className="chip gap-2">
                      <span className="truncate">{team}</span>
                      <span className="text-[10px] text-slate-500">{count}</span>
                      <FollowTeamButton team={team} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-brand-300 hover:bg-ink-700" />
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="card p-4">
              <h2 className="mb-2 font-display text-base font-black text-white">How these are found</h2>
              <p className="text-xs leading-relaxed text-slate-400">
                A story counts as a transfer when the headline mentions a signing, move or contract, or when the
                summary pairs a transfer word with money or contract context. {total.toLocaleString()} stories are
                scanned on every ingest run.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
