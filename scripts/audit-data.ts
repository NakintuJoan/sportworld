import { getDb, getStats, getPopularTeams, queryArticles } from "../src/lib/db";

const db = getDb();
const total = getStats();

console.log(`total=${total.total} last1h=${total.last1h} last24h=${total.last24h} transfers=${total.transfers}`);
console.log(`images: ${(db.prepare("SELECT COUNT(*) n FROM articles WHERE image IS NOT NULL AND image != ''").get() as { n: number }).n}`);
console.log(`teams extracted: ${(db.prepare("SELECT COUNT(*) n FROM articles WHERE teams != '[]'").get() as { n: number }).n}`);
console.log(`players extracted: ${(db.prepare("SELECT COUNT(*) n FROM articles WHERE players != '[]'").get() as { n: number }).n}`);
console.log(`with summary: ${(db.prepare("SELECT COUNT(*) n FROM articles WHERE summary != ''").get() as { n: number }).n}`);
console.log(`uganda region: ${(db.prepare("SELECT COUNT(*) n FROM articles WHERE region='uganda'").get() as { n: number }).n}`);
console.log(`africa region: ${(db.prepare("SELECT COUNT(*) n FROM articles WHERE region='africa'").get() as { n: number }).n}`);

console.log("\n--- top teams ---");
console.log(getPopularTeams(18).map((t) => `${t.team}(${t.count})`).join(", "));

console.log("\n--- 8 newest with image+teams ---");
for (const a of queryArticles({ limit: 8, sort: "latest" })) {
  console.log(`[${a.category}/${a.region}] ${a.title}`);
  console.log(`   src=${a.source_name} img=${a.image ? "Y" : "N"} teams=${a.teams.join("|") || "-"} transfer=${a.is_transfer}`);
  console.log(`   sum=${(a.summary || "(none)").slice(0, 110)}`);
}

console.log("\n--- 6 trending ---");
for (const a of queryArticles({ limit: 6, sort: "trending" })) {
  console.log(`${a.score.toFixed(2)} [${a.category}] ${a.title.slice(0, 90)}`);
}

console.log("\n--- sample 'other' bucket (check for mis-categorisation) ---");
for (const a of queryArticles({ category: "other", limit: 10 })) {
  console.log(`[${a.source_name}] ${a.title.slice(0, 100)}`);
}
