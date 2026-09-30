import type { Metadata } from "next";
import Link from "next/link";

import { ArticleCard, ArticleRow, EmptyState } from "@/components/ArticleCard";
import { FollowSourceButton } from "@/components/FollowButtons";
import { countArticles, getSources, queryArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Latest headlines",
  description: "Every story SportWorld has collected, newest first, across all sports and sources.",
};

const WINDOWS = [
  { label: "Last 30 minutes", minutes: 30 },
  { label: "Last 2 hours", minutes: 120 },
  { label: "Last 6 hours", minutes: 360 },
  { label: "Last 24 hours", minutes: 1440 },
  { label: "All time", minutes: 0 },
];

type Props = { searchParams: Promise<{ since?: string }> };

export default async function LatestPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeWindow = WINDOWS.find((window) => window.minutes.toString() === params.since) ?? WINDOWS[4];
  const articles = queryArticles({
    sinceMinutes: activeWindow.minutes || undefined,
    limit: 60,
    sort: "latest",
  });
  const total = countArticles({});
  const sources = getSources(false);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          <span aria-hidden>🗞️</span> Latest
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {activeWindow.label} · {total.toLocaleString()} stories collected from {sources.length} live feeds.
        </p>
      </header>

      <nav aria-label="Time window" className="mb-6 flex flex-wrap gap-2">
        {WINDOWS.map((window) => {
          const isActive = window.minutes === activeWindow.minutes;
          return (
            <Link
              key={window.label}
              href={window.minutes ? `/latest?since=${window.minutes}` : "/latest"}
              aria-current={isActive ? "page" : undefined}
              className={`chip transition-colors ${isActive ? "border-brand-500/60 bg-brand-500/15 text-brand-200" : "hover:text-white"}`}
            >
              {window.label}
            </Link>
          );
        })}
      </nav>

      {articles.length === 0 ? (
        <EmptyState message={`Nothing published ${activeWindow.label.toLowerCase()}.`} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {articles.slice(0, 9).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            <div className="mt-4 card divide-y divide-ink-800 px-4">
              {articles.slice(9, 45).map((article) => (
                <ArticleRow key={article.id} article={article} />
              ))}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[85px] lg:self-start">
            <section className="card p-4">
              <h2 className="mb-3 border-b border-ink-800 pb-3 font-display text-base font-black text-white">
                Sources
              </h2>
              <ul className="space-y-2">
                {sources.slice(0, 14).map((source) => (
                  <li key={source.id} className="flex items-center justify-between gap-2 text-xs">
                    <a
                      href={source.home}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="truncate text-slate-300 transition-colors hover:text-brand-300"
                    >
                      {source.name}
                    </a>
                    <FollowSourceButton sourceId={source.id} sourceName={source.name} />
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
