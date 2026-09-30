import Link from "next/link";

import type { LiveScore } from "@/lib/types";

/**
 * Data and empty-state handling both live in src/lib/scores.ts. The panel
 * here is presentation only, so it never has to know which provider is
 * wired up.
 */

const STATUS_STYLES: Record<string, string> = {
  LIVE: "bg-flame/15 text-flame",
  HT: "bg-flame/15 text-flame",
  "1H": "bg-flame/15 text-flame",
  "2H": "bg-flame/15 text-flame",
  FT: "bg-ink-700 text-slate-300",
  AET: "bg-ink-700 text-slate-300",
  UPCOMING: "bg-brand-500/15 text-brand-300",
  SCHEDULED: "bg-brand-500/15 text-brand-300",
};

function StatusBadge({ status, minute }: { status: string; minute: number | null }) {
  const isLive = /LIVE|^HT$|^\dH$/.test(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[status] ?? "bg-ink-700 text-slate-400"}`}>
      {isLive && <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-current" aria-hidden />}
      {status}
      {isLive && minute ? `${minute}'` : ""}
    </span>
  );
}

export function LiveScoresPanel({ scores, providerNote }: { scores: LiveScore[]; providerNote?: string }) {
  return (
    <section aria-labelledby="scores-heading" className="card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-ink-800 pb-3">
        <h2 id="scores-heading" className="flex items-center gap-2 font-display text-lg font-black tracking-tight text-white">
          <span aria-hidden>📊</span> Live Scores
        </h2>
        <Link href="/scores" className="text-xs font-semibold uppercase tracking-wide text-brand-300 hover:text-brand-200">
          More →
        </Link>
      </div>

      {scores.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-600 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-slate-300">Score provider not connected</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
            {providerNote ??
              "Match data does not come from RSS. Wire up a scores API in src/lib/scores.ts and this panel fills in automatically."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-800">
          {scores.map((score) => (
            <li key={score.id} className="py-2.5">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span className="truncate">{score.competition}</span>
                <StatusBadge status={score.status} minute={score.minute} />
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1 truncate text-slate-200">{score.home}</span>
                <span className="shrink-0 font-display font-black text-white">
                  {score.homeScore ?? "-"} : {score.awayScore ?? "-"}
                </span>
                <span className="flex-1 truncate text-right text-slate-200">{score.away}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
