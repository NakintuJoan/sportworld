import type { LiveScore } from "./types";

/**
 * Live scores from TheSportsDB free tier (no API key; key "3" is their
 * documented public test key).
 *
 * Two provider realities shaped this implementation, both found by probing:
 *
 * 1. The free tier does NOT expose `live.php`, `liveall.php` or
 *    `eventsday.php` - they answer 404, and only a handful of league ids
 *    resolve. So there is no reliable "what is happening right now" query.
 *    Rather than fabricate a live ticker, this returns what the free tier
 *    genuinely knows: the current round's completed fixtures (with real
 *    scores) and the next scheduled fixture per competition. A match only
 *    shows a live minute if the provider reports one.
 *
 * 2. The provider rate limits aggressively - roughly a couple of requests
 *    per second, and sustained polling earns HTTP 429. Every response here
 *    is therefore cached in-process and refreshed no more often than
 *    TTL_MS, and the leagues are fetched with bounded concurrency rather
 *    than fired in a burst. A 429 falls back to the last good data instead
 *    of emptying the panel.
 */

const API_KEY = process.env.SPORTSDB_KEY ?? "3";
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

const TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const LEAGUE_CONCURRENCY = 3;

/**
 * League ids confirmed to return data on the free key at the time of
 * writing. Ids outside this list resolved as 404 or empty, so they are not
 * included - an unverified id would silently render an empty competition.
 */
const LEAGUES: Array<{ id: number; name: string; season: string }> = [
  { id: 4328, name: "English Premier League", season: "2025-2026" },
  { id: 4335, name: "Spanish La Liga", season: "2025-2026" },
  { id: 4332, name: "Italian Serie A", season: "2025-2026" },
  { id: 4480, name: "UEFA Champions League", season: "2025-2026" },
  { id: 4406, name: "Argentinian Primera Division", season: "2025" },
];

type TSDBEvent = {
  idEvent?: string;
  strLeague?: string;
  strEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
  strTimestamp?: string | null;
};

let cache: { at: number; scores: LiveScore[] } | null = null;
/** Retained separately so a rate-limited refresh does not blank the panel. */
let lastGood: LiveScore[] = [];

function toInt(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Maps the provider's status vocabulary onto the panel's badge styles.
 * Anything the provider calls finished becomes FT; scheduled becomes
 * UPCOMING. A status that explicitly indicates play in progress is kept as
 * LIVE so the pulsing indicator only appears when the data justifies it.
 */
function normaliseStatus(raw: string | null | undefined): string {
  const status = (raw ?? "").trim();
  if (!status) return "UPCOMING";
  if (/^(FT|AET|PEN|MATCH\s?ENDED|Finished|Postponed|Cancelled)$/i.test(status)) return "FT";
  if (/^NS$/i.test(status)) return "UPCOMING";
  if (/\bLIVE\b/i.test(status)) return "LIVE";
  if (/^\d{1,2}'?$/.test(status)) return "LIVE";
  if (/^(1H|2H|HT|1ST|2ND|ET|EXTRA\s?TIME|PENALTIES)$/i.test(status)) return "LIVE";
  return "UPCOMING";
}

function toScore(event: TSDBEvent, competition: string): LiveScore | null {
  const home = event.strHomeTeam?.trim();
  const away = event.strAwayTeam?.trim();
  // The provider sometimes returns a single "Arsenal vs Leeds United-"
  // style string instead of separate team fields; derive the names from
  // strEvent so a fixture is not dropped purely for missing columns.
  const derived = (event.strEvent ?? "").split(/\s+(?:vs\.?|v)\s+/i);
  // The provider's team strings sometimes carry trailing separator
  // punctuation ("Instituto-"), which would otherwise show in the panel.
  const clean = (value: string) => value.replace(/[\s\-–—:]+$/, "").trim();
  const finalHome = clean(home || derived[0] || "");
  const finalAway = clean(away || derived[1] || "");
  if (!finalHome || !finalAway) return null;

  const status = normaliseStatus(event.strStatus);
  const minuteMatch = /(\d{1,3})'/.exec(event.strStatus ?? "");
  const minute = status === "LIVE" && minuteMatch ? Number(minuteMatch[1]) : null;

  return {
    id: event.idEvent ?? `${competition}:${finalHome}:${finalAway}`,
    competition: event.strLeague?.trim() || competition,
    home: finalHome,
    away: finalAway,
    homeScore: toInt(event.intHomeScore),
    awayScore: toInt(event.intAwayScore),
    status,
    minute,
    startsAt: event.strTimestamp ?? "",
  };
}

async function getEvents(path: string): Promise<TSDBEvent[]> {
  const response = await fetch(`${BASE}/${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // Next caches per URL, but these are behind force-dynamic pages and the
    // provider is rate limited, so caching is handled in-process below.
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`TheSportsDB ${response.status}`);
  const json = (await response.json()) as { events?: TSDBEvent[] | null };
  return Array.isArray(json.events) ? json.events : [];
}

/** Runs tasks with at most `limit` in flight, so we do not trip the 429. */
async function mapWithLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function loadScores(): Promise<LiveScore[]> {
  const perLeague = await mapWithLimit(LEAGUES, LEAGUE_CONCURRENCY, async (league) => {
    // Current round gives real completed scores; next fixture gives the
    // upcoming match. Failures are isolated per league so one bad id
    // cannot empty the whole panel.
    const [round, next] = await Promise.all([
      getEvents(`eventsround.php?id=${league.id}&r=1&s=${league.season}`).catch(() => []),
      getEvents(`eventsnextleague.php?id=${league.id}`).catch(() => []),
    ]);

    const collected: LiveScore[] = [];
    for (const event of [...round, ...next]) {
      const score = toScore(event, league.name);
      if (score) collected.push(score);
    }
    return collected;
  });

  const all = perLeague.flat();

  // De-duplicate: the current round and the next fixture can overlap, and
  // some rounds repeat a fixture across pages.
  const seen = new Set<string>();
  const unique = all.filter((score) => {
    const key = `${score.competition}|${score.home}|${score.away}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Live first, then upcoming, then completed - most urgent at the top.
  const rank = (score: LiveScore) =>
    score.status === "LIVE" ? 0 : score.status === "UPCOMING" ? 1 : 2;
  return unique.sort((a, b) => rank(a) - rank(b) || a.competition.localeCompare(b.competition));
}

export async function fetchScores(): Promise<LiveScore[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.scores;

  try {
    const scores = await loadScores();
    if (scores.length > 0) lastGood = scores;
    cache = { at: now, scores };
    return scores;
  } catch {
    // Rate limited or provider down: keep serving the last good snapshot
    // rather than telling the user scores are unavailable.
    cache = { at: now, scores: lastGood };
    return lastGood;
  }
}

/**
 * Surfaced on /scores so the panel can explain its own limits honestly
 * instead of implying full live coverage.
 */
export const SCORES_PROVIDER_NOTE =
  "Live in-play minutes come from TheSportsDB's free tier, which does not expose its live endpoint, so most fixtures show as scheduled or full-time. Upgrade the provider key for true in-play updates.";
