"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CATEGORIES } from "@/lib/categories";
import type { Article } from "@/lib/types";
import TimeAgo from "./TimeAgo";

/** Scrolling strip of the freshest stories across every sport. */
export default function BreakingTicker({ articles }: { articles: Article[] }) {
  const items = articles.slice(0, 14);
  const [visible, setVisible] = useState(items.length > 0);

  useEffect(() => {
    setVisible(items.length > 0);
  }, [items.length]);

  if (!visible || items.length === 0) return null;

  // Rendered twice so the -50% keyframe loops seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-ink-800 bg-ink-900/80">
      <div className="flex items-stretch">
        <div className="z-10 flex shrink-0 items-center gap-2 bg-flame px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-white" aria-hidden />
          Breaking
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track items-center py-2" role="list" aria-label="Breaking news">
            {loop.map((article, index) => (
              <Link
                key={`${article.id}-${index}`}
                href={`/article/${article.id}`}
                role="listitem"
                className="flex shrink-0 items-center gap-2.5 border-r border-ink-800 px-4 text-[13px] text-slate-300 transition-colors hover:text-white"
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-flame" aria-hidden />
                <span className="whitespace-nowrap font-medium">{article.title}</span>
                <span className="whitespace-nowrap text-[11px] text-slate-500">
                  {article.source_name} · <TimeAgo value={article.published_at} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav aria-label="Sports categories" className="scrollbar-none flex gap-1.5 overflow-x-auto py-1">
      {CATEGORIES.map((category) => {
        const isActive = active === category.slug;
        return (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={`chip shrink-0 transition-colors ${
              isActive ? "border-brand-500/60 bg-brand-500/15 text-brand-200" : "hover:border-ink-500 hover:text-white"
            }`}
          >
            <span aria-hidden>{category.emoji}</span>
            {category.label}
          </Link>
        );
      })}
    </nav>
  );
}
