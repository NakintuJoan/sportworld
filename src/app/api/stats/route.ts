import { NextResponse } from "next/server";

import { getStats, getPopularTeams } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/stats - database counters for dashboards and monitoring. */
export async function GET() {
  const stats = getStats();
  return NextResponse.json(
    {
      ok: true,
      articles: {
        total: stats.total,
        lastHour: stats.last1h,
        last24h: stats.last24h,
        transfers: stats.transfers,
        oldest: stats.oldest,
        newest: stats.newest,
      },
      sources: {
        enabled: stats.sourcesEnabled,
        total: stats.sourcesTotal,
        failing: stats.sourcesFailing,
      },
      byCategory: stats.byCategory,
      bySource: stats.bySource,
      byRegion: stats.byRegion,
      topTeams: getPopularTeams(20),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
