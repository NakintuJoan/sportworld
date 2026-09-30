import { categorize } from "../src/lib/categorize";
import { isTransferStory } from "../src/lib/entities";

/**
 * Guards against one specific bug class: a `\b` at the start and end of a
 * `|`-separated regex only anchors the FIRST and LAST alternative. Every
 * alternative in the middle silently becomes a substring match, so a rule
 * meant to catch "ace" also fires on "race", "place" and "pace", and a rule
 * meant to catch "terms" fires on "determine".
 *
 * The trap cases below are ordinary words that contain a keyword as a
 * substring. They must not steer classification or transfer detection.
 */

type Expected = { category?: string; transfer?: boolean };

const CASES: Array<{ title: string; summary: string; tags?: string[]; want: Expected }> = [
  // --- substring traps: the keyword is present only inside a larger word ---
  {
    title: "NASCAR entry list for O'Reilly race at Las Vegas in 2026 Chase",
    summary: "Check out the NASCAR O'Reilly Series entry list for the 2026 Focused Health 302 at Las Vegas Motor Speedway, including the most notable drivers!",
    tags: ["motor", "sports"],
    want: { category: "motorsport", transfer: false },
  },
  {
    title: "Space Force satellite launch scrubbed again",
    summary: "The rocket was delayed because of weather at the range.",
    want: { category: "other", transfer: false },
  },
  {
    title: "Australia pace bowler puts on improved display",
    summary: "The bowler took three wickets in the second innings.",
    tags: ["cricket"],
    want: { category: "cricket", transfer: false },
  },
  {
    title: "Committee to determine outcome of disputed final",
    summary: "Officials said a decision would follow shortly.",
    want: { category: "other", transfer: false },
  },
  {
    title: "Coach praises improved defensive shape",
    summary: "The side looked far better organised at the back.",
    want: { category: "other", transfer: false },
  },

  // --- publisher tags must still win over incidental body words ---
  {
    title: "Heat news: Nikola Jovic admits having to 'grow up' after frustrating season",
    summary: "With the Miami Heat almost back in action, as a new era is on the horizon.",
    tags: ["Erik Spoelstra", "Nikola Jovic", "Giannis Antetokounmpo", "NBA"],
    want: { category: "basketball", transfer: false },
  },
  {
    title: "Bruins beat Maple Leafs in overtime thriller",
    summary: "A late deflection decided it at the TD Garden.",
    tags: ["NHL"],
    want: { category: "hockey", transfer: false },
  },

  // --- genuine sport keywords must not be over-restricted by the fix ---
  {
    title: "Federer serves an ace to seal Wimbledon final",
    summary: "The Swiss maestro reached yet another final at the All England Club.",
    want: { category: "tennis", transfer: false },
  },
  {
    title: "Rory McIlroy birdies the 18th to win the Masters",
    summary: "A brilliant putt sealed the green jacket.",
    want: { category: "golf", transfer: false },
  },
  {
    title: "England's bowlers take five wickets in the second innings",
    summary: "The innings ended with 40 runs remaining.",
    want: { category: "cricket", transfer: false },
  },
  {
    title: "McLaren take pole as Ferrari lock out front row",
    summary: "Qualifying was disrupted by a red flag in Q2.",
    want: { category: "formula1", transfer: false },
  },
  {
    title: "Saracens score a try as they beat Harlequins",
    summary: "The try came from the scrum five metres out.",
    want: { category: "rugby", transfer: false },
  },

  // --- the two sports that were missing from the category list entirely ---
  {
    title: "Aaron Judge injury update: why is the Yankees star not playing today",
    summary: "The slugger landed awkwardly during Friday night's win.",
    tags: ["MLB"],
    want: { category: "baseball", transfer: false },
  },
  {
    title: "Machado, Tatis power offense as Padres take Game 1",
    summary: "San Diego pushed the run to four in the seventh inning.",
    tags: ["MLB"],
    want: { category: "baseball", transfer: false },
  },
  {
    title: "What happened to Jalen Hurts? Eagles QB injury scare vs Bears",
    summary: "He left early with a shoulder knock but expects to play.",
    tags: ["NFL"],
    want: { category: "americanfootball", transfer: false },
  },
  {
    title: "Why is Tyson Bagent not starting vs Eagles? Bears QB1 explained",
    summary: "The coaching staff cited performance down the stretch.",
    tags: ["NFL"],
    want: { category: "americanfootball", transfer: false },
  },

  // --- NFL must no longer be pulled into the football bucket ---
  {
    title: "NFL commissioner meets with owners on calendar",
    summary: "The schedule debate continues.",
    tags: ["NFL"],
    want: { category: "americanfootball", transfer: false },
  },
  {
    title: "Soccer-Lamine nets double as Spain win again",
    summary: "England were beaten by a ten-man Czech Republic.",
    want: { category: "football", transfer: false },
  },

  // --- transfer detection must ignore substring traps ---
  {
    title: "Player's improved form rewarded with a new long-term deal",
    summary: "The club confirmed the terms on Thursday.",
    want: { transfer: false },
  },
];

let failures = 0;
let checked = 0;

for (const testCase of CASES) {
  const result = categorize({
    title: testCase.title,
    summary: testCase.summary,
    content: "",
    feedCategories: testCase.tags ?? [],
    defaultCategory: "other",
  });
  const transfer = isTransferStory(testCase.title, testCase.summary);

  const problems: string[] = [];
  if (testCase.want.category !== undefined && result.category !== testCase.want.category) {
    problems.push(`category ${result.category} != ${testCase.want.category}`);
  }
  if (testCase.want.transfer !== undefined && transfer !== testCase.want.transfer) {
    problems.push(`transfer ${transfer} != ${testCase.want.transfer}`);
  }

  checked++;
  if (problems.length > 0) failures++;
  const status = problems.length === 0 ? "PASS" : "FAIL";
  console.log(`${status}  [${result.category}] ${testCase.title.slice(0, 64)}`);
  for (const problem of problems) console.log(`        ${problem}`);
}

console.log(`\n${checked - failures}/${checked} classification cases pass`);
process.exit(failures === 0 ? 0 : 1);
