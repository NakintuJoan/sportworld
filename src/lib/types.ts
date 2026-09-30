import type { CategorySlug } from "./categories";

export type Article = {
  id: number;
  guid: string;
  url: string;
  source_id: string;
  source_name: string;
  source_home: string;
  title: string;
  summary: string;
  content: string | null;
  image: string | null;
  author: string | null;
  category: CategorySlug;
  region: "global" | "africa" | "uganda";
  tags: string[];
  teams: string[];
  players: string[];
  /** True when the source or story is flagged as a transfer/move story. */
  is_transfer: number;
  published_at: string;
  fetched_at: string;
  /** Popularity score, recomputed on read from recency + keyword weight. */
  score: number;
};

export type Source = {
  id: string;
  name: string;
  home: string;
  url: string;
  region: string;
  default_category: CategorySlug;
  enabled: number;
  last_fetched_at: string | null;
  last_status: string | null;
  last_item_count: number | null;
  last_error: string | null;
  consecutive_failures: number;
};

export type LiveScore = {
  id: string;
  competition: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: number | null;
  startsAt: string;
};

export type IngestReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fetched: number;
  parsed: number;
  inserted: number;
  duplicates: number;
  updated: number;
  pruned: number;
  sources: Array<{
    id: string;
    name: string;
    status: string;
    items: number;
    newArticles: number;
    error?: string;
    durationMs: number;
  }>;
  byCategory: Record<string, number>;
};

export type ArticleQuery = {
  category?: CategorySlug;
  /** Filter by regional bucket. `africa` also includes Uganda stories. */
  region?: "global" | "africa" | "uganda";
  sourceId?: string;
  team?: string;
  transferOnly?: boolean;
  /** Only articles newer than this many minutes. */
  sinceMinutes?: number;
  /** Free text search over title, summary and teams. */
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "latest" | "trending" | "oldest";
};
