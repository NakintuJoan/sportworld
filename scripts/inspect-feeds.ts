import { parseFeed } from "../src/lib/rss";
import { SOURCE_SEEDS } from "../src/lib/sources";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const targets = process.argv.slice(2);
const list = targets.length
  ? SOURCE_SEEDS.filter((s) => targets.some((t) => s.id.includes(t)))
  : SOURCE_SEEDS;

for (const seed of list) {
  try {
    const res = await fetch(seed.url, {
      headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(15000),
    });
    const items = parseFeed(await res.text());
    console.log("=".repeat(100));
    console.log(`${seed.id}  [default=${seed.defaultCategory}]  items=${items.length}`);
    for (const item of items.slice(0, 4)) {
      console.log(`  - ${item.title.slice(0, 95)}`);
      console.log(`    cats=[${item.categories.slice(0, 4).join(", ")}]  descLen=${item.description.length} contentLen=${item.content.length} img=${item.image ? "Y" : "N"}`);
      if (item.content) console.log(`    contentHead: ${item.content.slice(0, 130)}`);
    }
  } catch (e) {
    console.log(`${seed.id} FAILED: ${(e as Error).message}`);
  }
}
