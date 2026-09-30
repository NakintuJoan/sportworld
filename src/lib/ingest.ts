import { categorize } from "./categorize";
import { extractEntities, isTransferStory } from "./entities";
import { parseFeed } from "./rss";
import { recordIngestRun, recordSourceFetch, saveArticle, pruneOldArticles, getSources } from "./db";
import type { IngestReport, Source } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_AGE_MS = 14 * 24 * 3_600_000;

/** Guards against a single bad feed stalling the whole run. */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildSummary(description: string, content: string, title: string): string {
  const text = (description || content || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.toLowerCase() === title.toLowerCase()) return "";

  // Some feeds put the headline in the body; drop that leading duplicate.
  let summary = text;
  const titleLower = title.toLowerCase();
  if (summary.toLowerCase().startsWith(titleLower)) {
    summary = summary.slice(title.length).replace(/^[\s\-–—:.,|]+/, "");
  }
  if (summary.length > 480) {
    const cut = summary.slice(0, 480);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    summary = lastStop > 200 ? `${cut.slice(0, lastStop + 1).trim()}` : `${cut.trim()}…`;
  }
  return summary.trim();
}

async function fetchFeed(source: Source): Promise<{ xml: string; status: number }> {
  const response = await withTimeout(
    fetch(source.url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
    }),
    FETCH_TIMEOUT_MS,
    source.id
  );

  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  return { xml: await response.text(), status: response.status };
}

function looksLikeXml(body: string): boolean {
  const head = body.slice(0, 2000).toLowerCase();
  return head.includes("<rss") || head.includes("<feed") || head.includes("<?xml");
}

export type IngestOptions = {
  /** Only ingest this source id. */
  sourceId?: string;
  /** Re-check every feed instead of skipping recently fetched ones. */
  force?: boolean;
  retentionHours?: number;
  concurrency?: number;
};

export async function runIngest(options: IngestOptions = {}): Promise<IngestReport> {
  const startedAt = new Date();
  const now = Date.now();
  const report: IngestReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    durationMs: 0,
    fetched: 0,
    parsed: 0,
    inserted: 0,
    duplicates: 0,
    updated: 0,
    pruned: 0,
    sources: [],
    byCategory: {},
  };

  const retentionHours = options.retentionHours ?? Number(process.env.RETENTION_HOURS ?? 336);
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 6, 12));
  const all = getSources(false);
  const targets = options.sourceId ? all.filter((s) => s.id === options.sourceId) : all;

  if (!targets.length) {
    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - startedAt.getTime();
    recordIngestRun(report);
    return report;
  }

  // Bounded concurrency: a simple worker pool over the target list.
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (cursor < targets.length) {
      const source = targets[cursor++];
      const sourceStart = Date.now();

      try {
        const { xml, status } = await fetchFeed(source);
        report.fetched += 1;

        if (!looksLikeXml(xml)) {
          throw new Error(`Response was not RSS/Atom (got ${xml.slice(0, 60).replace(/\s+/g, " ")})`);
        }

        const items = parseFeed(xml);
        report.parsed += items.length;
        let newArticles = 0;

        for (const item of items) {
          const publishedMs = new Date(item.pubDate).getTime();
          if (!Number.isFinite(publishedMs)) continue;
          if (publishedMs < now - MAX_AGE_MS) continue;
          // Feeds occasionally carry future timestamps; clamp to now.
          const publishedAt = new Date(Math.min(publishedMs, now)).toISOString();

          const summary = buildSummary(item.description, item.content, item.title);

          // Classify and extract entities from the clean headline+summary only.
          // Publishers such as Yahoo append a "more sports news" link list to
          // content:encoded, which would otherwise drag in unrelated teams and
          // sports and mis-file the article. Fall back to the opening of the
          // body only when the feed gives us no summary at all.
          const classificationText = summary || item.content.slice(0, 400);
          const haystack = `${item.title} ${classificationText}`;

          const { category, region } = categorize({
            title: item.title,
            summary: classificationText,
            content: "",
            feedCategories: item.categories,
            defaultCategory: source.default_category,
          });
          const { teams, players } = extractEntities(haystack);

          const outcome = saveArticle({
            guid: item.guid,
            url: item.link,
            sourceId: source.id,
            title: item.title,
            summary,
            // We deliberately store headline + short summary only and link out
            // to the publisher. No article bodies are copied.
            content: null,
            image: item.image,
            author: item.author,
            category,
            region,
            tags: item.categories,
            teams,
            players,
            isTransfer: isTransferStory(item.title, summary),
            publishedAt,
            fetchedAt: new Date().toISOString(),
          });

          if (outcome === "inserted") {
            report.inserted += 1;
            newArticles += 1;
            report.byCategory[category] = (report.byCategory[category] ?? 0) + 1;
          } else if (outcome === "updated") {
            report.updated += 1;
          } else {
            report.duplicates += 1;
          }
        }

        recordSourceFetch(source.id, String(status), items.length, null);
        report.sources.push({
          id: source.id,
          name: source.name,
          status: String(status),
          items: items.length,
          newArticles,
          durationMs: Date.now() - sourceStart,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        recordSourceFetch(source.id, "error", null, message);
        report.sources.push({
          id: source.id,
          name: source.name,
          status: "error",
          items: 0,
          newArticles: 0,
          error: message,
          durationMs: Date.now() - sourceStart,
        });
      }
    }
  });

  await Promise.all(workers);

  report.pruned = pruneOldArticles(retentionHours);
  report.finishedAt = new Date().toISOString();
  report.durationMs = Date.now() - startedAt.getTime();
  recordIngestRun(report);

  return report;
}
