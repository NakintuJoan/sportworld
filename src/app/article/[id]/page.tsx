import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleRow, SourceLine } from "@/components/ArticleCard";
import { FollowSourceButton, FollowTeamButton } from "@/components/FollowButtons";
import { getCategory } from "@/lib/categories";
import { findRelated, getArticleById } from "@/lib/db";
import { absoluteTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = getArticleById(Number(id));
  if (!article) return { title: "Story not found" };
  const category = getCategory(article.category);
  return {
    title: article.title,
    description: article.summary || `${article.title} — reported by ${article.source_name}.`,
    alternates: { canonical: `/article/${article.id}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary || undefined,
      publishedTime: article.published_at,
      images: article.image ? [{ url: article.image }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const article = getArticleById(numericId);
  if (!article) notFound();

  const category = getCategory(article.category);
  const related = findRelated(article, 5);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-slate-500">
        <Link href="/" className="transition-colors hover:text-brand-300">
          Home
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <Link href={`/category/${category.slug}`} className="transition-colors hover:text-brand-300">
          {category.label}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0">
          <header>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <Link
                href={`/category/${category.slug}`}
                className="chip transition-colors hover:border-brand-500/50 hover:text-white"
              >
                <span aria-hidden>{category.emoji}</span>
                {category.label}
              </Link>
              {article.is_transfer === 1 && (
                <span className="chip border-brand-500/40 bg-brand-500/10 text-brand-200">🔁 Transfer</span>
              )}
              {article.region === "uganda" && <span className="chip">🇺🇬 Uganda</span>}
              {article.region === "africa" && <span className="chip">🌍 Africa</span>}
            </div>

            <h1 className="font-display text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
              {article.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-ink-800 py-3">
              <SourceLine article={article} />
              <p className="text-xs text-slate-500">{absoluteTime(article.published_at)}</p>
            </div>
          </header>

          {article.image && (
            // Publisher-supplied thumbnail, shown with a link back to the source.
            <a href={article.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-6 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.image}
                alt=""
                loading="lazy"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 object-cover"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">Image © {article.source_name}</p>
            </a>
          )}

          {article.summary && (
            <div className="prose-sport mt-6">
              <p className="text-lg !leading-relaxed !text-slate-200">{article.summary}</p>
            </div>
          )}

          <div className="card mt-8 p-5">
            <p className="text-sm leading-relaxed text-slate-300">
              SportWorld shows the headline and a short summary only. The full story is published by{" "}
              <span className="font-semibold text-white">{article.source_name}</span>.
            </p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn btn-primary mt-4 w-full sm:w-auto"
            >
              Read full story at {article.source_name} ↗
            </a>
            {article.author && <p className="mt-3 text-xs text-slate-500">Reported by {article.author}</p>}
          </div>

          {article.teams.length > 0 && (
            <section className="mt-8" aria-labelledby="teams-heading">
              <h2 id="teams-heading" className="mb-3 font-display text-base font-black text-white">
                Teams & players in this story
              </h2>
              <div className="flex flex-wrap gap-2">
                {article.teams.map((team) => (
                  <div key={team} className="chip gap-2">
                    <Link href={`/search?q=${encodeURIComponent(team)}`} className="transition-colors hover:text-white">
                      {team}
                    </Link>
                    <FollowTeamButton team={team} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-brand-300 hover:bg-ink-700" />
                  </div>
                ))}
                {article.players.map((player) => (
                  <Link key={player} href={`/search?q=${encodeURIComponent(player)}`} className="chip hover:text-white">
                    🧍 {player}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-8" aria-labelledby="related-heading">
              <h2 id="related-heading" className="mb-2 border-b border-ink-800 pb-3 font-display text-base font-black text-white">
                Related stories
              </h2>
              <div className="divide-y divide-ink-800">
                {related.map((item) => (
                  <ArticleRow key={item.id} article={item} />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-6 lg:sticky lg:top-[85px] lg:self-start">
          <section className="card p-4">
            <h2 className="mb-2 font-display text-base font-black text-white">Follow this story</h2>
            <p className="mb-3 text-xs leading-relaxed text-slate-400">
              Save the teams or the publisher to your personal feed.
            </p>
            <div className="flex flex-wrap gap-2">
              {article.teams.slice(0, 4).map((team) => (
                <FollowTeamButton key={team} team={team} />
              ))}
              <FollowSourceButton sourceId={article.source_id} sourceName={article.source_name} />
            </div>
            <Link href="/following" className="btn mt-3 w-full">
              ★ Open my feed
            </Link>
          </section>

          {article.tags.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 border-b border-ink-800 pb-3 font-display text-base font-black text-white">
                Topics
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.slice(0, 16).map((tag) => (
                  <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="chip text-[11px] hover:text-white">
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
