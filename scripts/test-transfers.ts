import { isTransferStory } from "../src/lib/entities";

/**
 * Labelled cases for the transfer heuristic. The "should match" cases come
 * from real headlines seen in the feeds; the "should not match" cases are the
 * false positives that earlier versions of this rule produced.
 */
const SHOULD_MATCH: [string, string][] = [
  ["£1.2bn on transfers with £830m inflated in accounts - Man City's 'asterisk era'", "BBC analyses Manchester City's dominance."],
  ["Harry Kane’s new contract at Bayern Munich set to be finalized right after international break", "The striker is expected to sign a long-term deal."],
  ["Chelsea agree to sign 19-year-old wonderkid from Ajax", "Blues have agreed a £35m fee."],
  ["Arsenal complete £60m signing of striker", "The Gunners have completed the move."],
  ["Barcelona bid £70m for Zanetti", "Barca are prepared to bid for the midfielder."],
  ["Liverpool loan winger with option to buy", "The deal includes a loan fee and an option to buy."],
  ["Man City sign £30m midfielder on free transfer", "The midfielder has signed a five-year contract."],
  ["Malcom completes move to Saudi side on loan", "He joined on a season-long loan deal."],
];

const SHOULD_NOT_MATCH: [string, string][] = [
  ["What next for Stokes after tumultuous summer?", "After concluding the county summer with Durham and the end of his England central contract, what is in store for Ben Stokes?"],
  ["US complete thrilling comeback to retain Presidents Cup", "The Americans rallied on the final day to win the Cup."],
  ["Irish Open moved as tour confirms 2027 schedule", "The tournament has moved to a new venue next season."],
  ["Great Britain exit Billie Jean King Cup after Czechia triumph", "Britain are through to the quarter-finals."],
  ["Play-off exit 'hurts' but Peet proud of Wigan side", "Wigan went out but the coach was proud."],
  ["Bath's Boxing Day game with Leicester moved back a day", "The fixture has been moved because of a clash."],
  ["Charlotte to host WTA Finals from 2027", "The finals will be played in Charlotte."],
  ["How do teams deal with longer international window?", "Federations are discussing the calendar."],
  ["Dodgers complete walk-off to take the series", "A walk-off single in the ninth sealed it."],
];

let failures = 0;

console.log("should match:");
for (const [title, summary] of SHOULD_MATCH) {
  const result = isTransferStory(title, summary);
  if (!result) failures++;
  console.log(`  ${result ? "PASS" : "FAIL"} ${title.slice(0, 76)}`);
}

console.log("\nshould not match:");
for (const [title, summary] of SHOULD_NOT_MATCH) {
  const result = isTransferStory(title, summary);
  if (result) failures++;
  console.log(`  ${result ? "FAIL" : "PASS"} ${title.slice(0, 76)}`);
}

console.log(`\n${failures === 0 ? "ALL TRANSFER CASES PASS" : `${failures} CASES FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
