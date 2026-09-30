import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard, EmptyState } from "@/components/ArticleCard";
import BreakingTicker, { CategoryNav } from "@/components/BreakingTicker";
import { FollowCategoryButton } from "@/components/FollowButtons";
import { ArticleRow } from "@/components/ArticleCard";
import { CATEGORIES, getCategory, isCategorySlug } from "@/lib/categories";
import { countArticles, queryArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isCategorySlug(slug)) return { title: "Category not found" };
  const category = getCategory(slug);
  return {
    title: `${category.label} News`,
    description: `${category.blurb} Live headlines and summaries from BBC Sport, Sky Sports, The Guardian, ESPNcricinfo and more.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  if (!isCategorySlug(slug)) notFound();

  const category = getCategory(slug);
  const isRegional = slug === "african" || slug === "uganda";

  const articles = queryArticles({ category: slug, limit: 40, sort: "latest" });
  const lead = articles.slice(0, 1)[0];
  const rest = articles.slice(1, 13);
  const more = articles.slice(13, 37);
  const total = countArticles({ category: slug });
  const breaking = queryArticles({ sinceMinutes: 90, limit: 14, sort: "latest" });

  // Teams most mentioned in this sport, so the page can offer quick follows.
  const teamCounts = new Map<string, number>();
  for (const article of articles) {
    for (const team of article.teams) teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
  }
  const topTeams = [...teamCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([team]) => team);

  const siblingCategories = CATEGORIES.filter((c) => c.slug !== slug).slice(0, 10);

  return (
    <>
      <BreakingTicker articles={breaking} />

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
          <Link href="/" className="transition-colors hover:text-brand-300">
            Home
          </Link>
          <span className="mx-1.5" aria-hidden>
            /
          </span>
          <span className="text-slate-300">{category.label}</span>
        </nav>

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              <span aria-hidden className="text-4xl">
                {category.emoji}
              </span>
              {category.label}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{category.blurb}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {total.toLocaleString()} {total === 1 ? "story" : "stories"} collected
            </p>
          </div>
          <FollowCategoryButton slug={slug} label={category.label} />
        </header>

        <div className="mb-6">
          <CategoryNav active={slug} />
        </div>

        {articles.length === 0 ? (
          <EmptyState message={`No ${category.label.toLowerCase()} stories collected yet.`} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              {lead && <ArticleCard article={lead} />}

              {rest.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {rest.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}

              {more.length > 0 && (
                <section aria-label="More stories" className="card divide-y divide-ink-800 px-4">
                  {more.map((article) => (
                    <ArticleRow key={article.id} article={article} />
                  ))}
                </section>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-[85px] lg:self-start">
              {topTeams.length > 0 && (
                <section className="card p-4" aria-labelledby="teams-heading">
                  <h2 id="teams-heading" className="mb-3 border-b border-ink-800 pb-3 font-display text-base font-black text-white">
                    Most-covered teams
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {topTeams.map((team) => (
                      <Link
                        key={team}
                        href={`/search?q=${encodeURIComponent(team)}`}
                        className="chip transition-colors hover:border-brand-500/50 hover:text-white"
                      >
                        {team}
                        <span className="text-[10px] text-slate-500">{teamCounts.get(team)}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section className="card p-4" aria-labelledby="also-heading">
                <h2 id="also-heading" className="mb-3 border-b border-ink-800 pb-3 font-display text-base font-black text-white">
                  Explore other sports
                </h2>
                <div className="flex flex-wrap gap-2">
                  {siblingCategories.map((sibling) => (
                    <Link
                      key={sibling.slug}
                      href={`/category/${sibling.slug}`}
                      className="chip transition-colors hover:border-brand-500/50 hover:text-white"
                    >
                      <span aria-hidden>{sibling.emoji}</span>
                      {sibling.label}
                    </Link>
                  ))}
                </div>
              </section>

              {isRegional && (
                <section className="card p-4">
                  <h2 className="mb-2 font-display text-base font-black text-white">About this section</h2>
                  <p className="text-xs leading-relaxed text-slate-400">
                    {slug === "uganda"
                      ? "Stories mentioning Ugandan clubs, players, the Uganda Premier League or CECAFA. Coverage depends on which international publishers report on Ugandan sport."
                      : "Stories from BBC Sport's Africa feed plus any match where a club, league or athlete from the continent is named."}
                  </p>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
