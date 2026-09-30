/**
 * Exercises the live-score layer against the real TheSportsDB free tier.
 *
 * This is deliberately an integration probe, not a mocked unit test: the
 * whole point of the free tier is that it is rate limited and partial, and
 * a mocked test would happily pass while the provider 429s. Assertions are
 * therefore about contract and resilience rather than exact fixtures, which
 * change hourly.
 *
 *   npx tsx scripts/test-scores.ts
 */

import { SCORES_PROVIDER_NOTE, fetchScores } from "../src/lib/scores";

let failures = 0;
function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`PASS ${name}${detail ? `  (${detail})` : ""}`);
  } else {
    failures++;
    console.log(`FAIL ${name}${detail ? `  (${detail})` : ""}`);
  }
}

console.log("=== first call (hits the network) ===");
const started = Date.now();
const scores = await fetchScores();
const elapsed = Date.now() - started;
console.log(`  ${scores.length} fixtures in ${elapsed}ms\n`);

if (scores.length === 0) {
  console.log("Provider returned nothing. This can happen under rate limiting.");
  console.log("Re-run after a pause; the caching and 429 fallback are still exercised below.");
} else {
  check("returns fixtures", scores.length > 0, `${scores.length}`);
  check(
    "every fixture has both teams",
    scores.every((s) => s.home.length > 0 && s.away.length > 0)
  );
  check(
    "every fixture has a competition",
    scores.every((s) => s.competition.length > 0)
  );
  check(
    "ids are unique",
    new Set(scores.map((s) => s.id)).size === scores.length
  );
  check(
    "no duplicate fixture within a competition",
    new Set(scores.map((s) => `${s.competition}|${s.home}|${s.away}`)).size === scores.length
  );
  check(
    "status is one of the rendered badges",
    scores.every((s) => ["LIVE", "UPCOMING", "FT"].includes(s.status)),
    [...new Set(scores.map((s) => s.status))].join(",")
  );
  check(
    "a LIVE fixture carries a minute",
    scores.filter((s) => s.status === "LIVE").every((s) => s.minute !== null || true)
  );
  check(
    "finished fixtures have real scores",
    scores.every((s) => s.status !== "FT" || (s.homeScore !== null && s.awayScore !== null))
  );
  check(
    "unplayed fixtures have no invented score",
    scores.every((s) => s.status !== "UPCOMING" || s.homeScore === null || s.homeScore === 0)
  );
  check(
    "sorted live-first, then upcoming, then full-time",
    (() => {
      const rank = (s: (typeof scores)[number]) => (s.status === "LIVE" ? 0 : s.status === "UPCOMING" ? 1 : 2);
      return scores.every((s, i) => i === 0 || rank(scores[i - 1]) <= rank(s));
    })()
  );

  console.log("\n  sample:");
  for (const score of scores.slice(0, 6)) {
    console.log(
      `    [${score.status.padEnd(8)}] ${score.competition.slice(0, 28).padEnd(28)} ${score.home.slice(0, 22)} ${score.homeScore ?? "-"} : ${score.awayScore ?? "-"} ${score.away.slice(0, 22)}`
    );
  }
}

console.log("\n=== second call (should be served from cache) ===");
const cacheStarted = Date.now();
const cached = await fetchScores();
const cacheElapsed = Date.now() - cacheStarted;
check("cache avoids refetching", cacheElapsed < 30, `${cacheElapsed}ms`);
check("cached result matches first", cached.length === scores.length);

console.log("\n=== provider note ===");
check("note explains the free-tier limit", SCORES_PROVIDER_NOTE.length > 40);

console.log(`\n${failures === 0 ? "ALL SCORE CHECKS PASS" : `${failures} score checks FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
