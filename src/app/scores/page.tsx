import type { Metadata } from "next";
import Link from "next/link";

import { LiveScoresPanel } from "@/components/LiveScoresPanel";
import { SCORES_PROVIDER_NOTE, fetchScores } from "@/lib/scores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live scores",
  description: "Live, upcoming and full-time scores across the leagues SportWorld follows.",
};

export default async function ScoresPage() {
  const scores = await fetchScores();
  const live = scores.filter((s) => s.status === "LIVE");
  const upcoming = scores.filter((s) => s.status === "UPCOMING");
  const finished = scores.filter((s) => s.status === "FT");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
        <span aria-hidden>📊</span> Live Scores
      </h1>

      <p className="mt-2 text-sm text-slate-400">
        {live.length > 0
          ? `${live.length} match${live.length === 1 ? "" : "es"} in play right now.`
          : "No matches in play at the moment."}{" "}
        {upcoming.length} upcoming, {finished.length} full-time.
      </p>

      <div className="mt-6">
        <LiveScoresPanel scores={scores} providerNote={SCORES_PROVIDER_NOTE} />
      </div>

      {scores.length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">{SCORES_PROVIDER_NOTE}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/" className="btn btn-primary">
          ← Back to headlines
        </Link>
        <Link href="/latest" className="btn">
          Latest news instead
        </Link>
      </div>
    </div>
  );
}
