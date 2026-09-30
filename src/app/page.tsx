import Link from "next/link";

import { ArticleCard, ArticleGrid, ArticleRow, EmptyState, HeroCard } from "@/components/ArticleCard";
import BreakingTicker, { CategoryNav } from "@/components/BreakingTicker";
import { FollowCategoryButton } from "@/components/FollowButtons";
import { LiveScoresPanel } from "@/components/LiveScoresPanel";
import { CategoryStrip, SectionHeading, TrendingPanel } from "@/components/Panels";
import { getCategory } from "@/lib/categories";
import { countArticles, getStats, queryArticles } from "@/lib/db";
import { fetchScores } from "@/lib/scores";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const hero = queryArticles({ limit: 1, sort: "latest" })[0];
  const breaking = queryArticles({ sinceMinutes: 120, limit: 20, sort: "latest" });
  const latest = queryArticles({ limit: 19, offset: hero ? 1 : 0, sort: "latest" });
  const trending = queryArticles({ limit: 6, sort: "trending" });
  const transfers = queryArticles({ transferOnly: true, limit: 6, sort: "latest" });
  const uganda = queryArticles({ region: "uganda", limit: 5, sort: "latest" });
  const africa = queryArticles({ region: "africa", limit: 6, sort: "latest" });
  const football = queryArticles({ category: "football", limit: 4, sort: "latest" });
  const cricket = queryArticles({ category: "cricket", limit: 4, sort: "latest" });
  const stats = getStats();
  const scores = await fetchScores();

  const counts: Record<string, number> = {};
  for (const row of stats.byCategory) counts[row.category] = row.count;

  return (
    <>
      <BreakingTicker articles={breaking} />

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <section className="mb-6" aria-label="Live coverage counter">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="chip border-brand-500/40 bg-brand-500/10 text-brand-200">
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-brand-400" aria-hidden />
              Live aggregation
            </span>
            <span className="chip">{stats.total.toLocaleString()} stories</span>
            <span className="chip">{stats.last1h} in the last hour</span>
            <span className="chip">{stats.sourcesEnabled} feeds online</span>
            {stats.last24h > 0 && <span className="chip">{stats.last24h} in 24h</span>}
          </div>
        </section>

        <div className="mb-6">
          <CategoryNav />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-10">
            {hero ? (
              <section aria-label="Top story">
                <HeroCard article={hero} />
              </section>
            ) : (
              <EmptyState message="No stories yet. Open the admin panel and run your first ingest." />
            )}

            {transfers.length > 0 && (
              <section aria-labelledby="transfers-heading">
                <SectionHeading title="Transfer News" emoji="🔁" href="/transfers" />
                <div id="transfers-heading" className="sr-only">
                  Transfer news
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {transfers.slice(0, 3).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="latest-heading">
              <SectionHeading title="Latest Headlines" emoji="🗞️" href="/latest" />
              <h2 id="latest-heading" className="sr-only">
                Latest headlines
              </h2>
              {latest.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {latest.slice(0, 6).map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
                    {latest.slice(6, 18).map((article) => (
                      <ArticleRow key={article.id} article={article} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </section>

            {football.length > 0 && (
              <section aria-labelledby="football-heading">
                <SectionHeading title="Football" emoji="⚽" href="/category/football" />
                <h2 id="football-heading" className="sr-only">
                  Football
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {football.map((article) => (
                    <ArticleCard key={article.id} article={article} showImage={false} />
                  ))}
                </div>
              </section>
            )}

            {cricket.length > 0 && (
              <section aria-labelledby="cricket-heading">
                <SectionHeading title="Cricket" emoji="🏏" href="/category/cricket" />
                <h2 id="cricket-heading" className="sr-only">
                  Cricket
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {cricket.map((article) => (
                    <ArticleCard key={article.id} article={article} showImage={false} />
                  ))}
                </div>
              </section>
            )}

            <CategoryStrip counts={counts} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[85px] lg:self-start">
            <TrendingPanel articles={trending} />
            <LiveScoresPanel scores={scores} />

            {uganda.length > 0 && (
              <section className="card p-4" aria-labelledby="uganda-heading">
                <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-ink-800 pb-3">
                  <h2 id="uganda-heading" className="font-display text-base font-black text-white">
                    🇺🇬 Uganda Sports
                  </h2>
                  <Link href="/category/uganda" className="text-xs font-semibold uppercase text-brand-300 hover:text-brand-200">
                    More →
                  </Link>
                </div>
                <div className="divide-y divide-ink-800">
                  {uganda.map((article) => (
                    <ArticleRow key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            {africa.length > 0 && (
              <section className="card p-4" aria-labelledby="africa-heading">
                <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-ink-800 pb-3">
                  <h2 id="africa-heading" className="font-display text-base font-black text-white">
                    🌍 African Sports
                  </h2>
                  <Link href="/category/african" className="text-xs font-semibold uppercase text-brand-300 hover:text-brand-200">
                    More →
                  </Link>
                </div>
                <div className="divide-y divide-ink-800">
                  {africa.map((article) => (
                    <ArticleRow key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            <section className="card p-4" aria-labelledby="build-feed-heading">
              <h2 id="build-feed-heading" className="mb-2 font-display text-base font-black text-white">
                Build your feed
              </h2>
              <p className="mb-3 text-xs leading-relaxed text-slate-400">
                Follow the teams and sports you care about. SportWorld shows only what you picked — stored on your
                device, no account needed.
              </p>
              <div className="flex flex-wrap gap-2">
                <FollowCategoryButton slug="football" label="Football" />
                <FollowCategoryButton slug="cricket" label="Cricket" />
                <FollowCategoryButton slug="uganda" label="Uganda" />
              </div>
              <Link href="/following" className="btn mt-3 w-full">
                ★ Open my feed
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
