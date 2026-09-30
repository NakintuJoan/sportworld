import { getDb } from "../src/lib/db";
import { isTransferStory } from "../src/lib/entities";
import { categorize } from "../src/lib/categorize";
import type { CategorySlug } from "../src/lib/categories";

/**
 * Re-applies classification to articles already in the database.
 *
 * Ingest only evaluates copy for stories it has not seen before, so after
 * tuning a rule in `categorize.ts` or `entities.ts` the stored rows still
 * carry the old verdict. This walks every row and recomputes category, region
 * and transfer status from the same inputs the ingest pipeline used:
 * title, summary, the publisher's own `<category>` tags (`articles.tags`) and
 * the source's default category (`sources.default_category`).
 *
 * Only rows whose verdict actually changes are written, and the report shows
 * what moved so a rule change can be sanity-checked rather than trusted.
 */

type Row = {
  id: number;
  title: string;
  summary: string;
  content: string | null;
  tags: string;
  category: string;
  region: string;
  is_transfer: number;
  default_category: string;
};

const database = getDb();

const rows = database
  .prepare(
    `SELECT a.id, a.title, a.summary, a.content, a.tags, a.category, a.region,
            a.is_transfer, COALESCE(s.default_category, 'other') AS default_category
       FROM articles a
       LEFT JOIN sources s ON s.id = a.source_id
      ORDER BY a.id`,
  )
  .all() as Row[];

const update = database.prepare(
  "UPDATE articles SET category = ?, region = ?, is_transfer = ? WHERE id = ?",
);

let categoryMoved = 0;
let transferMoved = 0;
const categorySamples: string[] = [];
const transferSamples: string[] = [];
const moved: Record<string, number> = {};

for (const row of rows) {
  const classification = categorize({
    title: row.title,
    summary: row.summary,
    content: row.content ?? "",
    feedCategories: safeParse(row.tags),
    defaultCategory: row.default_category as CategorySlug,
  });

  const nextTransfer = isTransferStory(row.title, row.summary) ? 1 : 0;
  const categoryChanged = classification.category !== row.category || classification.region !== row.region;
  const transferChanged = nextTransfer !== row.is_transfer;

  if (!categoryChanged && !transferChanged) continue;

  update.run(classification.category, classification.region, nextTransfer, row.id);

  if (categoryChanged) {
    categoryMoved += 1;
    const key = `${row.category} -> ${classification.category}`;
    moved[key] = (moved[key] ?? 0) + 1;
    if (categorySamples.length < 12) {
      categorySamples.push(`${row.category} -> ${classification.category}  ${row.title.slice(0, 62)}`);
    }
  }
  if (transferChanged) {
    transferMoved += 1;
    const label = nextTransfer ? "+" : "-";
    if (transferSamples.length < 12) transferSamples.push(`${label} ${row.title.slice(0, 78)}`);
  }
}

function safeParse(value: string): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const transfers = (database.prepare("SELECT COUNT(*) AS n FROM articles WHERE is_transfer = 1").get() as { n: number }).n;

console.log(`scanned ${rows.length} articles`);
console.log(`category/region changed: ${categoryMoved}`);
console.log(`transfer flag changed:  ${transferMoved}`);
console.log(`now ${transfers} transfer stories of ${rows.length} (${((transfers / rows.length) * 100).toFixed(1)}%)`);

const byCategory = database
  .prepare("SELECT category, COUNT(*) AS n FROM articles GROUP BY category ORDER BY n DESC")
  .all() as Array<{ category: string; n: number }>;
console.log("\ncategory spread:");
for (const row of byCategory) console.log(`  ${row.category.padEnd(14)} ${row.n}`);

if (Object.keys(moved).length > 0) {
  console.log("\nlargest category moves:");
  for (const [key, n] of Object.entries(moved).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(4)}  ${key}`);
  }
}
if (categorySamples.length > 0) {
  console.log("\nsample category changes:");
  for (const line of categorySamples) console.log(`  - ${line}`);
}
if (transferSamples.length > 0) {
  console.log("\nsample transfer changes:");
  for (const line of transferSamples) console.log(`  ${line}`);
}
