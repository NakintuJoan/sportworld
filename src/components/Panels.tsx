import Link from "next/link";

import { CATEGORIES } from "@/lib/categories";
import type { Article } from "@/lib/types";
import { ArticleRow } from "./ArticleCard";

export function SectionHeading({
  title,
  emoji,
  href,
  action = "View all",
}: {
  title: string;
  emoji?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-ink-800 pb-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-black tracking-tight text-white sm:text-xl">
        {emoji && <span aria-hidden>{emoji}</span>}
        {title}
      </h2>
      {href && (
        <Link href={href} className="shrink-0 text-xs font-semibold uppercase tracking-wide text-brand-300 transition-colors hover:text-brand-200">
          {action} →
        </Link>
      )}
    </div>
  );
}

export function TrendingPanel({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <section aria-labelledby="trending-heading">
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-ink-800 pb-3">
        <h2 id="trending-heading" className="flex items-center gap-2 font-display text-lg font-black tracking-tight text-white">
          <span aria-hidden>🔥</span> Trending Now
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ranked by recency</span>
      </div>
      <div className="divide-y divide-ink-800">
        {articles.map((article, index) => (
          <ArticleRow key={article.id} article={article} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

export function CategoryStrip({ counts }: { counts: Record<string, number> }) {
  const active = CATEGORIES.filter((category) => (counts[category.slug] ?? 0) > 0);
  if (!active.length) return null;

  return (
    <section aria-label="Browse by sport" className="card p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Browse by sport</h2>
      <div className="flex flex-wrap gap-2">
        {active.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="chip transition-colors hover:border-brand-500/50 hover:bg-ink-700 hover:text-white"
          >
            <span aria-hidden>{category.emoji}</span>
            {category.label}
            <span className="ml-0.5 rounded bg-ink-700 px-1.5 text-[10px] font-bold text-slate-400">{counts[category.slug]}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
