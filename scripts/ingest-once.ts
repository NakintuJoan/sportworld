import { runIngest } from "../src/lib/ingest";
import { getStats } from "../src/lib/db";

const args = new Set(process.argv.slice(2));
const sourceIndex = process.argv.indexOf("--source");
const sourceId = sourceIndex !== -1 ? process.argv[sourceIndex + 1] : undefined;

const report = await runIngest({ sourceId, force: args.has("--force") });
const failed = report.sources.filter((s) => s.status === "error");

console.log("\n=== Ingest run complete ===");
console.log(`duration      ${report.durationMs}ms`);
console.log(`feeds ok      ${report.sources.length - failed.length}/${report.sources.length}`);
console.log(`items parsed  ${report.parsed}`);
console.log(`new articles  ${report.inserted}`);
console.log(`updated       ${report.updated}`);
console.log(`duplicates    ${report.duplicates}`);
console.log(`pruned        ${report.pruned}`);

if (Object.keys(report.byCategory).length) {
  console.log("\nby category:");
  for (const [category, count] of Object.entries(report.byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category.padEnd(12)} ${count}`);
  }
}

if (failed.length) {
  console.log("\nfailing sources:");
  for (const source of failed) {
    console.log(`  ${source.name.padEnd(28)} ${source.error}`);
  }
}

const stats = getStats();
console.log(`\ndatabase now holds ${stats.total} articles (${stats.last1h} in the last hour, ${stats.last24h} in 24h)`);
