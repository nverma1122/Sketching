// Reference photos from Wikimedia Commons (freely licensed).
// Only the idea's search words are sent to Wikimedia — never personal data.
// Results are cached in localStorage for a week so revisiting an idea is instant.

import { PHOTO_QUERIES, REFERENCE_PHOTO_FALLBACK } from '../data/photoQueries';
import type { SketchPrompt } from '../data/types';
import { readLocal, writeLocal } from './storage/local';

export interface CommonsPhoto {
  id: number;
  title: string;
  /** ~1280px wide rendition for display. */
  src: string;
  /** Larger rendition for the enlarged view. */
  large: string;
  page: string;
  artist: string;
  license: string;
  licenseUrl?: string;
  width: number;
  height: number;
}

const API = 'https://commons.wikimedia.org/w/api.php';
const CACHE_KEY = 'photoCache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX = 80;
const WANT = 12;
const SKIP_TITLE = /\b(map|logo|diagram|plan|poster|flag|coat of arms|stamp|document|screenshot|chart|drawing|painting|sketch)\b/i;

type Cache = Record<string, { at: number; photos: CommonsPhoto[] }>;

export const queriesFor = (p: SketchPrompt): string[] => PHOTO_QUERIES[p.id] ?? REFERENCE_PHOTO_FALLBACK[p.reference];

/** "tea stall" → "intitle:tea intitle:stall filetype:bitmap" */
export const toSearch = (q: string) =>
  `${q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `intitle:${w}`)
    .join(' ')} filetype:bitmap`;

const stripHtml = (html: string) => {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return html.replace(/<[^>]*>/g, '').trim();
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

async function search(q: string, width: number, signal?: AbortSignal): Promise<CommonsPhoto[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: toSearch(q),
    gsrlimit: '24',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(width),
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
  });
  const res = await fetch(`${API}?${params}`, { signal });
  if (!res.ok) throw new Error(`Wikimedia responded ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, ApiPage> } };
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const out: CommonsPhoto[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !ii.thumburl) continue;
    if (!/^image\/(jpeg|png|webp)$/.test(ii.mime)) continue;
    if (ii.width < 900 || ii.height < 600) continue;
    if (SKIP_TITLE.test(p.title)) continue;
    const meta = ii.extmetadata ?? {};
    out.push({
      id: p.pageid,
      title: p.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''),
      src: ii.thumburl,
      large: ii.width > 2048 && /\/\d+px-/.test(ii.thumburl) ? ii.thumburl.replace(/\/\d+px-/, '/2048px-') : ii.url,
      page: ii.descriptionurl,
      artist: meta.Artist ? stripHtml(meta.Artist.value).slice(0, 120) : 'Unknown author',
      license: meta.LicenseShortName?.value ?? 'See file page',
      licenseUrl: meta.LicenseUrl?.value,
      width: ii.width,
      height: ii.height,
    });
  }
  return out;
}

/** Find photos for an idea: tries each query in order until enough are found. */
export async function findPhotos(prompt: SketchPrompt, signal?: AbortSignal): Promise<CommonsPhoto[]> {
  const cache = readLocal<Cache>(CACHE_KEY, {});
  const hit = cache[prompt.id];
  if (hit && Date.now() - hit.at < CACHE_TTL && hit.photos.length) return hit.photos;

  const seen = new Set<number>();
  const photos: CommonsPhoto[] = [];
  for (const q of queriesFor(prompt)) {
    const found = await search(q, 1280, signal);
    for (const ph of found) {
      if (!seen.has(ph.id)) {
        seen.add(ph.id);
        photos.push(ph);
      }
    }
    if (photos.length >= WANT) break;
  }

  // Keep the cache bounded: drop the oldest entries.
  const next: Cache = { ...cache, [prompt.id]: { at: Date.now(), photos } };
  const keys = Object.keys(next).sort((a, b) => next[b].at - next[a].at);
  for (const k of keys.slice(CACHE_MAX)) delete next[k];
  writeLocal(CACHE_KEY, next);
  return photos;
}

/** Which photo the user last looked at for each idea. */
export const getPhotoIndex = (promptId: string) => readLocal<Record<string, number>>('photoIndex', {})[promptId] ?? 0;
export const setPhotoIndex = (promptId: string, i: number) => {
  const m = readLocal<Record<string, number>>('photoIndex', {});
  m[promptId] = i;
  writeLocal('photoIndex', m);
};
