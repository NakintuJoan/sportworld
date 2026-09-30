import { NextResponse } from "next/server";

import { runIngest } from "@/lib/ingest";
import { isAuthorised } from "@/lib/auth";
import type { IngestReport } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Requester = { ip: string | null; auth: string | null };

function identify(request: Request): Requester {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    ip: forwarded ? forwarded.split(",")[0].trim() : null,
    auth: request.headers.get("authorization"),
  };
}

/**
 * GET /api/ingest  - trigger a collection run
 *
 * Authenticate with CRON_SECRET when it is set:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/ingest
 * Query params: ?source=<id> to run a single feed, ?retention=<hours> to
 * override pruning. Vercel Cron calls GET with no auth header, so the secret
 * check is skipped in production only when CRON_SECRET is empty.
 */
export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Send a valid admin session or Authorization: Bearer $CRON_SECRET." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("source")?.trim() || undefined;
  const retentionParam = Number.parseInt(url.searchParams.get("retention") ?? "", 10);
  const retentionHours = Number.isFinite(retentionParam) && retentionParam > 0 ? retentionParam : undefined;

  const report = await runIngest({ sourceId: source, retentionHours });

  return NextResponse.json(toSummary(report), {
    headers: { "cache-control": "no-store" },
  });
}

/** POST /api/ingest - same as GET, for clients that prefer to POST. */
export async function POST(request: Request) {
  return GET(request);
}

function toSummary(report: IngestReport) {
  return {
    ok: true,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    durationMs: report.durationMs,
    totals: {
      feedsChecked: report.sources.length,
      feedsHealthy: report.sources.filter((s) => s.status === "error").length === 0 ? report.sources.length : report.sources.length - report.sources.filter((s) => s.status === "error").length,
      itemsParsed: report.parsed,
      inserted: report.inserted,
      updated: report.updated,
      duplicates: report.duplicates,
      pruned: report.pruned,
    },
    byCategory: report.byCategory,
    sources: report.sources,
  };
}
