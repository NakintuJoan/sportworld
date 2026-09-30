import { SOURCE_SEEDS } from "../src/lib/sources";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("-"));

type FeedResult = {
  id: string;
  name: string;
  status: number | string;
  count: number;
  isXml: boolean;
  ageHours: number;
  ms: number;
  error?: string;
};

const results: FeedResult[] = await Promise.all(
  SOURCE_SEEDS.map(async (seed): Promise<FeedResult> => {
    const started = Date.now();
    try {
      const response = await fetch(seed.url, {
        headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      const count = (text.match(/<item[\s>]/gi) || []).length + (text.match(/<entry[\s>]/gi) || []).length;
      const isXml = /<(rss|feed)\b/i.test(text.slice(0, 2000));
      const ages = [...text.matchAll(/<(?:pubDate|published|updated)>([^<]+)</gi)]
        .map((m) => new Date(m[1].trim().replace(/\s+(BST|GMT|UTC)$/i, " +0000")).getTime())
        .filter((t) => Number.isFinite(t));
      const newest = ages.length ? new Date(Math.max(...ages)) : null;
      const ageHours = newest ? (Date.now() - newest.getTime()) / 3_600_000 : NaN;
      return { ...seed, status: response.status, count, isXml, ageHours, ms: Date.now() - started };
    } catch (error) {
      return {
        ...seed,
        status: "ERR",
        count: 0,
        isXml: false,
        ageHours: NaN,
        ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })
);

const filtered = only ? results.filter((r) => r.id.includes(only) || r.name.toLowerCase().includes(only.toLowerCase())) : results;

console.log("status  items  newest  ms    source");
for (const r of filtered) {
  const ok = r.status === 200 && r.isXml && r.count > 0 && r.ageHours < 168;
  console.log(
    `${ok ? "OK  " : "WARN"} ${String(r.status).padEnd(6)} ${String(r.count).padStart(5)} ${isNaN(r.ageHours) ? "   n/a" : `${r.ageHours.toFixed(1)}h`.padStart(6)} ${String(r.ms).padStart(5)}  ${r.name}${r.error ? `  [${r.error}]` : ""}`
  );
}

const healthy = filtered.filter((r) => r.status === 200 && r.isXml && r.count > 0 && r.ageHours < 168);
console.log(`\n${healthy.length}/${filtered.length} sources healthy (HTTP 200, valid XML, fresh items)`);
