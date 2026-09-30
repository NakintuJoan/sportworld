"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArticleCard, EmptyState } from "@/components/ArticleCard";
import { useFollowing } from "@/components/FollowProvider";
import { getCategory } from "@/lib/categories";
import type { Article } from "@/lib/types";
import TimeAgo from "./TimeAgo";

type FeedState = "idle" | "loading" | "ready" | "error";

export default function FollowingPage() {
  const { teams, categories, sources, count, ready, clear } = useFollowing();
  const [articles, setArticles] = useState<Article[]>([]);
  const [state, setState] = useState<FeedState>("idle");
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => JSON.stringify({ teams, categories, sources }), [teams, categories, sources]);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const params = new URLSearchParams();
      if (teams.length) params.set("teams", teams.join(","));
      if (categories.length) params.set("categories", categories.join(","));
      if (sources.length) params.set("sources", sources.join(","));
      params.set("limit", "60");

      const response = await fetch(`/api/articles?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      const data = (await response.json()) as { articles: Article[] };
      setArticles(data.articles);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your feed");
      setState("error");
    }
  }, [teams, categories, sources]);

  useEffect(() => {
    if (!ready) return;
    if (count === 0) {
      setArticles([]);
      setState("ready");
      return;
    }
    void load();
  }, [ready, count, key, load]);

  if (!ready) {
    return <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">{null}</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            <span aria-hidden>★</span> My Sport
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {count === 0
              ? "Follow teams, sports and publishers to build your own feed."
              : `Your feed: ${teams.length} ${teams.length === 1 ? "team" : "teams"}, ${categories.length} ${categories.length === 1 ? "sport" : "sports"}, ${sources.length} ${sources.length === 1 ? "source" : "sources"}.`}
          </p>
        </div>
        {count > 0 && (
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} disabled={state === "loading"} className="btn">
              <span aria-hidden className={state === "loading" ? "animate-spin" : ""}>
                ⟳
              </span>
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remove everything from your feed?")) clear();
              }}
              className="btn"
            >
              Clear all
            </button>
          </div>
        )}
      </header>

      {count > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {teams.map((team) => (
            <span key={team} className="chip border-brand-500/40 bg-brand-500/10 text-brand-200">
              {team}
            </span>
          ))}
          {categories.map((slug) => {
            const category = getCategory(slug);
            return (
              <Link key={slug} href={`/category/${slug}`} className="chip hover:text-white">
                <span aria-hidden>{category.emoji}</span>
                {category.label}
              </Link>
            );
          })}
          {sources.map((id) => (
            <span key={id} className="chip">
              {id}
            </span>
          ))}
        </div>
      )}

      {count === 0 && (
        <div className="card p-6">
          <h2 className="font-display text-lg font-black text-white">Start following</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Your follows are stored in this browser only, so there is no account to create and nothing to sign in to.
            Follow a club from any story page, or a whole sport below.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["football", "cricket", "basketball", "tennis", "formula1", "uganda", "african"].map((slug) => {
              const category = getCategory(slug);
              return (
                <Link key={slug} href={`/category/${slug}`} className="chip hover:border-brand-500/50 hover:text-white">
                  <span aria-hidden>{category.emoji}</span>
                  {category.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {state === "error" && <p className="mb-4 text-sm text-flame">Could not load your feed: {error}</p>}

      {state === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="card h-64">
              <div className="skeleton m-3 h-36" />
              <div className="skeleton mx-3 h-3 w-4/5" />
              <div className="skeleton mx-3 mt-2 h-3 w-3/5" />
            </div>
          ))}
        </div>
      )}

      {state === "ready" && count > 0 && articles.length === 0 && (
        <EmptyState message="No stories match your follows yet. Try following a sport, or check back after the next ingest run." />
      )}

      {state === "ready" && articles.length > 0 && (
        <>
          <p className="mb-4 text-xs uppercase tracking-wider text-slate-500">{articles.length} stories for you</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {articles.map((article) => (
              <div key={article.id}>
                <ArticleCard article={article} />
                <p className="mt-1 px-1 text-[11px] text-slate-500">
                  matched via <TimeAgo value={article.published_at} />
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
