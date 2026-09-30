import type { CategorySlug } from "./categories";

type Rule = {
  category: CategorySlug;
  weight: number;
  patterns: RegExp[];
};

/**
 * Ordered by specificity. Football terms are checked before the generic
 * "sport" bucket, and cricket/rugby words beat formula1 so that, for example,
 * "Cricket Club" in a football transfer story does not steal the story.
 */
const RULES: Rule[] = [
  {
    category: "cricket",
    weight: 3,
    patterns: [
      /\bcricket\b/i,
      /\btest match\b/i,
      /\bODI\b/i,
      /\bT20\b/i,
      /\bICC\b/i,
      /\bAshes\b/i,
      /\bwickets?\b/i,
      /\bbatting\b|\bbowling\b|\bbowler\b|\bbatsman\b|\bbatters?\b/i,
      /\binnings?\b/i,
      /\bruns?\b.*\b(?:overs?|wicket)/i,
      /\bCounty Championship\b/i,
      /\bIPL\b|\bBBL\b|\bThe Hundred\b/i,
    ],
  },
  {
    category: "rugby",
    weight: 3,
    patterns: [
      /\brugby\b/i,
      /\bSix Nations\b/i,
      /\bRugby World Cup\b/i,
      /\bPremiership (?:rugby|union)\b/i,
      /\bSuper Rugby\b/i,
      /\bscrum\b/i,
      /\btry\b.*\b(?:line|scored|scorer)/i,
      /\bHarlequins\b|\bUlster\b|\bSaracens\b|\bLeicester Tigers\b|\bExeter Chiefs\b|\bLions XV\b/i,
    ],
  },
  {
    category: "formula1",
    weight: 4,
    patterns: [
      /\bFormula ?1\b/i,
      /\bFormula One\b/i,
      /\bF1\b/i,
      /\bGrand Prix\b/i,
      /\bMcLaren\b|\bRed Bull\b|\bFerrari\b|\bMercedes(?:-AMG)?\b|\bAston Martin\b/i,
      /\bMax Verstappen\b/i,
      /\bpit lane\b/i,
      /\bqualifying\b.*\b(?:session|pole)\b/i,
    ],
  },
  {
    category: "motorsport",
    weight: 3,
    patterns: [
      /\bMotoGP\b/i,
      /\bNASCAR\b/i,
      /\bIndyCar\b/i,
      /\bWRC\b/i,
      /\bWorld Rally Championship\b/i,
      /\bWEC\b|\bACO\b|\bendurance racing\b/i,
      /\bLe Mans\b/i,
      /\bNürburgring\b|\bNurburgring\b/i,
      /\bSilverstone\b/i,
      /\bBTCC\b|\bFormula E\b|\bF2\b|\bMoto2\b/i,
    ],
  },
  {
    category: "golf",
    weight: 4,
    patterns: [
      /\bgolf\b/i,
      /\bMasters\b(?!.*athletics)/i,
      /\bRory McIlroy\b/i,
      /\bPGA Tour\b/i,
      /\bLPGA\b/i,
      /\bRyder Cup\b/i,
      /\bRyder\b/i,
      /\bOpen Championship\b/i,
      /\bUS Open\b.*\b(?:golf|threesome|par)/i,
      /\bputts?\b|\bputting\b|\bbirdies?\b|\bbogeys?\b|\btee time\b/i,
    ],
  },
  {
    category: "tennis",
    weight: 4,
    patterns: [
      /\btennis\b/i,
      /\bWimbledon\b/i,
      /\bUS Open\b(?!.*golf)/i,
      /\bAustralian Open\b/i,
      /\bFrench Open\b|Roland Garros\b/i,
      /\bATP\b|\bWTA\b/i,
      /\bGrand Slam\b/i,
      /\bNovak Djokovic\b/i,
      /\bCarlos Alcaraz\b/i,
      /\bIga Swiatek\b/i,
      /\bserves?\b|\baces?\b|\bbreak points?\b|\bseeded\b/i,
    ],
  },
  {
    category: "football",
    weight: 3,
    patterns: [
      /\bfootball\b/i,
      /\bsoccer\b/i,
      /\bPremier League\b/i,
      /\bChampions League\b/i,
      /\bEuropa League\b/i,
      /\bWorld Cup\b/i,
      /\bLa Liga\b|\bBundesliga\b|\bSerie A\b|\bLigue 1\b/i,
      /\bEredivisie\b|\bPrimeira Liga\b/i,
      /\bMLS\b/i,
      /\bCopa (?:America|Europa|Libertadores)\b/i,
      /\bgoals?\b|\boffside\b|\bmidfielders?\b|\bstrikers?\b|\bgoalkeepers?\b|\bpenalt(?:y|ies)\b/i,
      /\btransfer\b|\btransfer window\b|\bsigning\b/i,
      /\bArteta\b|\bTuchel\b|\bSalah\b|\bHaaland\b|\bBellingham\b|\bVinicius\b/i,
      /\bManchester (?:United|City)\b|\bArsenal\b|\bChelsea\b|\bLiverpool\b|\bTottenham\b/i,
      /\bReal Madrid\b|\bBarcelona\b|\bAtletico Madrid\b/i,
      /\bJuventus\b|\bInter Milan\b|\bBayern (?:Munich|Munchen)\b/i,
    ],
  },
  {
    category: "basketball",
    weight: 3,
    patterns: [
      /\bbasketball\b/i,
      /\bNBA\b/i,
      /\bWNBA\b/i,
      /\bEuroLeague\b/i,
      /\bFIBA\b/i,
      /\bLeBron James\b|\bStephen Curry\b|\bNikola Jokic\b|\bKevin Durant\b/i,
      /\btriple-double\b/i,
      /\bdunk\b/i,
    ],
  },
  {
    category: "hockey",
    weight: 3,
    patterns: [
      /\bhockey\b/i,
      /\bNHL\b/i,
      /\bice hockey\b/i,
      /\bStanley Cup\b/i,
      /\bMaple Leafs\b|\bBruins\b|\bPenguins\b|\bBlackhawks\b/i,
    ],
  },
  {
    category: "baseball",
    weight: 3,
    patterns: [
      /\bbaseball\b/i,
      /\bMLB\b/i,
      /\bWorld Series\b/i,
      /\bLittle League\b|\bWorld Baseball Classic\b/i,
      /\bno-hitter|\bno hitter\b|\bhomer(?:s|un)?\b|\bhome run\b/i,
      /\binnings?\b.*\b(?:pitcher|batter|dugout|bullpen|ballpark)\b/i,
      /\bbatting order\b|\bpitching staff\b|\bcloser\b/i,
      /\bYankees\b|\bRed Sox\b|\bDodgers\b|\bCubs\b|\bMets\b|\bAstros\b|\bBraves\b|\bPhillies\b|\bPadres\b/i,
    ],
  },
  {
    category: "americanfootball",
    weight: 3,
    patterns: [
      /\bNFL\b/i,
      /\bAmerican football\b/i,
      /\bSuper Bowl\b/i,
      /\bquarterbacks?\b/i,
      /\blinebackers?\b|\bwide receivers?\b|\bcornerbacks?\b/i,
      /\bEagles\b|\bBears\b|\bCowboys\b|\bPackers\b|\bChiefs\b|\b49ers\b|\bRavens\b|\bSteelers\b|\bPatriots\b|\bLions\b/i,
    ],
  },
  {
    category: "boxing",
    weight: 4,
    patterns: [
      /\bboxing\b/i,
      /\bTyson Fury\b|\bAnthony Joshua\b|\bMuhammad Ali\b/i,
      /\bheavyweight\b/i,
      /\bbout\b.*\b(?:fight|boxing|round)\b/i,
      /\bknockouts?\b|\bKO\b/i,
      /\bfight night\b/i,
      /\bUsyk\b|\bFury\b|\bJoshua\b|\bWaliyah\b/i,
    ],
  },
  {
    category: "mma",
    weight: 4,
    patterns: [
      /\bMMA\b/i,
      /\bUFC\b/i,
      /\bmixed martial arts\b/i,
      /\bJon Jones\b|\bConor McGregor\b|\bIsrael Adesanya\b/i,
      /\boctagon\b/i,
      /\bjiu-jitsu|\bjiu jitsu\b|\btakedown\b/i,
    ],
  },
  {
    category: "cycling",
    weight: 4,
    patterns: [
      /\bcycling\b/i,
      /\bTour de France\b/i,
      /\bGiro d'Italia\b/i,
      /\bVuelta\b/i,
      /\bGrand Tour\b/i,
      /\bpeloton\b/i,
      /\bTadej Pogacar\b|\bEgan Bernal\b|\bVingegaard\b/i,
      /\bTour of (?:Britain|Spain|Italy|Oman)\b/i,
    ],
  },
  {
    category: "athletics",
    weight: 3,
    patterns: [
      /\bathletics\b/i,
      /\bmarathon\b/i,
      /\b100m\b|\b200m\b|\b400m\b/i,
      /\bOlympics?\b/i,
      /\bsprint\b/i,
      /\bMo Farah\b/i,
      /\bSebastian Coe\b/i,
      /\btriathlon\b|\bIronman\b/i,
      /\btrack and field\b/i,
    ],
  },
  {
    category: "swimming",
    weight: 3,
    patterns: [
      /\bswimming\b/i,
      /\bOlympic pool\b/i,
      /\bbutterfly\b|\bbackstroke\b|\bfreestyle\b|\bbreaststroke\b/i,
      /\bOpen water\b/i,
      /\bAdam Peaty\b/i,
    ],
  },
  {
    category: "volleyball",
    weight: 3,
    patterns: [
      /\bvolleyball\b/i,
      /\bbeach volleyball\b/i,
      /\bVNL\b|\bVolleyball Nations League\b/i,
    ],
  },
];

/**
 * Publisher-supplied <category> tags are the most reliable signal when present.
 * Yahoo in particular tags every story with the league and often the players
 * involved, so these get a heavier weight than a passing mention in the body.
 */
const FEED_CATEGORY_TOKENS: Array<[CategorySlug, RegExp]> = [
  ["basketball", /\bNBA\b|\bWNBA\b|\bEuroLeague\b|\bFIBA\b|\bCollege Basketball\b/i],
  ["hockey", /\bNHL\b|\bNHL Playoffs\b|\bIce Hockey\b/i],
  ["football", /\bPremier League\b|\bChampions League\b|\bSoccer\b|\bFootball\b|\bLa Liga\b|\bSerie A\b|\bBundesliga\b|\bMLS\b|\bNWSL\b|\bEredivisie\b/i],
  ["americanfootball", /\bNFL\b|\bAmerican Football\b|\bCollege Football\b|\bNCAA\b|\bSuper Bowl\b|\bFantasy Football\b/i],
  ["baseball", /\bMLB\b|\bBaseball\b|\bWorld Series\b|\bCollege Baseball\b|\bLittle League\b/i],
  ["cricket", /\bCricket\b|\bIPL\b|\bAshes\b|\bTest Cricket\b|\bT20\b/i],
  ["tennis", /\bTennis\b|\bATP\b|\bWTA\b|\bWimbledon\b|\bGrand Slam\b|\bLaver Cup\b|\bUS Open\b/i],
  ["golf", /\bGolf\b|\bPGA\b|\bLPGA\b|\bRyder Cup\b|\bPresidents Cup\b|\bThe Open\b/i],
  ["formula1", /\bFormula 1\b|\bFormula One\b|\bF1\b|\bGrand Prix\b/i],
  ["motorsport", /\bNASCAR\b|\bMotoGP\b|\bIndyCar\b|\bWRC\b|\bRally\b|\bFormula E\b/i],
  ["boxing", /\bBoxing\b|\bHeavyweight\b|\bWelterweight\b/i],
  ["mma", /\bMMA\b|\bUFC\b|\bBellator\b/i],
  ["rugby", /\bRugby\b|\bSix Nations\b|\bPremiership Rugby\b|\bSuper Rugby\b|\bRugby League\b|\bRugby World Cup\b/i],
  ["cycling", /\bCycling\b|\bTour de France\b|\bGiro\b|\bVuelta\b|\bGrand Tour\b/i],
  ["athletics", /\bAthletics\b|\bMarathon\b|\bTrack and Field\b|\bTriathlon\b|\bIronman\b/i],
  ["swimming", /\bSwimming\b|\bSwim\b|\bOpen Water\b/i],
  ["volleyball", /\bVolleyball\b/i],
];

/** Region-aware terms. These can promote an article to a regional bucket. */
const AFRICA_TERMS =
  /\b(?:Nigeria|Ghana|Kenya|South Africa|Egypt|Morocco|Tunisia|Algeria|Senegal|Ivory Coast|Cote d.Ivoire|Cameroon|Ethiopia|Tanzania|Uganda|Zambia|Zimbabwe|Botswana|Angola|Mali|Namibia|Rwanda|Mauritius|Sierra Leone|Liberia|Gambia|Ghanaian|Nigerian|Kenyan|South African|Egyptian|Moroccan|Tunisian|Algerian|Senegalese|Ivorian|Cameroonian|Ethiopian|Tanzanian|Ugandan|Zambian|Zimbabwean|Botswanan|Angolan|Malian|Namibian|Rwandan|CAF\b|AFCON\b|African Cup of Nations|Africa Cup of Nations|Group Stage\b)/i;

const UGANDA_TERMS =
  /\b(?:Uganda|Ugandan|KCCA FC|Vipers SC|SC Villa|Express FC|MUFC|Kayunga|Okeech? ?B? ?M? ?Ss?i? ?ko|National Heroes|Lugazi|URA FC|Bunyaruguru|Kawooya|Mandela National Stadium|Namboole|CECAFA| FUFA\b|Villarreal\s*FC|Uganda Premier League|Ugandan Premier League)\b/i;

export type CategorizationInput = {
  title: string;
  summary: string;
  content: string;
  feedCategories: string[];
  defaultCategory: CategorySlug;
};

export type CategorizationResult = {
  category: CategorySlug;
  region: "global" | "africa" | "uganda";
};

/**
 * Scores keyword hits from title, summary and feed-provided categories.
 * The title carries extra weight because it is the most reliable signal.
 */
export function categorize(input: CategorizationInput): CategorizationResult {
  const { title, summary, feedCategories } = input;
  const titleText = title.toLowerCase();
  const bodyText = `${summary} ${input.content}`.slice(0, 4000).toLowerCase();
  const feedText = feedCategories.join(" ").toLowerCase();

  const scores = new Map<CategorySlug, number>();
  for (const rule of RULES) {
    let score = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(titleText)) score += rule.weight * 2;
      else if (pattern.test(bodyText)) score += rule.weight;
    }
    if (score > 0) scores.set(rule.category, score);
  }

  // Publisher tags outrank body text: a Yahoo story tagged "NBA" is basketball
  // even if the copy happens to mention a football club.
  for (const tag of feedCategories) {
    for (const [category, pattern] of FEED_CATEGORY_TOKENS) {
      if (pattern.test(tag)) {
        scores.set(category, (scores.get(category) ?? 0) + 5);
      }
    }
  }

  const haystack = `${titleText} ${bodyText} ${feedText}`;

  // Regional promotion: an African story stays a top-level sport, but the
  // regional pages read from a dedicated field so they can surface it.
  const isUganda = UGANDA_TERMS.test(haystack);
  const isAfrica = AFRICA_TERMS.test(haystack);
  const region: CategorizationResult["region"] = isUganda ? "uganda" : isAfrica ? "africa" : "global";

  // If the feed already declares a specific sport and no keyword outscored it,
  // trust the feed. Feed categories often use publisher-specific slugs.
  const bestFromKeywords = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestFromKeywords && bestFromKeywords[1] >= 6) {
    return { category: bestFromKeywords[0], region };
  }
  if (input.defaultCategory !== "other") {
    return { category: input.defaultCategory, region };
  }
  return { category: bestFromKeywords ? bestFromKeywords[0] : "other", region };
}
