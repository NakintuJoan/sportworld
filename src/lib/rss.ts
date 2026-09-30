export type RawItem = {
  title: string;
  link: string;
  description: string;
  content: string;
  image: string | null;
  author: string | null;
  pubDate: string;
  guid: string;
  categories: string[];
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#8216": "\u2018",
  "#8217": "\u2019",
  "#8211": "\u2013",
  "#8212": "\u2014",
  "#160": " ",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower in NAMED_ENTITIES) return NAMED_ENTITIES[lower];
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pulls text out of a value that may be wrapped in CDATA or contain markup. */
function textOf(raw: string): string {
  const cdata = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  const inner = cdata ? cdata[1] : raw;
  return decodeEntities(inner).replace(/\r/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tagContent(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function attrOf(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function splitBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) ?? [];
}

/** Finds the best available image for an item across the feed shapes we support. */
function extractImage(block: string): string | null {
  // Cricinfo style: <coverImages>url</coverImages>
  const cover = tagContent(block, "coverImages");
  if (cover) return absoluteUrl(textOf(cover));

  // media:content / media:thumbnail with an image mime type
  const mediaRe = /<(?:media:(?:content|thumbnail))\b[^>]*>/gi;
  for (const match of block.match(mediaRe) ?? []) {
    const type = attrOf(match, "media:content", "type") ?? "";
    const url = attrOf(match, "media:content", "url");
    if (url && (type.startsWith("image") || !type)) {
      if (!/avatar|sprite|logo|icon/i.test(url)) return absoluteUrl(url);
    }
  }

  // enclosure type="image/*"
  const encRe = /<enclosure\b[^>]*>/gi;
  for (const match of block.match(encRe) ?? []) {
    const type = attrOf(match, "enclosure", "type") ?? "";
    const url = attrOf(match, "enclosure", "url");
    if (url && type.startsWith("image")) return absoluteUrl(url);
  }

  // <image><url>...</url></image>
  const imgBlock = tagContent(block, "image");
  if (imgBlock) {
    const url = tagContent(imgBlock, "url");
    if (url) return absoluteUrl(textOf(url));
  }

  // First <img src> inside the content, ignoring small/decorative images.
  const srcs = [...block.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const good = srcs.find((s) => !/sprite|logo|icon|avatar|emoji|1x1|blank/i.test(s));
  if (good) return absoluteUrl(good);

  return null;
}

function absoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function extractLink(block: string): string {
  const plain = tagContent(block, "link");
  if (plain) {
    const value = textOf(plain);
    if (value.startsWith("http")) return value;
  }
  const linkRe = /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  for (const match of block.match(linkRe) ?? []) {
    if (match.startsWith("http")) return match;
  }
  const guid = tagContent(block, "guid");
  if (guid) {
    const value = textOf(guid);
    if (value.startsWith("http")) return value;
  }
  return "";
}

function parseDate(raw: string | null, fallback?: string): string {
  if (!raw) return fallback ?? new Date().toISOString();
  const trimmed = raw.trim();
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  // Some feeds (Sky) use "BST"/"GMT" suffixes that Date cannot parse.
  const withOffset = new Date(`${trimmed.replace(/\s+(BST|GMT|UTC|CET)$/i, "")} +0000`);
  if (!Number.isNaN(withOffset.getTime())) return withOffset.toISOString();
  return fallback ?? new Date().toISOString();
}

/** Parses RSS 2.0 and Atom into a normalised item list. */
export function parseFeed(xml: string, now = new Date()): RawItem[] {
  const fallbackDate = now.toISOString();
  const rssItems = splitBlocks(xml, "item");
  const blocks = rssItems.length > 0 ? rssItems : splitBlocks(xml, "entry");

  const items: RawItem[] = [];

  for (const block of blocks) {
    const title = textOf(tagContent(block, "title") ?? "");
    const link = extractLink(block);
    if (!title || !link) continue;

    const description = textOf(tagContent(block, "description") ?? tagContent(block, "summary") ?? "");
    const content = textOf(tagContent(block, "content:encoded") ?? tagContent(block, "content") ?? "");
    const author = textOf(tagContent(block, "author") ?? tagContent(block, "dc:creator") ?? "") || null;
    const guid = textOf(tagContent(block, "guid") ?? tagContent(block, "id") ?? "") || link;
    const published = parseDate(
      tagContent(block, "pubDate") ?? tagContent(block, "published") ?? tagContent(block, "updated") ?? tagContent(block, "dc:date"),
      fallbackDate
    );
    const categories = splitBlocks(block, "category")
      .map((c) => textOf(c))
      .filter(Boolean)
      .slice(0, 12);

    items.push({
      title,
      link,
      description,
      content,
      image: extractImage(block),
      author,
      pubDate: published,
      guid,
      categories,
    });
  }

  return items;
}
