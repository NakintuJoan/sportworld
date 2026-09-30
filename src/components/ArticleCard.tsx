import Image from "next/image";
import Link from "next/link";

import { getCategory } from "@/lib/categories";
import { initials, isBreaking } from "@/lib/format";
import type { Article } from "@/lib/types";
import TimeAgo from "./TimeAgo";

function Thumb({ article, sizes, priority = false }: { article: Article; sizes: string; priority?: boolean }) {
  const category = getCategory(article.category);

  if (!article.image) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-800 text-3xl">
        <span aria-hidden>{category.emoji}</span>
      </div>
    );
  }

  return (
    <Image
      src={article.image}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      unoptimized
    />
  );
}

export function SourceLine({ article, className = "" }: { article: Article; className?: string }) {
  return (
    <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 ${className}`}>
      <a
        href={article.source_home || article.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex items-center gap-1.5 font-semibold text-slate-300 transition-colors hover:text-brand-300"
        title={`Visit ${article.source_name}`}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-ink-700 text-[8px] font-bold text-slate-300">
          {initials(article.source_name)}
        </span>
        {article.source_name}
      </a>
      <span aria-hidden className="text-ink-600">•</span>
      <TimeAgo value={article.published_at} />
    </span>
  );
}

function Badges({ article }: { article: Article }) {
  const category = getCategory(article.category);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isBreaking(article.published_at) && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-flame/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-flame">
          <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-flame" aria-hidden />
          Breaking
        </span>
      )}
      {article.is_transfer === 1 && (
        <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300">
          Transfer
        </span>
      )}
      {article.region === "uganda" && (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
          🇺🇬 Uganda
        </span>
      )}
      {article.region === "africa" && (
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
          🌍 Africa
        </span>
      )}
      <Link
        href={`/category/${category.slug}`}
        className="rounded-full bg-ink-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-ink-600"
      >
        {category.emoji} {category.label}
      </Link>
    </div>
  );
}

/** Large lead story for the top of the homepage. */
export function HeroCard({ article }: { article: Article }) {
  return (
    <article className="card card-hover group relative overflow-hidden">
      <Link href={`/article/${article.id}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink-800">
          <Thumb article={article} sizes="(max-width: 1024px) 100vw, 66vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <Badges article={article} />
          <h2 className="mt-3 font-display text-2xl font-black leading-tight text-white sm:text-4xl">
            {article.title}
          </h2>
          {article.summary && (
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{article.summary}</p>
          )}
          <SourceLine article={article} className="mt-4" />
        </div>
      </Link>
    </article>
  );
}

/** Standard card used in rails and grids. */
export function ArticleCard({ article, showImage = true }: { article: Article; showImage?: boolean }) {
  const category = getCategory(article.category);
  return (
    <article className="card card-hover group h-full overflow-hidden">
      <Link href={`/article/${article.id}`} className="flex h-full flex-col">
        {showImage && (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-800">
            <Thumb article={article} sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
        )}
        <div className="flex flex-1 flex-col p-4">
          <Badges article={article} />
          <h3 className="mt-2.5 font-display text-[15px] font-bold leading-snug text-slate-100 transition-colors group-hover:text-white clamp-2">
            {article.title}
          </h3>
          {article.summary && (
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-400">{article.summary}</p>
          )}
          <SourceLine article={article} className="mt-auto pt-3" />
        </div>
      </Link>
    </article>
  );
}

/** Dense row for sidebars and "latest" columns. */
export function ArticleRow({ article, rank }: { article: Article; rank?: number }) {
  const category = getCategory(article.category);
  return (
    <article className="group flex gap-3 py-3">
      {rank !== undefined && (
        <span className="w-6 shrink-0 pt-0.5 text-right font-display text-xl font-black text-ink-600 transition-colors group-hover:text-brand-500">
          {rank}
        </span>
      )}
      <Link href={`/article/${article.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <span aria-hidden>{category.emoji}</span>
          {category.label}
          {isBreaking(article.published_at) && <span className="text-flame">• Breaking</span>}
        </div>
        <h4 className="mt-1 text-sm font-semibold leading-snug text-slate-200 transition-colors group-hover:text-white clamp-2">
          {article.title}
        </h4>
        <SourceLine article={article} className="mt-1.5" />
      </Link>
      <Link
        href={`/article/${article.id}`}
        tabIndex={-1}
        aria-hidden
        className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-800 sm:block"
      >
        <Thumb article={article} sizes="96px" />
      </Link>
    </article>
  );
}

/** Text-only row for very dense lists. */
export function ArticleLine({ article }: { article: Article }) {
  return (
    <article className="group border-b border-ink-800 py-3 last:border-0">
      <Link href={`/article/${article.id}`} className="block">
        <h4 className="text-sm font-semibold leading-snug text-slate-300 transition-colors group-hover:text-white clamp-2">
          {article.title}
        </h4>
        <SourceLine article={article} className="mt-1.5" />
      </Link>
    </article>
  );
}

export function ArticleGrid({ articles, showImages = true }: { articles: Article[]; showImages?: boolean }) {
  if (!articles.length) {
    return <EmptyState />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} showImage={showImages} />
      ))}
    </div>
  );
}

export function EmptyState({ message = "No stories here yet." }: { message?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="text-3xl" aria-hidden>
        🗞️
      </span>
      <p className="text-sm text-slate-400">{message}</p>
      <p className="text-xs text-slate-500">Run an ingest from the admin panel to pull fresh stories.</p>
    </div>
  );
}
