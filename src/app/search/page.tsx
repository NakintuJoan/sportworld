import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ArticleCard, EmptyState } from "@/components/ArticleCard";
import { getPopularTeams, queryArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const term = q?.trim();
  return term
    ? { title: `Search: ${term}`, description: `Sports news matching "${term}".` }
    : { title: "Search sports news", description: "Search thousands of sports headlines and summaries by team, player, sport or source." };
}

function SearchForm({ initial }: { initial: string }) {
  return (
    <form action="/search" method="get" role="search" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={initial}
        placeholder="Team, player, competition or source…"
        aria-label="Search sports news"
        className="input"
        autoFocus={!initial}
      />
      <button type="submit" className="btn btn-primary shrink-0">
        Search
      </button>
    </form>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const term = (params.q ?? "").trim();
  const results = term ? queryArticles({ q: term, limit: 48, sort: "latest" }) : [];
  const popular = getPopularTeams(12);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">Search</h1>
        <p className="mt-2 text-sm text-slate-400">
          Search every collected headline, summary, team and player name.
        </p>
      </header>

      <div className="mb-6 max-w-2xl">
        <Suspense fallback={<div className="input" />}>
          <SearchForm initial={term} />
        </Suspense>
      </div>

      {term ? (
        <section aria-live="polite">
          <p className="mb-4 text-sm text-slate-400">
            {results.length === 0 ? "No matches" : `${results.length} ${results.length === 1 ? "result" : "results"}`} for{" "}
            <span className="font-semibold text-white">“{term}”</span>
          </p>
          {results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <EmptyState message={`Nothing matched “${term}”. Try a team like “Arsenal” or a sport like “cricket”.`} />
          )}
        </section>
      ) : (
        <section aria-labelledby="popular-heading">
          <h2 id="popular-heading" className="mb-3 font-display text-base font-black text-white">
            Most-mentioned teams right now
          </h2>
          <div className="flex flex-wrap gap-2">
            {popular.map(({ team, count }) => (
              <Link
                key={team}
                href={`/search?q=${encodeURIComponent(team)}`}
                className="chip transition-colors hover:border-brand-500/50 hover:text-white"
              >
                {team}
                <span className="text-[10px] text-slate-500">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
