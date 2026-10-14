// Reference photos from Wikimedia Commons (freely licensed), fetched by the
// browser. Only search words are sent — never personal data. Results are
// cached in localStorage for a week so repeat visits are instant.

import type { Item, Level } from "../data/pictures";

const API = "https://commons.wikimedia.org/w/api.php";
const CACHE_KEY = "qcs.photos.v1";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX = 120;
const SKIP_TITLE =
  /\b(map|maps|logo|diagram|plan|poster|flag|coat of arms|stamp|document|screenshot|chart|metro|platform|interior|sign board|text)\b/i;

type Cache = Record<string, { at: number; items: Item[] }>;

const readCache = (): Cache => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Cache;
  } catch {
    return {};
  }
};
const writeCache = (c: Cache) => {
  try {
    const keys = Object.keys(c).sort((a, b) => c[b].at - c[a].at);
    for (const k of keys.slice(CACHE_MAX)) delete c[k];
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* storage full or blocked: skip caching */
  }
};

/** "tea stall" → "intitle:tea intitle:stall filetype:bitmap" */
export const toSearch = (q: string) =>
  `${q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `intitle:${w}`)
    .join(" ")} filetype:bitmap`;

/** Turn a Commons file name into a readable title. */
export function cleanTitle(fileTitle: string): string {
  const t = fileTitle
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/ - geograph\.org\.uk - \d+$/i, "")
    .replace(/\s*\(\d{6,}\)\s*$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+\d+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "Untitled photo";
}

const stripHtml = (html: string) => {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return html.replace(/<[^>]*>/g, "").trim();
  }
};

interface ApiPage {
  pageid: number;
  title: string;
  index?: number;
  imageinfo?: {
    thumburl?: string;
    url: string;
    descriptionurl: string;
    width: number;
    height: number;
    mime: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
}

/** Parse an API response into photo items (exported for tests). */
export function parsePhotos(data: unknown, level: Level): Item[] {
  const pages = Object.values(
    (data as { query?: { pages?: Record<string, ApiPage> } })?.query?.pages ??
      {},
  ).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const out: Item[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !ii.thumburl) continue;
    if (!/^image\/(jpeg|png|webp)$/.test(ii.mime)) continue;
    if (
      Math.max(ii.width, ii.height) < 900 ||
      Math.min(ii.width, ii.height) < 500
    )
      continue;
    if (SKIP_TITLE.test(p.title)) continue;
    const meta = ii.extmetadata ?? {};
    out.push({
      id: `c${p.pageid}`,
      kind: "photo",
      level,
      title: cleanTitle(p.title),
      src: ii.thumburl,
      large:
        ii.width > 2048 && /\/\d+px-/.test(ii.thumburl)
          ? ii.thumburl.replace(/\/\d+px-/, "/2048px-")
          : ii.url,
      w: ii.width,
      h: ii.height,
      credit: {
        artist: meta.Artist
          ? stripHtml(meta.Artist.value).slice(0, 100) || "Unknown author"
          : "Unknown author",
        license: meta.LicenseShortName?.value ?? "See file page",
        licenseUrl: meta.LicenseUrl?.value,
        page: ii.descriptionurl,
      },
    });
  }
  return out;
}

/** Photos for one search phrase at one length (cached for a week). */
export async function searchPhotos(
  query: string,
  level: Level,
  signal?: AbortSignal,
): Promise<Item[]> {
  const key = `${level}:${query}`;
  const cache = readCache();
  const hit = cache[key];
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.items;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: toSearch(query),
    gsrlimit: "30",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1280",
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
  });
  const res = await fetch(`${API}?${params}`, { signal });
  if (!res.ok) throw new Error(`Wikimedia responded ${res.status}`);
  const items = parsePhotos(await res.json(), level);
  writeCache({ ...readCache(), [key]: { at: Date.now(), items } });
  return items;
}
