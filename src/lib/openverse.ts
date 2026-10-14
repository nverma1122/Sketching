// Freely licensed photos from Openverse (openverse.org: Flickr and other
// Creative Commons collections), fetched by the browser without a key.
// Anonymous use allows about 20 searches a minute and 200 a day, so results
// are cached for a week and each "Another one" makes at most one search.

import type { Item, Level } from '../data/pictures';
import { cached, remember } from './photoCache';

const API = 'https://api.openverse.org/v1/images/';
/** Openverse rejects anonymous requests asking for more than 20 results. */
export const PAGE_SIZE = 20;

export const searchUrl = (query: string) => `${API}?${new URLSearchParams({ q: query, page_size: String(PAGE_SIZE), mature: 'false' })}`;
const SKIP_TITLE = /\b(map|logo|diagram|poster|flag|screenshot|chart|text|meme|selfie|portrait)\b/i;

interface Result {
  id: string;
  title?: string | null;
  url: string;
  foreign_landing_url?: string;
  creator?: string | null;
  license: string;
  license_version?: string | null;
  license_url?: string | null;
  provider?: string;
  source?: string;
  width?: number | null;
  height?: number | null;
  mature?: boolean;
  unstable__sensitivity?: string[];
}

const licenseName = (r: Result) => {
  const l = r.license.toLowerCase();
  const name = l === 'cc0' ? 'CC0' : l === 'pdm' ? 'Public domain' : `CC ${l.toUpperCase()}`;
  return r.license_version && l !== 'pdm' && l !== 'cc0' ? `${name} ${r.license_version}` : name;
};

const providerName = (p?: string) => (p ? p.replace(/(^|[_\s])(\w)/g, (_, s: string, c: string) => (s ? ' ' : '') + c.toUpperCase()) : 'Openverse');

/** Parse an Openverse response into photo items (exported for tests). */
export function parseOpenverse(data: unknown, level: Level): Item[] {
  const results = ((data as { results?: Result[] })?.results ?? []) as Result[];
  const out: Item[] = [];
  for (const r of results) {
    if (!r?.url || r.mature || r.unstable__sensitivity?.length) continue;
    const w = r.width ?? 0;
    const h = r.height ?? 0;
    if (Math.max(w, h) < 800 || Math.min(w, h) < 450) continue;
    const title = (r.title ?? '').trim();
    if (!title || SKIP_TITLE.test(title)) continue;
    out.push({
      id: `o${r.id}`,
      kind: 'photo',
      level,
      title: title[0].toUpperCase() + title.slice(1),
      src: r.url,
      large: r.url,
      w,
      h,
      credit: {
        artist: (r.creator ?? '').trim().slice(0, 100) || 'Unknown author',
        license: licenseName(r),
        licenseUrl: r.license_url ?? undefined,
        page: r.foreign_landing_url || `https://openverse.org/image/${r.id}`,
        source: `${providerName(r.provider ?? r.source)} via Openverse`,
      },
    });
  }
  return out;
}

/** Photos for one search phrase at one length (cached for a week). */
export async function searchOpenverse(query: string, level: Level, signal?: AbortSignal): Promise<Item[]> {
  const key = `openverse:${level}:${query}`;
  const hit = cached(key);
  if (hit) return hit;
  const res = await fetch(searchUrl(query), { signal });
  if (!res.ok) throw new Error(`Openverse responded ${res.status}`);
  const items = parseOpenverse(await res.json(), level);
  remember(key, items);
  return items;
}
