import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/sportworld.db");
const all = (sql: string) => db.prepare(sql).all() as Array<Record<string, unknown>>;
const pad = (n: unknown, w = 4) => String(n).padStart(w);

console.log("=== region split ===");
for (const r of all("SELECT region, COUNT(*) n FROM articles GROUP BY region ORDER BY n DESC")) {
  console.log(`   ${String(r.region).padEnd(9)} ${pad(r.n)}`);
}

console.log("\n=== african-category articles, by source ===");
for (const r of all(
  "SELECT s.name, s.region, COUNT(*) n FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.category = 'african' GROUP BY s.id ORDER BY n DESC"
)) {
  console.log(`   ${pad(r.n)} ${r.name} [${r.region}]`);
}

console.log("\n=== uganda-region articles, by source ===");
for (const r of all(
  "SELECT s.name, COUNT(*) n FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.region = 'uganda' GROUP BY s.id ORDER BY n DESC"
)) {
  console.log(`   ${pad(r.n)} ${r.name}`);
}

console.log("\n=== african category: newest headlines ===");
for (const r of all(
  "SELECT title, s.name FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.category = 'african' ORDER BY a.published_at DESC LIMIT 10"
)) {
  console.log(`   - ${String(r.title).slice(0, 80)}  <${r.name}>`);
}

console.log("\n=== uganda region: newest headlines ===");
for (const r of all(
  "SELECT title, s.name FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.region = 'uganda' ORDER BY a.published_at DESC LIMIT 10"
)) {
  console.log(`   - ${String(r.title).slice(0, 80)}  <${r.name}>`);
}

console.log("\n=== how much is still general (non-sport) African news? ===");
for (const r of all(
  "SELECT category, COUNT(*) n FROM articles WHERE region IN ('uganda','africa') GROUP BY category ORDER BY n DESC"
)) {
  console.log(`   ${String(r.category).padEnd(16)} ${pad(r.n)}`);
}
