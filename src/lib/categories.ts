export type CategorySlug =
  | "football"
  | "basketball"
  | "cricket"
  | "tennis"
  | "formula1"
  | "boxing"
  | "rugby"
  | "athletics"
  | "swimming"
  | "cycling"
  | "golf"
  | "hockey"
  | "baseball"
  | "americanfootball"
  | "motorsport"
  | "mma"
  | "volleyball"
  | "african"
  | "uganda"
  | "other";

export type Category = {
  slug: CategorySlug;
  label: string;
  emoji: string;
  /** Short description used on category pages. */
  blurb: string;
};

export const CATEGORIES: Category[] = [
  { slug: "football", label: "Football", emoji: "⚽", blurb: "Everything from the Premier League to the World Cup." },
  { slug: "basketball", label: "Basketball", emoji: "🏀", blurb: "NBA, EuroLeague, international and college hoops." },
  { slug: "cricket", label: "Cricket", emoji: "🏏", blurb: "Test, ODI and T20 international cricket." },
  { slug: "tennis", label: "Tennis", emoji: "🎾", blurb: "Grand Slams, ATP, WTA and Tour events." },
  { slug: "formula1", label: "Formula 1", emoji: "🏎️", blurb: "Race weekends, transfers, results and analysis." },
  { slug: "boxing", label: "Boxing", emoji: "🥊", blurb: "Titles, fights, results and fight-week coverage." },
  { slug: "rugby", label: "Rugby", emoji: "🏉", blurb: "Six Nations, Rugby World Cup, Premiership and Super Rugby." },
  { slug: "athletics", label: "Athletics", emoji: "🏃", blurb: "Track and field, marathons and multi-event meets." },
  { slug: "swimming", label: "Swimming", emoji: "🏊", blurb: "Pools, open water and records." },
  { slug: "cycling", label: "Cycling", emoji: "🚴", blurb: "Tour de France, Giro, Vuelta and road racing." },
  { slug: "golf", label: "Golf", emoji: "🏌️", blurb: "Majors, PGA Tour, DP World Tour and Lions." },
  { slug: "hockey", label: "Hockey", emoji: "🏒", blurb: "NHL, international hockey and Premier League." },
  { slug: "baseball", label: "Baseball", emoji: "⚾", blurb: "MLB, World Series, playoffs and college baseball." },
  { slug: "americanfootball", label: "NFL", emoji: "🏈", blurb: "NFL, college football and the Super Bowl." },
  { slug: "motorsport", label: "Motorsport", emoji: "🏁", blurb: "IndyCar, NASCAR, MotoGP, WRC and endurance." },
  { slug: "mma", label: "MMA", emoji: "🥋", blurb: "UFC and the biggest names in combat sports." },
  { slug: "volleyball", label: "Volleyball", emoji: "🏐", blurb: "Indoor, beach and national team volleyball." },
  { slug: "african", label: "African Sports", emoji: "🌍", blurb: "Sport from across the African continent." },
  { slug: "uganda", label: "Uganda Sports", emoji: "🇺🇬", blurb: "Ugandan leagues, national teams and athletes." },
  { slug: "other", label: "More Sport", emoji: "🏅", blurb: "Everything else worth following." },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): Category {
  return BY_SLUG.get(slug as CategorySlug) ?? BY_SLUG.get("other")!;
}

export function isCategorySlug(value: string): value is CategorySlug {
  return BY_SLUG.has(value as CategorySlug);
}

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
