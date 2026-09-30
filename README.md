# SportWorld

**All Sports. One Place.**

An active global sports-news aggregator. It polls public RSS/Atom feeds on a
schedule, strips duplicates, categorises every story, and publishes headlines
with short summaries that link back to the original publisher.

You never write an article. You write a collector.

---

## What it does

```
34 RSS feeds → fetch → parse → dedupe → categorise → extract entities → SQLite → website
   (every 10 min, automatically)
```

On each run the pipeline:

1. **Fetches** every enabled feed with a browser-like user agent and a 15s timeout.
2. **Parses** RSS 2.0 and Atom, handling the shapes publishers actually ship:
   CDATA, `content:encoded`, `media:content`, `enclosure` images, Cricinfo's
   `coverImages`, and BBC's `BST` date suffixes.
3. **Removes duplicates** by canonical URL (tracking params stripped) and GUID.
4. **Categorises** into 20 sections using weighted keyword rules plus the
   publisher's own `<category>` tags, which are trusted over body text.
5. **Extracts teams and players** so you can follow them.
6. **Scores trending** from recency and story-significance signals.
7. **Prunes** anything older than `RETENTION_HOURS` (default 14 days).

A typical run: 34 feeds, ~1,300 items, ~5–15 seconds, and a few dozen new
stories. Roughly 150 new stories an hour during a normal news day.

## Quick start

```bash
npm install
npm run ingest     # pull stories into the local database
npm run dev        # http://localhost:3000
```

Requires **Node 22.5+** (uses the built-in `node:sqlite`, so there is no native
module to compile). Verified on Node 24.14.

There is no `.env` needed to browse the public site. To reach `/admin` or let a
cron trigger collection, copy `.env.example` to `.env` and set `ADMIN_PASSWORD`
— without it, the admin area refuses to open and says so.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Transfer, classification and feed-URL (SSRF) test cases |
| `npm run ingest` | One collection run from the command line |
| `npm run ingest -- --source bbc-football` | Collect from a single feed |
| `npm run check:feeds` | Health-check every feed |
| `npm run inspect:feeds` | Print a feed's raw items, images and categories |
| `npm run audit` | Data-quality report on the stored articles |
| `npm run reflag` | Re-apply the transfer heuristic to stored rows |

## Admin access

`/admin` controls collection runs and the feed list, so it is behind a
password. Set these in `.env` (see `.env.example`):

```
ADMIN_PASSWORD=choose-something-long
SESSION_SECRET=node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then visit `/admin/login`. The password is checked server-side and the session
is an httpOnly, `SameSite=Lax` signed cookie, so the credential is never
readable from JavaScript on the page. Everything else on the site stays
public — headlines need no account.

Two independent credentials, because they protect different things:

| Variable | Guards | Used by |
| --- | --- | --- |
| `ADMIN_PASSWORD` | `/admin` and the write routes | A person, via the login form |
| `CRON_SECRET` | `/api/ingest` | A scheduler, via `Authorization: Bearer` |

Both **fail closed**. If a write arrives and neither is configured, the request
is refused rather than allowed, because "no secret set" is exactly the state
that leaves an endpoint open on the internet. If `ADMIN_PASSWORD` is unset,
`/admin` redirects to a page explaining what to configure instead of rendering
controls that would fail.

### Why feed URLs are validated

Anyone who can add a feed controls a URL that *this server* fetches with its
own network position. Left unchecked, that turns "add a feed" into a way to
read the cloud metadata service, a database on localhost, or an internal admin
panel. So every URL is checked twice before it is stored or fetched:

- the hostname, rejecting `localhost`, `metadata.google.internal` and friends
- **every address the hostname resolves to**, rejecting loopback, RFC 1918,
  CGNAT, link-local (including `169.254.169.254`) and IPv6 unique-local

The second check is the one that matters. `localtest.me` is a public name that
resolves to `127.0.0.1`; a string check on the hostname waves it through. Only
http/https on ports 80/443 is accepted. `npm test` covers these cases.

A residual DNS-rebinding window remains between resolving and connecting.
Closing it fully needs a pinned-IP HTTP client; validating on save and again on
fetch is the proportionate control for an operator-configured feed list.

## Keeping it active

The site only updates when something triggers a run. Set up a scheduler.

**Vercel** — `vercel.json` is already configured to call `/api/ingest` every
10 minutes. Vercel Cron issues a `GET`, which is why the route accepts GET.
Set `CRON_SECRET` in the Vercel environment so the cron can authenticate.

**Anywhere else** — any cron service will do:

```cron
*/10 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-site.com/api/ingest
```

**This machine** — `npm run ingest` on a local scheduler works too, with no
credentials involved.

## Routes

| Page | Path |
| --- | --- |
| Home — breaking ticker, hero, trending, transfers, per-sport rails | `/` |
| Category (20 sections) | `/category/[slug]` |
| Story with related stories and follow actions | `/article/[id]` |
| Latest, with time-window filter | `/latest?since=30` |
| Transfer news | `/transfers` |
| Personal feed from local follows | `/following` |
| Search | `/search?q=…` |
| Live scores (provider stub) | `/scores` |
| Admin — ingest, sources, stats (password) | `/admin` |

### API

Public, no credentials needed:

```
GET  /api/articles   filter: category, region, source, team, transfer=1,
                     since=<minutes>, q, teams=a,b, categories=x,y,
                     sources=id1,id2, limit, offset, sort=latest|trending|oldest
GET  /api/stats      counters by sport, source and region
GET  /api/sources    every feed with its health record
```

Require an admin session cookie, or `Authorization: Bearer $CRON_SECRET`:

```
GET  /api/ingest     run a collection
POST /api/sources    add or update a feed
PATCH /api/sources   { id, enabled } enable or disable
DELETE /api/sources  ?id= remove
```

```
POST /api/admin/login   { password }  sets the session cookie
DELETE /api/admin/login               clears it
```

## How categorisation works

Title hits count double, because the headline is the most reliable signal.
Publisher `<category>` tags add 5 points each, so a Yahoo story tagged `NBA`
files as basketball even when the copy mentions a football club. A section feed
(`bbc-football`) provides a default when nothing scores high.

`african` and `uganda` are **regional**, not sports. An African football story
keeps its sport category and carries `region = 'africa'`, so it appears in both
Football and African Sports rather than displacing one another.

### A bug worth understanding

In a `|`-separated regex, `\b` anchors only the **first and last** alternative:

```js
/\bserve|ace|break point|seeded\b/i   // "ace" is NOT anchored
```

That rule was meant to catch a tennis ace. Because `ace` was unanchored it also
fired on *r**ace***, *pl**ace***, *p**ace*** and *sp**ace***, giving tennis a
score of 8 and beating motorsport's 6. A NASCAR headline titled *"entry list
for O'Reilly **race** at Las Vegas"* was filed under Tennis.

It was not a one-off: 50 of 973 articles were wrong, and every one of them had
a keyword hiding inside a longer word. The same defect put cricket and rugby
matches under tennis, because *"bowl**ing***" and *"try**ed***" both matched.
The fix is to anchor every alternative, and `npm test` now includes trap cases
("Space Force satellite", "Committee to determine outcome") that fail if the
unanchored form ever returns.

Note that a *trailing* `\b` is enough for a prefix word (`\bgoals?\b`), so the
`\b...s?\b` style is preferred over `\bgoal|...`.

## Tuning rules

Each rule file explains *why* it looks the way it does, because the tuning is
where the real work is:

- `src/lib/categorize.ts` — sport keyword weights and publisher-tag mapping
- `src/lib/entities.ts` — team and player patterns, transfer detection
- `src/lib/rss.ts` — parser behaviour per publisher shape

After changing a heuristic, run `npm run reflag` to bring stored rows in line,
and `npm test` to check the transfer and classification cases. `reflag`
recomputes category, region and transfer status for every stored article and
prints what moved, so a rule change can be checked rather than trusted.

### Transfer detection

Transfer intent uses three independent signals so no single word can satisfy
the whole test. Two earlier attempts produced real misclassifications and
shaped the current design:

1. Treating `contract` as both the trigger and its own supporting context
   flagged cricket stories whose only mention was the end of a contract.
2. Treating every motion verb as a transfer flagged tournament stories such as
   *"US complete thrilling comeback"*, *"Irish Open moved"* and *"Great Britain
   exit Billie Jean King Cup"*, where nobody changed club.

So `STRONG` words mean a player genuinely changed hands, while `WEAK` words
(`moved`, `exit`, `completes`, `clinches`) need money or contract wording to
corroborate them. `npm test` runs 18 labelled cases covering both directions.

## Sources

34 feeds ship enabled, all verified as returning valid XML with fresh items:

BBC Sport (13 sections) · Sky Sports (3) · The Guardian (6) · Independent ·
ESPNcricinfo · Yahoo Sports · CBS Sports · Hindustan Times · CyclingNews ·
Runner's World · SwimSwam

**Deliberately excluded, and why:**

- **ESPN** — every `espn.com/espn/rss/*` endpoint returns HTTP 202 with an
  empty body. That is a bot challenge, not a feed.
- **Reuters, AP, The Athletic** — no public sports feed; commercial licence.
- **CNBC, UPI, ABC (AU)** — initially added and then removed after inspecting
  the items. Their "sports" URLs serve general news: CNBC's feed returned
  *Beijing warns of retaliation*, UPI returned *Florida executes 77-year-old
  man*, ABC's returned *Mammoth effort to remove whale carcass*. All three
  paths returned HTTP 200 with plausible-looking XML, so a status-code check
  alone would have shipped them.

Add or remove feeds from `/admin`, or edit `src/lib/sources.ts`. `npm run
check:feeds` reports HTTP status, item count, newest-item age and whether the
body is really XML.

## Copyright

SportWorld stores **headlines and short summaries only**. It never copies
article bodies, and every story links back to the publisher, who holds the
copyright. Images are the publisher's own feed thumbnails, displayed with a
visible credit and linked to the source. Outbound links carry
`rel="noopener noreferrer nofollow"`.

## Moving to Supabase

SQLite is a single file at `data/sportworld.db` and is the right choice for one
process on one machine. To move to Postgres when you outgrow it, all database
access is funnelled through `src/lib/db.ts` — `queryArticles`, `saveArticle`,
`getStats`, `getSources` and the rest. Reimplement those functions against
`@supabase/supabase-js` and nothing above the data layer changes.

Run `CREATE TABLE` with the same columns in `SCHEMA` in `src/lib/db.ts`. The
`articles` table is the only one that grows.

## Troubleshooting

**`An Application Control policy has blocked this file` during builds.** Your
Windows policy blocks Next's native SWC binary, so Next falls back to the WASM
compiler. Builds still succeed, roughly 2–3× slower. To silence it, either
allow-list `node_modules\@next\swc-win32-x64-msvc\next-swc.win32-x64-msvc.node`
in your endpoint protection, or delete the package and let Next use WASM
permanently.

**A feed shows as failing.** Run `npm run inspect:feeds <id>` to see what it is
actually returning. Publishers change URLs and block unknown user agents
regularly; the usual cause is a URL that now 404s.

**Scores are empty.** Expected. RSS carries no fixture data. Implement
`fetchScores()` in `src/lib/scores.ts`; `/scores` documents the exact shape
and suggests TheSportsDB, which needs no API key.

**Nothing updates.** No scheduler is running. Check `/api/stats` for the last
ingest time, or run `npm run ingest` manually.

**`/admin` says "Not configured".** `ADMIN_PASSWORD` is unset. Copy
`.env.example` to `.env`, set a password of at least 8 characters, and restart.

**`/admin` bounces back to the login page.** The session expired (they last 12
hours) or the cookie was not set. Check that you are on `http://localhost` in
development — the cookie is marked `Secure` in production only, so plain local
http still works.

**401 from an API route.** Write routes need either an admin session or
`Authorization: Bearer $CRON_SECRET`. A scheduled job cannot hold a cookie, so
it must send the header.
