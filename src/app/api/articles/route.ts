import { NextResponse } from "next/server";

import { isCategorySlug } from "@/lib/categories";
import { countArticles, getSources, queryArticles } from "@/lib/db";
import type { ArticleQuery } from "@/lib/types";

export const dynamic = "force-dynamic";

function intParam(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function listParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 25);
}

/**
 * GET /api/articles
 *
 * Filters (all optional, all combinable):
 *   category     a category slug, e.g. football
 *   region       global | africa | uganda
 *   source       source id, e.g. bbc-football
 *   team         matches team or player names and the headline
 *   transfer     "1" for transfer stories only
 *   since        minutes; e.g. since=60 for the last hour
 *   q            free text over title, summary, teams, players, tags
 *   teams        comma separated list; returns the newest story per team
 *   sources      comma separated source ids, merged and sorted by date
 *   limit        1-200, default 40
 *   offset       default 0
 *   sort         latest | trending | oldest
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const categoryParam = params.get("category") ?? undefined;
  const sortParam = params.get("sort");
  const limit = intParam(params.get("limit"), 40, 200);
  const offset = intParam(params.get("offset"), 0, 10_000);
  const team = params.get("team")?.trim();

  const base: ArticleQuery = {
    category: categoryParam && isCategorySlug(categoryParam) ? categoryParam : undefined,
    region: (params.get("region") as ArticleQuery["region"]) ?? undefined,
    sourceId: params.get("source")?.trim() || undefined,
    team: team || undefined,
    transferOnly: params.get("transfer") === "1",
    // Cap at the retention window: asking for a longer window than the data
    // can hold just returns everything, and 0 would silently disable the filter.
    sinceMinutes: intParam(params.get("since"), 0, 20_160) || undefined,
    q: params.get("q")?.trim() || undefined,
    limit,
    offset,
    sort: sortParam === "trending" || sortParam === "oldest" ? sortParam : "latest",
  };

  // Multi-value mode: the personal feed asks for several teams or sources at once.
  const teams = listParam(params.get("teams"));
  const sources = listParam(params.get("sources"));
  const categories = listParam(params.get("categories")).filter(isCategorySlug);

  if (teams.length || sources.length || categories.length) {
    const seen = new Set<number>();
    const merged = [];

    for (const teamName of teams) {
      for (const article of queryArticles({ ...base, team: teamName, limit: 6 })) {
        if (!seen.has(article.id)) {
          seen.add(article.id);
          merged.push(article);
        }
      }
    }
    for (const categorySlug of categories) {
      for (const article of queryArticles({ ...base, category: categorySlug, limit: 6 })) {
        if (!seen.has(article.id)) {
          seen.add(article.id);
          merged.push(article);
        }
      }
    }
    for (const sourceId of sources) {
      for (const article of queryArticles({ ...base, sourceId, limit: 6 })) {
        if (!seen.has(article.id)) {
          seen.add(article.id);
          merged.push(article);
        }
      }
    }

    const sortKey = base.sort === "oldest" ? 1 : -1;
    merged.sort((a, b) => sortKey * (new Date(a.published_at).getTime() - new Date(b.published_at).getTime()));

    return NextResponse.json({
      articles: merged.slice(0, limit),
      total: merged.length,
      mode: "personal",
      matched: { teams: teams.length, categories: categories.length, sources: sources.length },
    });
  }

  const articles = queryArticles(base);
  return NextResponse.json({
    articles,
    total: countArticles(base),
    mode: "filter",
    query: {
      category: base.category ?? null,
      region: base.region ?? null,
      source: base.sourceId ?? null,
      team: base.team ?? null,
      transferOnly: base.transferOnly,
      q: base.q ?? null,
      limit: base.limit,
      offset: base.offset,
      sort: base.sort,
    },
  });
}

export async function HEAD() {
  const sources = getSources(false);
  return new NextResponse(null, {
    status: 200,
    headers: { "x-sportworld-sources": String(sources.length) },
  });
}
