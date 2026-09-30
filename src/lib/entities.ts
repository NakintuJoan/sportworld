const TEAM_PATTERNS: RegExp[] = [
  // Premier League / English football
  /\b(?:Manchester United|Man Utd|Man United)\b/gi,
  /\bManchester City\b/gi,
  /\b(?:Arsenal|Liverpool|Chelsea|Tottenham(?: Hotspur)?|Newcastle United|Everton|Aston Villa|West Ham United|Brighton(?: & Hove Albion)?|Crystal Palace|Bournemouth|Fulham|Wolves|Brentford|Nottingham Forest|Leicester City|Southampton|Ipswich Town|Burnley|Sunderland)\b/gi,
  // Rest of Europe
  /\bReal Madrid\b/gi,
  /\b(?:Barcelona|Barca|Barça)\b/gi,
  /\bAtletico Madrid\b/gi,
  /\b(?:Juventus|Inter Milan|AC Milan|Napoli|Roma|Lazio)\b/gi,
  /\b(?:Bayern Munich|Bayern Munchen|Borussia Dortmund|Borussia Monchengladbach)\b/gi,
  /\b(?:Paris Saint-Germain|PSG|AS Monaco|Olympique Lyonnais|OM|Marseille)\b/gi,
  /\b(?:Ajax|PSV Eindhoven|Feyenoord)\b/gi,
  /\bBenfica\b/gi,
  /\bPorto\b/gi,
  /\bBenfica\b/gi,
  // Other leagues / national teams
  /\b(?:Lionel Messi|Cristiano Ronaldo|Kylian Mbappe|Erling Haaland|Victor Osimhen|Mohamed Salah|Bukayo Saka|Jude Bellingham|Vinicius Junior|Neymar|Lamine Yamal|Harry Kane)\b/gi,
  // US sports
  /\b(?:New York Yankees|Los Angeles Dodgers|Boston Red Sox|Chicago Cubs|San Francisco Giants)\b/gi,
  /\b(?:Kansas City Chiefs|Buffalo Bills|Baltimore Ravens|Philadelphia Eagles|Dallas Cowboys|San Francisco 49ers|New England Patriots|Miami Dolphins)\b/gi,
  /\b(?:Los Angeles Lakers|Boston Celtics|Golden State Warriors|Miami Heat|Chicago Bulls|Denver Nuggets|Milwaukee Bucks|Phoenix Suns|Dallas Mavericks)\b/gi,
  /\b(?:LeBron James|Stephen Curry|Kevin Durant|Giannis Antetokounmpo|Nikola Jokic|Jayson Tatum|Luka Doncic|Jimmy Butler)\b/gi,
  /\b(?:Toronto Raptors|Denver Nuggets|Miami Heat|Oklahoma City Thunder)\b/gi,
  // Hockey
  /\b(?:Toronto Maple Leafs|Boston Bruins|Pittsburgh Penguins|Chicago Blackhawks|Detroit Red Wings|New York Rangers|Edmonton Oilers|Vegas Golden Knights)\b/gi,
  /\b(?:Connor McDavid|Sidney Crosby|Alex Ovechkin|Nathan MacKinnon)\b/gi,
  // Cricket national teams and players
  /\b(?:India|England|Australia|South Africa|New Zealand|West Indies|Pakistan|Sri Lanka|Bangladesh|New Zealand)\b(?=\s+(?:cricket|team|nations))/gi,
  /\b(?:Virat Kohli|Rohit Sharma|MS Dhoni|Joe Root|Kane Williamson|Babar Azam|Rashid Khan|Josh Buttler|Steve Smith|T20 World Cup)\b/gi,
  // F1 teams
  /\b(?:McLaren|Red Bull Racing|Mercedes|Ferrari|Aston Martin|Alpine|Williams|Racing Point|Sauber|Haas)\b(?=\s+(?:F1|Formula|Racing))/gi,
  // African football clubs
  /\b(?:Mamelodi Sundowns|Al Ahly|Kaizer Chiefs|Orlando Pirates|Canon Yaounde|Simba SC|Bongo Sport|TP Mazembe)\b/gi,
  // Ugandan clubs
  /\b(?:KCCA FC|Vipers SC|SC Villa|Express FC|MUFC|Kayunga FC|URA FC|Bunyaruguru United)\b/gi,
];

const PLAYER_PATTERNS: RegExp[] = [
  /\b(?:Lionel Messi|Cristiano Ronaldo|Kylian Mbappe|Erling Haaland|Victor Osimhen|Mohamed Salah|Bukayo Saka|Jude Bellingham|Vinicius(?: Junior)?|Neymar|Lamine Yamal|Harry Kane|Serge Gnabry|Sadio Mane)\b/g,
  /\b(?:LeBron James|Stephen Curry|Kevin Durant|Giannis Antetokounmpo|Nikola Jokic|Jayson Tatum|Luka Doncic|Jimmy Butler|Joel Embiid|Damian Lillard|Anthony Davis)\b/g,
  /\b(?:Virat Kohli|Rohit Sharma|MS Dhoni|Joe Root|Kane Williamson|Babar Azam|Rashid Khan|Josh Buttler|Steve Smith|Matthew Wade|Kane Williamson)\b/g,
  /\b(?:Max Verstappen|Lewis Hamilton|Charles Leclerc|Lando Norris|George Russell|Fernando Alonso|Sebastian Vettel|Kimi Antonelli)\b/g,
  /\b(?:Tadej Pogacar|Egan Bernal|Jonas Vingegaard|Jasper Philipsen|Remco Evenepoel)\b/g,
  /\b(?:Tyson Fury|Anthony Joshua|Oleksandr Usyk|Deontay Wilder|Wladimir Klitschko)\b/g,
  /\b(?:Conor McGregor|Jon Jones|Israel Adesanya|Khabib Nurmagomedov|Conor McGregor)\b/g,
];

function collect(text: string, patterns: RegExp[], limit: number): string[] {
  const found = new Map<string, string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[0].trim();
      if (value.length < 2) continue;
      if (!found.has(value.toLowerCase())) {
        found.set(value.toLowerCase(), value);
        if (found.size >= limit) return [...found.values()];
      }
    }
  }
  return [...found.values()];
}

export type Entities = {
  teams: string[];
  players: string[];
};

export function extractEntities(text: string, limit = 6): Entities {
  return {
    teams: collect(text, TEAM_PATTERNS, limit),
    players: collect(text, PLAYER_PATTERNS, limit),
  };
}

/**
 * Transfer intent uses three independent signals, so no single word can
 * satisfy the whole test on its own.
 *
 * Two earlier attempts produced bad classifications and shaped these lists:
 *
 *  1. Treating "contract" as both the trigger and its own supporting context
 *     flagged cricket stories whose only mention was the end of a contract.
 *  2. Treating every motion verb as a transfer flagged tournament stories such
 *     as "US complete thrilling comeback" and "Irish Open moved" and "Great
 *     Britain exit Billie Jean King Cup", where nobody changed club.
 *
 * So: STRONG words mean a player genuinely changed hands. WEAK words merely
 * indicate movement and need money or contract wording to corroborate them.
 */
const STRONG =
  /\b(?:transfers?|transferred|sign(?:s|ed|ing)?|joins?|joined|joining|loan(?:ed)?|recruit(?:s|ed|ing|ment)?|acquir(?:e|es|ed|ing)|buys?|bought|bids?|sells?|sold|switches?|switching)\b/i;

const WEAK =
  /\b(?:moved?|moving|exits?|exited|departs?|departed|arriv(?:es|ed)|completes?|completed|clinches?|clinch)\b/i;

const DEAL =
  /\b(?:agreed?|agrees|agreement|agreements|contracts?|deals?|fees?|wages?|terms|extensions?|extension|transfer window|per season|season-long|long-term)\b/i;

const MONEY = /(?:£|\$|€|\b\d+(?:\.\d+)?\s?(?:m|million|b|bn|billion)\b)/i;

/** Two capitalised words in a row usually means a person or club name. */
const PROPER_NOUN = /\b[A-Z][a-z]+(?:['’]s)?\s+[A-Z][a-z]+\b/;

export function isTransferStory(title: string, summary: string): boolean {
  // A movement word in the headline is the clearest signal there is.
  if (STRONG.test(title)) return true;
  // "Harry Kane's new contract at Bayern Munich" - deal wording plus a name.
  if (DEAL.test(title) && PROPER_NOUN.test(title)) return true;
  // In the body, either signal needs the other to corroborate it.
  if ((STRONG.test(summary) || WEAK.test(summary)) && DEAL.test(summary)) return true;
  // A weak headline word needs money or contract wording elsewhere.
  if (WEAK.test(title) && (MONEY.test(summary) || DEAL.test(summary))) return true;
  return false;
}
